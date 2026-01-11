import mongoose from "mongoose";

const coachBookingSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    coachId: { type: mongoose.Schema.Types.ObjectId, ref: "Coach", required: true },

    type: { type: String, enum: ["personal", "class"], required: true },

    // personal only
    startTime: { type: Date },
    endTime: { type: Date },

    // class only
    classDateTime: { type: Date },
    participants: { type: Number, default: 1 },

    pricing: { total: { type: Number, required: true } },

    status: { type: String, enum: ["pending", "paid", "cancelled"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("CoachBooking", coachBookingSchema);
