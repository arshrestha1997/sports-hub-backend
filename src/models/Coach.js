import mongoose from "mongoose";

const weeklyWindowSchema = new mongoose.Schema(
  {
    day: { type: Number, required: true }, // 0=Sun ... 6=Sat
    startMin: { type: Number, required: true }, // 0..1439
    endMin: { type: Number, required: true },   // 1..1440
  },
  { _id: false }
);

const classSessionSchema = new mongoose.Schema(
  {
    startTime: { type: Date, required: true },
    endTime: { type: Date, required: true },
    maxPeople: { type: Number, required: true, min: 1 },
    bookedPeople: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

const coachSchema = new mongoose.Schema(
  {
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    name: { type: String, required: true },
    sport: { type: String, required: true },

    personalEnabled: { type: Boolean, default: true },
    personalRatePerHour: { type: Number, default: 0 },

    // ✅ weekly personal availability
    personalAvailability: { type: [weeklyWindowSchema], default: [] },

    classEnabled: { type: Boolean, default: true },
    classPrice: { type: Number, default: 0 },

    // ✅ scheduled class sessions
    classSessions: { type: [classSessionSchema], default: [] },

    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Coach", coachSchema);
