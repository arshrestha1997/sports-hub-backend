import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema(
  { sport: String, name: String, hourlyPrice: Number },
  { _id: true }
);

const clubSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    location: { type: String, required: true },
    approved: { type: Boolean, default: false },
    commissionRate: { type: Number, default: 0.15 }, // 15% default
    sports: [{ type: String }],
    facilities: [facilitySchema],
  },
  { timestamps: true }
);

export default mongoose.model("Club", clubSchema);
