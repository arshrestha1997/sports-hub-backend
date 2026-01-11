import { Router } from "express";
import { authRequired, roleRequired } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import AccessoryOrder from "../models/AccessoryOrder.js";
import CoachBooking from "../models/CoachBooking.js";

const router = Router();

/**
 * POST /api/club/payments/facility/:id/mark-paid
 * (Optional: if you still want it, you can keep it. If not used, it won't harm.)
 */
router.post("/facility/:id/mark-paid", authRequired, roleRequired("club"), async (req, res) => {
  const clubId = req.user.clubId;
  const booking = await Booking.findOne({ _id: req.params.id, clubId });
  if (!booking) return res.status(404).json({ message: "Facility booking not found" });

  booking.status = "paid";
  await booking.save();

  res.json({ ok: true, booking });
});

/**
 * POST /api/club/payments/accessory/:id/mark-paid
 */
router.post("/accessory/:id/mark-paid", authRequired, roleRequired("club"), async (req, res) => {
  const clubId = req.user.clubId;
  const order = await AccessoryOrder.findOne({ _id: req.params.id, clubId });
  if (!order) return res.status(404).json({ message: "Accessory order not found" });

  order.status = "paid";
  await order.save();

  res.json({ ok: true, order });
});

/**
 * POST /api/club/payments/coach/:id/mark-paid
 */
router.post("/coach/:id/mark-paid", authRequired, roleRequired("club"), async (req, res) => {
  const clubId = req.user.clubId;
  const booking = await CoachBooking.findOne({ _id: req.params.id, clubId });
  if (!booking) return res.status(404).json({ message: "Coach booking not found" });

  booking.status = "paid";
  await booking.save();

  res.json({ ok: true, booking });
});

/* =========================================================
   ✅ NEW: CANCEL / REMOVE BOOKINGS (Club Manager)
   ========================================================= */

/**
 * POST /api/club/payments/facility/:id/cancel
 */
router.post("/facility/:id/cancel", authRequired, roleRequired("club"), async (req, res) => {
  const clubId = req.user.clubId;
  const booking = await Booking.findOne({ _id: req.params.id, clubId });
  if (!booking) return res.status(404).json({ message: "Facility booking not found" });

  booking.status = "cancelled";
  await booking.save();

  res.json({ ok: true, booking });
});

/**
 * POST /api/club/payments/accessory/:id/cancel
 */
router.post("/accessory/:id/cancel", authRequired, roleRequired("club"), async (req, res) => {
  const clubId = req.user.clubId;
  const order = await AccessoryOrder.findOne({ _id: req.params.id, clubId });
  if (!order) return res.status(404).json({ message: "Accessory order not found" });

  order.status = "cancelled";
  await order.save();

  res.json({ ok: true, order });
});

/**
 * POST /api/club/payments/coach/:id/cancel
 */
router.post("/coach/:id/cancel", authRequired, roleRequired("club"), async (req, res) => {
  const clubId = req.user.clubId;
  const booking = await CoachBooking.findOne({ _id: req.params.id, clubId });
  if (!booking) return res.status(404).json({ message: "Coach booking not found" });

  booking.status = "cancelled";
  await booking.save();

  res.json({ ok: true, booking });
});

export default router;
