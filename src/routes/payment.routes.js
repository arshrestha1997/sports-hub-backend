import { Router } from "express";
import { z } from "zod";
import { authRequired, roleRequired } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Club from "../models/Club.js";
import Payment from "../models/Payment.js";

const router = Router();

const paySchema = z.object({
  bookingId: z.string(),
  method: z.string().optional(),
});

// Player pays for a booking (mock)
router.post("/pay", authRequired, roleRequired("player"), async (req, res) => {
  try {
    const { bookingId, method } = paySchema.parse(req.body);

    const booking = await Booking.findOne({ _id: bookingId, playerId: req.user.userId });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status === "cancelled") return res.status(400).json({ message: "Booking cancelled" });
    if (booking.status === "paid") return res.status(400).json({ message: "Already paid" });

    const club = await Club.findById(booking.clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });
    if (!club.approved) return res.status(400).json({ message: "Club not approved" });

    const amount = Number(booking.pricing.total);
    const commissionRate = Number(club.commissionRate ?? 0.15);
    const adminFee = Math.round(amount * commissionRate * 100) / 100;
    const clubEarning = Math.round((amount - adminFee) * 100) / 100;

    booking.status = "paid";
    await booking.save();

    const payment = await Payment.create({
      bookingId: booking._id,
      playerId: booking.playerId,
      clubId: booking.clubId,
      amount,
      method: method || "card",
      status: "paid",
      commissionRate,
      adminFee,
      clubEarning,
    });

    res.json({ message: "Paid", booking, payment });
  } catch (err) {
    res.status(400).json({ message: err.message || "Payment failed" });
  }
});

// Player payment history
router.get("/me", authRequired, roleRequired("player"), async (req, res) => {
  const payments = await Payment.find({ playerId: req.user.userId }).sort({ createdAt: -1 });
  res.json({ payments });
});

export default router;
