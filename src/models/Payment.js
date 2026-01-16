import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema(
  {
    // ✅ NEW: pay any type of item
    payableType: {
      type: String,
      enum: ["facility", "accessory", "coach"],
      required: true,
    },

    payableId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },

    // ✅ keep old field optional so nothing breaks if old docs exist
    bookingId: { type: mongoose.Schema.Types.ObjectId, ref: "Booking", required: false },

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
