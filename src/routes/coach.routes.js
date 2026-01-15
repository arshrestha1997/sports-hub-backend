import { Router } from "express";
import { z } from "zod";
import Coach from "../models/Coach.js";
import CoachBooking from "../models/CoachBooking.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = Router();

/* ================= GET MY COACHES (CLUB) ================= */
router.get(
  "/me",
  authRequired,
  roleRequired("club"),
  async (req, res) => {
    try {
      const coaches = await Coach.find({
        clubId: req.user.clubId,
      }).sort({ createdAt: -1 });

      res.json({ coaches });
    } catch (err) {
      res.status(500).json({ message: "Failed to load coaches" });
    }
  }
);

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
   body:
     - personal: { coachId, type:"personal", startTime, endTime }
     - class:    { coachId, type:"class", sessionId, participants }
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

    // ✅ IMPORTANT: your JWT payload has userId (NOT id)
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

      // (simple pricing – you can improve later based on duration)
      const total = Number(coach.personalRatePerHour || 0);

      const booking = await CoachBooking.create({
        playerId, // ✅ FIXED
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

    // update booked people
    session.bookedPeople = booked + p;
    await coach.save();

    const total = Number(coach.classPrice || 0) * p;

    const booking = await CoachBooking.create({
      playerId, // ✅ FIXED
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
    // ✅ IMPORTANT: your JWT payload has userId (NOT id)
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

/* ================= UPDATE COACH ================= */
router.put("/:id", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const coach = await Coach.findById(req.params.id);
    if (!coach) return res.status(404).json({ message: "Coach not found" });

    if (coach.clubId.toString() !== req.user.clubId) {
      return res.status(403).json({ message: "Not allowed" });
    }

    Object.assign(coach, req.body);
    await coach.save();

    res.json({ coach });
  } catch (err) {
    res.status(500).json({ message: "Failed to update coach" });
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

    // optional: clean bookings
    await CoachBooking.deleteMany({ coachId: coach._id });

    res.json({ message: "Coach deleted" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete coach" });
  }
});


export default router;