import { Router } from "express";
import { z } from "zod";
import Coach from "../models/Coach.js";
import CoachBooking from "../models/CoachBooking.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = Router();

/* ================= GET MY COACHES (CLUB) ================= */
router.get("/me", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const coaches = await Coach.find({ clubId: req.user.clubId }).sort({ createdAt: -1 });
    res.json({ coaches });
  } catch (err) {
    res.status(500).json({ message: "Failed to load coaches" });
  }
});

/* ================= CREATE COACH (CLUB) ================= */
const createCoachSchema = z.object({
  name: z.string().min(1),
  sport: z.string().min(1),
  personalEnabled: z.coerce.boolean().optional().default(false),
  personalRatePerHour: z.coerce.number().nonnegative().optional().default(0),
  classEnabled: z.coerce.boolean().optional().default(false),
  classPrice: z.coerce.number().nonnegative().optional().default(0),
});

router.post("/", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const parsed = createCoachSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid data",
        issues: parsed.error.issues?.map((i) => ({ path: i.path, message: i.message })),
      });
    }

    const coach = await Coach.create({
      ...parsed.data,
      clubId: req.user.clubId, // ✅ correct for your JWT payload
    });

    res.status(201).json({ coach });
  } catch (err) {
    console.error("ADD COACH ERROR:", err);
    res.status(500).json({ message: err.message || "Failed to add coach" });
  }
});

/* ================= UPDATE COACH ================= */
router.put("/:id", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);
    if (!coach) return res.status(404).json({ message: "Coach not found" });

    if (coach.clubId.toString() !== req.user.clubId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    // allow updating these fields only (safe)
    const allowed = ["name", "sport", "personalEnabled", "personalRatePerHour", "classEnabled", "classPrice", "active"];
    for (const k of allowed) {
      if (k in req.body) coach[k] = req.body[k];
    }

    await coach.save();
    res.json({ coach });
  } catch (err) {
    console.error("UPDATE COACH ERROR:", err);
    res.status(500).json({ message: "Failed to update coach" });
  }
});

/* ================= SAVE PERSONAL AVAILABILITY (CLUB) =================
   FRONTEND CALLS:
   PUT /api/coaches/:id/personal-availability
   body: { personalAvailability: [{day, startMin, endMin}] }
====================================================== */
const windowSchema = z.object({
  day: z.coerce.number().int().min(0).max(6),
  startMin: z.coerce.number().int().min(0).max(1439),
  endMin: z.coerce.number().int().min(1).max(1440),
});

router.put("/:id/personal-availability", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);
    if (!coach) return res.status(404).json({ message: "Coach not found" });

    if (coach.clubId.toString() !== req.user.clubId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const parsed = z
      .object({ personalAvailability: z.array(windowSchema) })
      .safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid availability payload",
        issues: parsed.error.issues?.map((i) => ({ path: i.path, message: i.message })),
      });
    }

    // validate logical time ordering
    for (const w of parsed.data.personalAvailability) {
      if (w.startMin >= w.endMin) {
        return res.status(400).json({ message: "Availability window startMin must be < endMin" });
      }
    }

    coach.personalAvailability = parsed.data.personalAvailability;
    await coach.save();

    res.json({ coach });
  } catch (err) {
    console.error("SAVE PERSONAL AVAILABILITY ERROR:", err);
    res.status(500).json({ message: "Failed to save availability" });
  }
});

/* ================= ADD CLASS SESSION (CLUB) =================
   FRONTEND CALLS:
   POST /api/coaches/:id/class-sessions
   body: { startTime, endTime, maxPeople }
====================================================== */
const classAddSchema = z.object({
  startTime: z.string(),
  endTime: z.string(),
  maxPeople: z.coerce.number().int().min(1),
});

router.post("/:id/class-sessions", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);
    if (!coach) return res.status(404).json({ message: "Coach not found" });

    if (coach.clubId.toString() !== req.user.clubId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    const parsed = classAddSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid class session payload",
        issues: parsed.error.issues?.map((i) => ({ path: i.path, message: i.message })),
      });
    }

    const s = new Date(parsed.data.startTime);
    const e = new Date(parsed.data.endTime);
    if (isNaN(s) || isNaN(e) || s >= e) {
      return res.status(400).json({ message: "Invalid session time range" });
    }

    coach.classSessions.push({
      startTime: s,
      endTime: e,
      maxPeople: parsed.data.maxPeople,
    });

    await coach.save();
    res.json({ coach });
  } catch (err) {
    console.error("ADD CLASS SESSION ERROR:", err);
    res.status(500).json({ message: "Failed to add class session" });
  }
});

