import { Router } from "express";
import Coach from "../models/Coach.js";
import CoachBooking from "../models/CoachBooking.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = Router();

/**
 * ============================
 * GET my coaches
 * ============================
 */
router.get("/me", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const coaches = await Coach.find({ clubId: req.user.clubId }).sort({ createdAt: -1 });
    res.json({ coaches });
  } catch (err) {
    res.status(500).json({ message: "Failed to load coaches" });
  }
});

/**
 * ============================
 * ADD coach
 * ============================
 */
router.post("/", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const {
      name,
      sport,
      personalEnabled,
      personalRatePerHour,
      classEnabled,
      classPrice,
    } = req.body;

    const coach = await Coach.create({
      clubId: req.user.clubId,
      name,
      sport,
      personalEnabled,
      personalRatePerHour,
      classEnabled,
      classPrice,
      personalAvailability: [],
      classSessions: [],
    });

    res.json({ coach });
  } catch (err) {
    res.status(400).json({ message: "Failed to add coach" });
  }
});

/**
 * ============================
 * UPDATE coach
 * ============================
 */
router.put("/:coachId", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const { coachId } = req.params;

    const coach = await Coach.findOne({
      _id: coachId,
      clubId: req.user.clubId,
    });

    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }

    const allowed = [
      "name",
      "sport",
      "personalEnabled",
      "personalRatePerHour",
      "classEnabled",
      "classPrice",
    ];

    for (const key of allowed) {
      if (key in req.body) coach[key] = req.body[key];
    }

    await coach.save();
    res.json({ coach });
  } catch (err) {
    res.status(400).json({ message: "Failed to update coach" });
  }
});

/**
 * ============================
 * DELETE coach
 * ============================
 */
router.delete("/:coachId", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const { coachId } = req.params;

    const coach = await Coach.findOne({
      _id: coachId,
      clubId: req.user.clubId,
    });

    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }

    // 🔒 safety: block delete if bookings exist
    const bookingCount = await CoachBooking.countDocuments({ coachId });
    if (bookingCount > 0) {
      return res.status(400).json({
        message: "Cannot delete coach with existing bookings",
      });
    }

    await coach.deleteOne();
    res.json({ message: "Coach deleted" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete coach" });
  }
});

/**
 * ============================
 * PERSONAL AVAILABILITY (already used)
 * ============================
 */
router.put("/:coachId/personal-availability", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const { coachId } = req.params;
    const { personalAvailability } = req.body;

    const coach = await Coach.findOne({
      _id: coachId,
      clubId: req.user.clubId,
    });

    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }

    coach.personalAvailability = personalAvailability;
    await coach.save();

    res.json({ coach });
  } catch (err) {
    res.status(400).json({ message: "Failed to save availability" });
  }
});

/**
 * ============================
 * CLASS SESSIONS
 * ============================
 */
router.post("/:coachId/class-sessions", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const { coachId } = req.params;
    const { startTime, endTime, maxPeople } = req.body;

    const coach = await Coach.findOne({
      _id: coachId,
      clubId: req.user.clubId,
    });

    if (!coach) {
      return res.status(404).json({ message: "Coach not found" });
    }

    coach.classSessions.push({
      startTime,
      endTime,
      maxPeople,
      bookedPeople: 0,
    });

    await coach.save();
    res.json({ coach });
  } catch (err) {
    res.status(400).json({ message: "Failed to add class session" });
  }
});

export default router;
