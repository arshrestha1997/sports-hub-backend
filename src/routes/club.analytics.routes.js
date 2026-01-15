import { Router } from "express";
import { authRequired, roleRequired } from "../middleware/auth.js";

import Club from "../models/Club.js";                 // ✅ ADD
import Booking from "../models/Booking.js";
import AccessoryOrder from "../models/AccessoryOrder.js";
import CoachBooking from "../models/CoachBooking.js";

const router = Router();

/* =========================================================
   GET club analytics
   GET /api/club/analytics
   ✅ Enrich facility bookings with embedded facility details
========================================================= */
router.get("/analytics", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    if (!clubId) return res.status(400).json({ message: "No club linked to this account" });

    // ✅ Load club facilities (embedded subdocs)
    const club = await Club.findById(clubId).select("facilities").lean();
    const facilities = club?.facilities || [];

    // ✅ Map: facilitySubDocId -> details
    const facilityMap = new Map();
    for (const f of facilities) {
      facilityMap.set(String(f._id), {
        _id: f._id,
        name: f.name,
        sport: f.sport,
        hourlyPrice: f.hourlyPrice,
      });
    }

    const [facilityBookingsRaw, accessoryOrders, coachBookings] = await Promise.all([
      Booking.find({ clubId })
        .populate("playerId", "name email")
        .sort({ createdAt: -1 })
        .lean(), // ✅ so we can attach extra fields

      AccessoryOrder.find({ clubId })
        .populate("playerId", "name email")
        .populate("accessoryId", "name sport")
        .sort({ createdAt: -1 }),

      CoachBooking.find({ clubId })
        .populate("playerId", "name email")
        .populate("coachId", "name sport")
        .sort({ createdAt: -1 }),
    ]);

    // ✅ Attach facility details to each booking
    const facilityBookings = (facilityBookingsRaw || []).map((b) => {
      // booking may store facilityId or other key; support all common ones
      const fid =
        b.facilityId ||
        b.facilitySubId ||
        b.facility?._id ||
        b.facility ||
        null;

      const facility = fid ? facilityMap.get(String(fid)) : null;

      return {
        ...b,

        // unify fields used by frontend table
        facilityName: b.facilityName || facility?.name || "",
        facilitySport: b.facilitySport || b.sport || facility?.sport || "",
        facilityHourlyPrice:
          b.facilityHourlyPrice ?? b.hourlyPrice ?? facility?.hourlyPrice ?? null,

        // optional: full facility object
        facility,
      };
    });

    res.json({
      facilityBookings,
      accessoryOrders: accessoryOrders || [],
      coachBookings: coachBookings || [],
    });
  } catch (err) {
    console.error("Analytics error:", err);
    res.status(500).json({ message: "Failed to load analytics" });
  }
});

/* =========================================================
   MARK PAID endpoints
========================================================= */
router.patch("/analytics/facility/:id/mark-paid", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const booking = await Booking.findOne({ _id: req.params.id, clubId });
    if (!booking) return res.status(404).json({ message: "Facility booking not found" });

    booking.status = "paid";
    booking.paymentStatus = "paid";
    await booking.save();

    res.json({ message: "Marked as paid", booking });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark paid" });
  }
});

router.patch("/analytics/accessory/:id/mark-paid", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const order = await AccessoryOrder.findOne({ _id: req.params.id, clubId });
    if (!order) return res.status(404).json({ message: "Accessory order not found" });

    order.status = "paid";
    order.paymentStatus = "paid";
    await order.save();

    res.json({ message: "Marked as paid", order });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark paid" });
  }
});

router.patch("/analytics/coach/:id/mark-paid", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const booking = await CoachBooking.findOne({ _id: req.params.id, clubId });
    if (!booking) return res.status(404).json({ message: "Coach booking not found" });

    booking.status = "paid";
    booking.paymentStatus = "paid";
    await booking.save();

    res.json({ message: "Marked as paid", booking });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark paid" });
  }
});

/* =========================================================
   UPDATE endpoints (limited safe fields)
========================================================= */
router.put("/analytics/facility/:id", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const booking = await Booking.findOne({ _id: req.params.id, clubId });
    if (!booking) return res.status(404).json({ message: "Facility booking not found" });

    const { startTime, endTime, status, total } = req.body;

    if (startTime) booking.startTime = new Date(startTime);
    if (endTime) booking.endTime = new Date(endTime);
    if (status) booking.status = status;

    if (total != null) {
      booking.pricing = booking.pricing || {};
      booking.pricing.total = Number(total);
    }

    await booking.save();
    res.json({ message: "Facility booking updated", booking });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

router.put("/analytics/accessory/:id", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const order = await AccessoryOrder.findOne({ _id: req.params.id, clubId });
    if (!order) return res.status(404).json({ message: "Accessory order not found" });

    const { qty, type, startTime, endTime, status, total } = req.body;

    if (qty != null) order.qty = Number(qty);
    if (type) order.type = type;
    if (startTime) order.startTime = new Date(startTime);
    if (endTime) order.endTime = new Date(endTime);
    if (status) order.status = status;

    if (total != null) {
      order.pricing = order.pricing || {};
      order.pricing.total = Number(total);
    }

    await order.save();
    res.json({ message: "Accessory order updated", order });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

router.put("/analytics/coach/:id", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const booking = await CoachBooking.findOne({ _id: req.params.id, clubId });
    if (!booking) return res.status(404).json({ message: "Coach booking not found" });

    const { type, startTime, endTime, classDateTime, participants, status, total } = req.body;

    if (type) booking.type = type;
    if (startTime) booking.startTime = new Date(startTime);
    if (endTime) booking.endTime = new Date(endTime);
    if (classDateTime) booking.classDateTime = new Date(classDateTime);
    if (participants != null) booking.participants = Number(participants);
    if (status) booking.status = status;

    if (total != null) {
      booking.pricing = booking.pricing || {};
      booking.pricing.total = Number(total);
    }

    await booking.save();
    res.json({ message: "Coach booking updated", booking });
  } catch (err) {
    res.status(500).json({ message: "Update failed" });
  }
});

/* =========================================================
   DELETE endpoints
========================================================= */
router.delete("/analytics/facility/:id", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const deleted = await Booking.findOneAndDelete({ _id: req.params.id, clubId });
    if (!deleted) return res.status(404).json({ message: "Facility booking not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

router.delete("/analytics/accessory/:id", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const deleted = await AccessoryOrder.findOneAndDelete({ _id: req.params.id, clubId });
    if (!deleted) return res.status(404).json({ message: "Accessory order not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

router.delete("/analytics/coach/:id", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    const deleted = await CoachBooking.findOneAndDelete({ _id: req.params.id, clubId });
    if (!deleted) return res.status(404).json({ message: "Coach booking not found" });
    res.json({ message: "Deleted" });
  } catch (err) {
    res.status(500).json({ message: "Delete failed" });
  }
});

export default router;
