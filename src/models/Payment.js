import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: true },
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },

    amount: { type: Number, required: true },
    method: { type: String, default: "card" }, // mock
    status: { type: String, enum: ["paid", "refunded"], default: "paid" },

    commissionRate: { type: Number, required: true }, // 0.15 or 0.20
    adminFee: { type: Number, required: true },
    clubEarning: { type: Number, required: true },
  },
  { timestamps: true }
);

export default mongoose.model("Payment", paymentSchema);
