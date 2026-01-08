import { Router } from "express";
import PDFDocument from "pdfkit";
import { authRequired, roleRequired } from "../middleware/auth.js";
import Booking from "../models/Booking.js";
import Payment from "../models/Payment.js";
import Club from "../models/Club.js";

const router = Router();

// GET /api/receipts/:bookingId  -> returns PDF
router.get("/:bookingId", authRequired, roleRequired("player"), async (req, res) => {
  try {
    const { bookingId } = req.params;

    const booking = await Booking.findOne({ _id: bookingId, playerId: req.user.userId });
    if (!booking) return res.status(404).json({ message: "Booking not found" });
    if (booking.status !== "paid") return res.status(400).json({ message: "Receipt available only for paid bookings" });

    const payment = await Payment.findOne({ bookingId: booking._id, status: "paid" });
    if (!payment) return res.status(404).json({ message: "Payment record not found" });

    const club = await Club.findById(booking.clubId);

    // PDF headers
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${booking._id}.pdf"`);

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    doc.pipe(res);

    // ---- Receipt content ----
    doc.fontSize(18).text("Sports Hub Receipt", { align: "center" });
    doc.moveDown();

    doc.fontSize(11).text(`Receipt ID: ${payment._id}`);
    doc.text(`Booking ID: ${booking._id}`);
    doc.text(`Date: ${new Date(payment.createdAt).toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(12).text("Club Details", { underline: true });
    doc.fontSize(11).text(`Club: ${club?.name || "N/A"}`);
    doc.text(`Location: ${club?.location || "N/A"}`);
    doc.moveDown();

    doc.fontSize(12).text("Booking Details", { underline: true });
    doc.fontSize(11).text(`Sport: ${booking.sport}`);
    doc.text(`Start: ${new Date(booking.startTime).toLocaleString()}`);
    doc.text(`End: ${new Date(booking.endTime).toLocaleString()}`);
    doc.moveDown();

    doc.fontSize(12).text("Payment Summary", { underline: true });
    doc.fontSize(11).text(`Base: $${Number(booking.pricing.base).toFixed(2)}`);
    doc.text(`Discount: $${Number(booking.pricing.discount || 0).toFixed(2)}`);
    doc.text(`Total Paid: $${Number(payment.amount).toFixed(2)}`);
    doc.text(`Method: ${payment.method}`);
    doc.text(`Status: ${payment.status}`);
    doc.moveDown();

    doc.fontSize(10).fillColor("#555").text(
      "Note: This is a demo receipt for your Sports Hub project (mock payment).",
      { align: "left" }
    );

    doc.end();
  } catch (err) {
    res.status(500).json({ message: err.message || "Failed to generate receipt" });
  }
});

export default router;
