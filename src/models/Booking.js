import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },

    sport: { type: String, required: true },
    facilityId: { type: mongoose.Schema.Types.ObjectId, required: true },

    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },

    pricing: {
      base: { type: Number, required: true },
      discount: { type: Number, default: 0 },
      total: { type: Number, required: true },
      membershipApplied: { type: Boolean, default: false },
    },

    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
    
  },
  { timestamps: true }
);

export default mongoose.model("Booking", bookingSchema);