/* ================= DELETE COACH ================= */
router.delete("/:id", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);
    if (!coach) return res.status(404).json({ message: "Coach not found" });

    if (coach.clubId.toString() !== req.user.clubId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await coach.deleteOne();
    await CoachBooking.deleteMany({ coachId: coach._id });

    res.json({ message: "Coach deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete coach" });
  }
});

/* ===============================
   GET coaches by club (public)
   GET /api/coaches/club/:clubId
================================ */
router.get("/club/:clubId", async (req, res) => {
  const coaches = await Coach.find({ clubId: req.params.clubId });
  res.json({ coaches });
});

/* ===============================
   GET coach availability (public)
   GET /api/coaches/:id/availability
================================ */
router.get("/:id/availability", async (req, res) => {
  const coach = await Coach.findById(req.params.id);
  if (!coach) return res.status(404).json({ message: "Coach not found" });

  res.json({
    personalAvailability: coach.personalAvailability || [],
    classSessions: coach.classSessions || [],
  });
});

/* ===============================
   PLAYER: Book Coach
   POST /api/coaches/book
================================ */
const bookSchema = z.object({
  coachId: z.string(),
  type: z.enum(["personal", "class"]),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  sessionId: z.string().optional(),
  participants: z.coerce.number().int().min(1).optional(),
});

router.post("/book", authRequired, roleRequired("player"), async (req, res) => {
  try {
    const parsed = bookSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Invalid request",
        issues: parsed.error.issues?.map((i) => ({ path: i.path, message: i.message })),
      });
    }

    const { coachId, type, startTime, endTime, sessionId, participants } = parsed.data;

    const coach = await Coach.findById(coachId);
    if (!coach) return res.status(404).json({ message: "Coach not found" });

    const playerId = req.user.userId;

    // -------- PERSONAL BOOKING --------
    if (type === "personal") {
      if (!startTime || !endTime) {
        return res.status(400).json({ message: "startTime and endTime are required for personal booking" });
      }

      const s = new Date(startTime);
      const e = new Date(endTime);
      if (isNaN(s) || isNaN(e) || s >= e) {
        return res.status(400).json({ message: "Invalid personal booking time range" });
      }

      const total = Number(coach.personalRatePerHour || 0);

      const booking = await CoachBooking.create({
        playerId,
        clubId: coach.clubId,
        coachId: coach._id,
        type: "personal",
        startTime: s,
        endTime: e,
        pricing: { total },
        status: "pending",
        paymentStatus: "pending",
      });

      return res.json({ booking });
    }

    // -------- CLASS BOOKING --------
    if (!sessionId) {
      return res.status(400).json({ message: "sessionId is required for class booking" });
    }

    const session = coach.classSessions?.id(sessionId);
    if (!session) return res.status(404).json({ message: "Session not found" });

    const p = participants || 1;
    const max = Number(session.maxPeople || 0);
    const booked = Number(session.bookedPeople || 0);

    if (max && booked + p > max) {
      return res.status(400).json({ message: "Not enough spots left in this class session" });
    }

    session.bookedPeople = booked + p;
    await coach.save();

    const total = Number(coach.classPrice || 0) * p;

    const booking = await CoachBooking.create({
      playerId,
      clubId: coach.clubId,
      coachId: coach._id,
      type: "class",
      classDateTime: session.startTime,
      participants: p,
      pricing: { total },
      status: "pending",
      paymentStatus: "pending",
    });

    return res.json({ booking });
  } catch (err) {
    console.error("Coach booking error:", err);
    return res.status(500).json({ message: "Server error while booking coach" });
  }
});

/* ===============================
   PLAYER: My coach bookings
   GET /api/coaches/bookings/me
================================ */
router.get("/bookings/me", authRequired, roleRequired("player"), async (req, res) => {
  try {
    const playerId = req.user.userId;

    const bookings = await CoachBooking.find({ playerId })
      .populate("coachId", "name sport")
      .sort({ createdAt: -1 });

    res.json({ bookings });
  } catch (err) {
    console.error("Load coach bookings error:", err);
    res.status(500).json({ message: "Failed to load coach bookings" });
  }
});

export default router;
