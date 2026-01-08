import { Router } from "express";
import { z } from "zod";
import { authRequired, roleRequired } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Club from "../models/Club.js";
import User from "../models/User.js";

const router = Router();

const createSchema = z.object({
  clubId: z.string(),
  sport: z.string(),
  facilityId: z.string(),
  startTime: z.string(), // ISO string
  endTime: z.string(),   // ISO string
});

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd; // true if time ranges intersect
}

router.post("/", authRequired, roleRequired("player"), async (req, res) => {
  try {
    const data = createSchema.parse(req.body);

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);

    if (isNaN(start) || isNaN(end) || start >= end) {
      return res.status(400).json({ message: "Invalid startTime/endTime" });
    }

    const club = await Club.findOne({ _id: data.clubId, approved: true });
    if (!club) return res.status(404).json({ message: "Club not found" });

    const facility = club.facilities.id(data.facilityId);
    if (!facility) return res.status(400).json({ message: "Invalid facilityId" });

    // conflict check (same club + same facility)
    const existing = await Booking.find({
      clubId: data.clubId,
      facilityId: data.facilityId,
      status: { $ne: "cancelled" },
    });

    for (const b of existing) {
      if (overlaps(start, end, b.startTime, b.endTime)) {
        return res.status(409).json({ message: "Time slot already booked" });
      }
    }

    // pricing
    const hours = (end - start) / (1000 * 60 * 60);
    if (hours <= 0 || hours > 8) return res.status(400).json({ message: "Invalid duration" });

    const base = Number(facility.hourlyPrice) * hours;

    const user = await User.findById(req.user.userId);
    const isMember = user?.membership === "member";

    // membership discount (20% only on court booking)
    const discount = isMember ? base * 0.2 : 0;
    const total = Math.round((base - discount) * 100) / 100;

    const booking = await Booking.create({
      playerId: req.user.userId,
      clubId: data.clubId,
      sport: data.sport,
      facilityId: data.facilityId,
      startTime: start,
      endTime: end,
      pricing: {
        base,
        discount,
        total,
        membershipApplied: isMember,
      },
      status: "pending",
    });

    res.json({ booking });
  } catch (err) {
    res.status(400).json({ message: err.message || "Invalid request" });
  }
});

// My bookings (player)
router.get("/me", authRequired, roleRequired("player"), async (req, res) => {
  const bookings = await Booking.find({ playerId: req.user.userId }).sort({ createdAt: -1 });
  res.json({ bookings });
});

// Cancel booking
router.post("/:id/cancel", authRequired, roleRequired("player"), async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, playerId: req.user.userId });
  if (!booking) return res.status(404).json({ message: "Booking not found" });

  booking.status = "cancelled";
  await booking.save();

  res.json({ booking });
});

export default router;
