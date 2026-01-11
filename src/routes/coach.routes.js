import { Router } from "express";
import { z } from "zod";
import { authRequired, roleRequired } from "../middleware/auth.js";
import Coach from "../models/Coach.js";
import CoachBooking from "../models/CoachBooking.js";

const router = Router();

/* ---------------- Helpers ---------------- */
function isWithinWeeklyWindows(start, end, windows) {
  // Simplified: must be on the same day
  if (start.toDateString() !== end.toDateString()) return false;

  const day = start.getDay(); // 0..6
  const startMin = start.getHours() * 60 + start.getMinutes();
  const endMin = end.getHours() * 60 + end.getMinutes();

  return (windows || []).some(
    (w) => w.day === day && startMin >= w.startMin && endMin <= w.endMin
  );
}

/* ---------------- PUBLIC: list coaches for club ---------------- */
router.get("/club/:clubId", async (req, res) => {
  const coaches = await Coach.find({ clubId: req.params.clubId, active: true })
    .sort({ createdAt: -1 });
  res.json({ coaches });
});

/* ---------------- CLUB: add coach ---------------- */
const addCoachSchema = z.object({
  name: z.string(),
  sport: z.string(),
  personalEnabled: z.boolean().optional(),
  personalRatePerHour: z.number().min(0).optional(),
  classEnabled: z.boolean().optional(),
  classPrice: z.number().min(0).optional(),
});

router.post("/", authRequired, roleRequired("club"), async (req, res) => {
  const data = addCoachSchema.parse(req.body);
  const coach = await Coach.create({ clubId: req.user.clubId, ...data });
  res.json({ coach });
});

/* ---------------- CLUB: my coaches ---------------- */
router.get("/me", authRequired, roleRequired("club"), async (req, res) => {
  const coaches = await Coach.find({ clubId: req.user.clubId }).sort({ createdAt: -1 });
  res.json({ coaches });
});

/* ---------------- CLUB: set personal weekly availability ---------------- */
const setAvailabilitySchema = z.object({
  personalAvailability: z.array(
    z.object({
      day: z.number().int().min(0).max(6),
      startMin: z.number().int().min(0).max(1439),
      endMin: z.number().int().min(1).max(1440),
    })
  ),
});

router.put("/:coachId/personal-availability", authRequired, roleRequired("club"), async (req, res) => {
  const { coachId } = req.params;
  const data = setAvailabilitySchema.parse(req.body);

  const coach = await Coach.findOne({ _id: coachId, clubId: req.user.clubId });
  if (!coach) return res.status(404).json({ message: "Coach not found" });

  for (const w of data.personalAvailability) {
    if (w.startMin >= w.endMin) return res.status(400).json({ message: "startMin must be < endMin" });
  }

  coach.personalAvailability = data.personalAvailability;
  await coach.save();
  res.json({ coach });
});

/* ---------------- CLUB: add class session ---------------- */
const addSessionSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  maxPeople: z.number().int().min(1),
});

router.post("/:coachId/class-sessions", authRequired, roleRequired("club"), async (req, res) => {
  const { coachId } = req.params;
  const data = addSessionSchema.parse(req.body);

  const coach = await Coach.findOne({ _id: coachId, clubId: req.user.clubId });
  if (!coach) return res.status(404).json({ message: "Coach not found" });

  const start = new Date(data.startTime);
  const end = new Date(data.endTime);
  if (isNaN(start) || isNaN(end) || start >= end) return res.status(400).json({ message: "Invalid session time" });

  coach.classSessions.push({
    startTime: start,
    endTime: end,
    maxPeople: data.maxPeople,
    bookedPeople: 0,
    active: true,
  });

  await coach.save();
  res.json({ coach });
});

/* ---------------- PUBLIC: availability + class sessions ---------------- */
router.get("/:coachId/availability", async (req, res) => {
  const coach = await Coach.findById(req.params.coachId);
  if (!coach || !coach.active) return res.status(404).json({ message: "Coach not found" });

  const sessions = (coach.classSessions || []).filter((s) => s.active);
  res.json({ personalAvailability: coach.personalAvailability || [], classSessions: sessions });
});

/* ---------------- PLAYER: book personal or class ---------------- */
const bookSchema = z.object({
  coachId: z.string(),
  type: z.enum(["personal", "class"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  sessionId: z.string().optional(),
  participants: z.number().int().min(1).optional(),
});

router.post("/book", authRequired, roleRequired("player"), async (req, res) => {
  const data = bookSchema.parse(req.body);

  const coach = await Coach.findById(data.coachId);
  if (!coach || !coach.active) return res.status(404).json({ message: "Coach not found" });

  // PERSONAL
  if (data.type === "personal") {
    if (!coach.personalEnabled) return res.status(400).json({ message: "Personal coaching not available" });
    if (!data.startTime || !data.endTime) return res.status(400).json({ message: "startTime/endTime required" });

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (isNaN(start) || isNaN(end) || start >= end) return res.status(400).json({ message: "Invalid time" });

    const hours = (end - start) / (1000 * 60 * 60);
    if (hours <= 0 || hours > 8) return res.status(400).json({ message: "Invalid duration" });

    // ✅ availability check
    if (!isWithinWeeklyWindows(start, end, coach.personalAvailability)) {
      return res.status(400).json({ message: "Coach not available for that time" });
    }

    const total = Math.round(Number(coach.personalRatePerHour) * hours * 100) / 100;

    const booking = await CoachBooking.create({
      playerId: req.user.userId,
      clubId: coach.clubId,
      coachId: coach._id,
      type: "personal",
      startTime: start,
      endTime: end,
      pricing: { total },
      status: "pending",
    });

    return res.json({ booking });
  }

  // CLASS
  if (!coach.classEnabled) return res.status(400).json({ message: "Class not available" });
  if (!data.sessionId) return res.status(400).json({ message: "sessionId required" });

  const session = coach.classSessions.id(data.sessionId);
  if (!session || !session.active) return res.status(404).json({ message: "Session not found" });

  const participants = data.participants || 1;

  if (session.bookedPeople + participants > session.maxPeople) {
    return res.status(400).json({ message: "Not enough spots left in this class" });
  }

  session.bookedPeople += participants;
  await coach.save();

  const total = Math.round(Number(coach.classPrice) * participants * 100) / 100;

  const booking = await CoachBooking.create({
    playerId: req.user.userId,
    clubId: coach.clubId,
    coachId: coach._id,
    type: "class",
    classDateTime: session.startTime,
    participants,
    pricing: { total },
    status: "pending",
  });

  res.json({ booking });
});

/* ---------------- PLAYER: my coach bookings ---------------- */
router.get("/bookings/me", authRequired, roleRequired("player"), async (req, res) => {
  const bookings = await CoachBooking.find({ playerId: req.user.userId }).sort({ createdAt: -1 });
  res.json({ bookings });
});

export default router;
