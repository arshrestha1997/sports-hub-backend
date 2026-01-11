import mongoose from "mongoose";

const facilitySchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    sport: { type: String, required: true },
    hourlyPrice: { type: Number, required: true }
  },
  { _id: true }
);

const clubSchema = new mongoose.Schema(
  {
    // Club basic info
    name: { type: String, required: true },
    location: { type: String, required: true },

    // Admin approval
    approved: { type: Boolean, default: false },

    // Optional: sports offered (used for filtering/search)
    sports: [{ type: String }],

    // Facilities managed by club
    facilities: [facilitySchema],
  },
  { timestamps: true }
);

export default mongoose.model("Club", clubSchema);
