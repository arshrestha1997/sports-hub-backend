import { Router } from "express";
import PDFDocument from "pdfkit";
import { authRequired, roleRequired } from "../middleware/auth.js";

import Booking from "../models/Booking.js";
import AccessoryOrder from "../models/AccessoryOrder.js";
import CoachBooking from "../models/CoachBooking.js";

import Payment from "../models/Payment.js";
import Club from "../models/Club.js";

const router = Router();

function writeReceiptPdf({ res, type, item, payment, club }) {
  // PDF headers
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="receipt-${type}-${item._id}.pdf"`);

  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(res);

  doc.fontSize(18).text("Sports Hub Receipt", { align: "center" });
  doc.moveDown();

  doc.fontSize(11).text(`Receipt ID: ${payment._id}`);
  doc.text(`Type: ${type.toUpperCase()}`);
  doc.text(`Reference ID: ${item._id}`);
  doc.text(`Date: ${new Date(payment.createdAt).toLocaleString()}`);
  doc.moveDown();

  doc.fontSize(12).text("Club Details", { underline: true });
  doc.fontSize(11).text(`Club: ${club?.name || "N/A"}`);
  doc.text(`Location: ${club?.location || "N/A"}`);
  doc.moveDown();

  doc.fontSize(12).text("Item Details", { underline: true });
  doc.fontSize(11);

  if (type === "facility") {
    doc.text(`Sport: ${item.sport}`);
    doc.text(`Start: ${new Date(item.startTime).toLocaleString()}`);
    doc.text(`End: ${new Date(item.endTime).toLocaleString()}`);
  }

  if (type === "accessory") {
    doc.text(`Accessory: ${item.accessoryId?.name || "N/A"}`);
    doc.text(`Sport: ${item.accessoryId?.sport || "N/A"}`);
    doc.text(`Type: ${String(item.type).toUpperCase()}`);
    doc.text(`Qty: ${item.qty}`);
    if (item.type === "rent") {
      doc.text(`Rent Start: ${new Date(item.startTime).toLocaleString()}`);
      doc.text(`Rent End: ${new Date(item.endTime).toLocaleString()}`);
    }
  }

  if (type === "coach") {
    doc.text(`Coach: ${item.coachId?.name || "N/A"}`);
    doc.text(`Sport: ${item.coachId?.sport || "N/A"}`);
    doc.text(`Booking Type: ${String(item.type).toUpperCase()}`);
    if (item.type === "personal") {
      doc.text(`Start: ${new Date(item.startTime).toLocaleString()}`);
      doc.text(`End: ${new Date(item.endTime).toLocaleString()}`);
    } else {
      doc.text(`Class Date: ${new Date(item.classDateTime).toLocaleString()}`);
      doc.text(`Participants: ${item.participants}`);
    }
  }

  doc.moveDown();

  doc.fontSize(12).text("Payment Summary", { underline: true });
  doc.fontSize(11);

  const base = Number(item.pricing?.base || item.pricing?.total || 0);
  const discount = Number(item.pricing?.discount || 0);

  doc.text(`Base: $${Number(base).toFixed(2)}`);
  if (type === "facility") doc.text(`Discount: $${Number(discount).toFixed(2)}`);
  doc.text(`Total Paid: $${Number(payment.amount).toFixed(2)}`);
  doc.text(`Method: ${payment.method}`);
  doc.text(`Status: ${payment.status}`);

  doc.moveDown();
  doc.fontSize(10).fillColor("#555").text(
    "Note: This is a demo receipt for your Sports Hub project (mock payment).",
    { align: "left" }
  );

  doc.end();
}

/* =========================================================
   ✅ OLD (facility only): GET /api/receipts/:bookingId
   This keeps old code working.
========================================================= */
router.get("/:bookingId", authRequired, roleRequired("player"), async (req, res) => {
  try {
    const playerId = req.user.userId;
    const bookingId = req.params.bookingId;

    const item = await Booking.findOne({ _id: bookingId, playerId });
    if (!item) return res.status(404).json({ message: "Facility booking not found" });
    if (item.status !== "paid") {
      return res.status(400).json({ message: "Receipt available only for paid items" });
    }

    const payment =
      (await Payment.findOne({ payableType: "facility", payableId: item._id, status: "paid" })) ||
      (await Payment.findOne({ bookingId: item._id, status: "paid" }));

    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    const club = await Club.findById(item.clubId);
    writeReceiptPdf({ res, type: "facility", item, payment, club });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to generate receipt" });
  }
});

/* =========================================================
   ✅ NEW: GET /api/receipts/:type/:id
   type = facility | accessory | coach
========================================================= */
router.get("/:type/:id", authRequired, roleRequired("player"), async (req, res) => {
  try {
    const playerId = req.user.userId;
    const { type, id } = req.params;

    if (!["facility", "accessory", "coach"].includes(type)) {
      return res.status(400).json({ message: "Invalid receipt type" });
    }

    let item = null;

    if (type === "facility") {
      item = await Booking.findOne({ _id: id, playerId });
      if (!item) return res.status(404).json({ message: "Facility booking not found" });
    }

    if (type === "accessory") {
      item = await AccessoryOrder.findOne({ _id: id, playerId }).populate("accessoryId", "name sport");
      if (!item) return res.status(404).json({ message: "Accessory order not found" });
    }

    if (type === "coach") {
      item = await CoachBooking.findOne({ _id: id, playerId }).populate("coachId", "name sport");
      if (!item) return res.status(404).json({ message: "Coach booking not found" });
    }

    if (item.status !== "paid") {
      return res.status(400).json({ message: "Receipt available only for paid items" });
    }

    const payment =
      (await Payment.findOne({ payableType: type, payableId: item._id, status: "paid" })) ||
      (type === "facility" ? await Payment.findOne({ bookingId: item._id, status: "paid" }) : null);

    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    const club = await Club.findById(item.clubId);
    writeReceiptPdf({ res, type, item, payment, club });
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to generate receipt" });
  }
});

export default router;
