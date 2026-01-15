import { Router } from "express";
import { authRequired, roleRequired } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import AccessoryOrder from "../models/AccessoryOrder.js";
import CoachBooking from "../models/CoachBooking.js";
import Club from "../models/Club.js";

const router = Router();

/**
 * Club dashboard analytics:
 * - Facility bookings
 * - Accessory orders
 * - Coach bookings
 */
router.get("/analytics", authRequired, roleRequired("club"), async (req, res) => {
  const clubId = req.user.clubId;

  // For embedded facilities mapping (facilityId is not populatable if embedded)
  const club = await Club.findById(clubId).lean();

  // FACILITY BOOKINGS
  const facilityBookingsRaw = await Booking.find({ clubId })
    .populate("playerId", "name email") // ✅ who booked
    .sort({ createdAt: -1 })
    .lean();

  const facilityBookings = facilityBookingsRaw.map((b) => {
    const facility =
      club?.facilities?.find((f) => String(f._id) === String(b.facilityId)) || null;

    // Payment: if status doesn't exist in Booking model, treat as pending
    const paymentStatus = b.status || "pending"; // pending | paid | cancelled (if you have)

    return {
      ...b,
      facilityName: facility?.name || "(unknown)",
      facilitySport: facility?.sport || b.sport || "(unknown)",
      facilityHourlyPrice: facility?.hourlyPrice ?? null,
      paymentStatus,
      payMode: paymentStatus === "paid" ? "online/paid" : "pay_at_club",
    };
  });

  // ACCESSORY ORDERS
  const accessoryOrdersRaw = await AccessoryOrder.find({ clubId })
    .populate("playerId", "name email") // ✅ who booked
    .populate("accessoryId", "name sport")
    .sort({ createdAt: -1 })
    .lean();

  const accessoryOrders = accessoryOrdersRaw.map((o) => ({
    ...o,
    paymentStatus: o.status || "pending", // AccessoryOrder already has status pending/paid/cancelled
    payMode: o.status === "paid" ? "online/paid" : "pay_at_club",
  }));

  // COACH BOOKINGS
  const coachBookingsRaw = await CoachBooking.find({ clubId })
    .populate("playerId", "name email") // ✅ who booked
    .populate("coachId", "name sport")
    .sort({ createdAt: -1 })
    .lean();

  const coachBookings = coachBookingsRaw.map((c) => ({
    ...c,
    paymentStatus: c.status || "pending", // CoachBooking already has status pending/paid/cancelled
    payMode: c.status === "paid" ? "online/paid" : "pay_at_club",
  }));

  res.json({
    facilityBookings,
    accessoryOrders,
    coachBookings,
  });
});

export default router;