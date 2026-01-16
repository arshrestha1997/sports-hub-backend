import { Router } from "express";
import { z } from "zod";
import { authRequired, roleRequired } from "../middleware/auth.js";

import Booking from "../models/Booking.js";
import AccessoryOrder from "../models/AccessoryOrder.js";
import CoachBooking from "../models/CoachBooking.js";

import Club from "../models/Club.js";
import Payment from "../models/Payment.js";

const router = Router();

/**
 * Accepts BOTH:
 * - old: { bookingId, method }
 * - new: { itemType, itemId, method }
 */
const paySchema = z.object({
  bookingId: z.string().optional(), // legacy
  itemType: z.enum(["facility", "accessory", "coach"]).optional(),
  itemId: z.string().optional(),
  method: z.string().optional(),
});

// Player pays for a booking/order (mock)
router.post("/pay", authRequired, roleRequired("player"), async (req, res) => {
  try {
    const data = paySchema.parse(req.body);

    // ✅ normalize inputs
    const payableType = data.itemType || "facility";
    const payableId = data.itemId || data.bookingId;

    if (!payableId) {
      return res.status(400).json({ message: "Missing booking/order id" });
    }

    const playerId = req.user.userId;

    // ✅ pick model based on payableType
    let item = null;

    if (payableType === "facility") {
      item = await Booking.findOne({ _id: payableId, playerId });
      if (!item) return res.status(404).json({ message: "Facility booking not found" });
      if (item.status === "cancelled") return res.status(400).json({ message: "Booking cancelled" });
      if (item.status === "paid") return res.status(400).json({ message: "Already paid" });
    }

    if (payableType === "accessory") {
      item = await AccessoryOrder.findOne({ _id: payableId, playerId });
      if (!item) return res.status(404).json({ message: "Accessory order not found" });
      if (item.status === "cancelled") return res.status(400).json({ message: "Order cancelled" });
      if (item.status === "paid") return res.status(400).json({ message: "Already paid" });
    }

    if (payableType === "coach") {
      item = await CoachBooking.findOne({ _id: payableId, playerId });
      if (!item) return res.status(404).json({ message: "Coach booking not found" });
      if (item.status === "cancelled") return res.status(400).json({ message: "Booking cancelled" });
      if (item.status === "paid") return res.status(400).json({ message: "Already paid" });
    }

    const club = await Club.findById(item.clubId);
    if (!club) return res.status(404).json({ message: "Club not found" });
    if (!club.approved) return res.status(400).json({ message: "Club not approved" });

    // ✅ read amount from each type
    const amount =
      payableType === "facility"
        ? Number(item.pricing?.total || 0)
        : Number(item.pricing?.total || 0);

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const commissionRate = Number(club.commissionRate ?? 0.15);
    const adminFee = Math.round(amount * commissionRate * 100) / 100;
    const clubEarning = Math.round((amount - adminFee) * 100) / 100;

    // ✅ set item as paid
    item.status = "paid";
    await item.save();

    // ✅ record payment
    const payment = await Payment.create({
      payableType,
      payableId: item._id,

      // legacy field (only for facilities)
      bookingId: payableType === "facility" ? item._id : undefined,

      playerId: item.playerId,
      clubId: item.clubId,
      amount,
      method: data.method || "card",
      status: "paid",
      commissionRate,
      adminFee,
      clubEarning,
    });

    res.json({ message: "Paid", payableType, item, payment });
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
