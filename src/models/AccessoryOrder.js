import mongoose from "mongoose";

const accessoryOrderSchema = new mongoose.Schema(
  {
    playerId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    accessoryId: { type: mongoose.Schema.Types.ObjectId, ref: "Accessory", required: true },

    type: { type: String, enum: ["rent", "buy"], required: true },
    qty: { type: Number, required: true, min: 1 },

    // rent-only:
    startTime: { type: Date },
    endTime: { type: Date },

    pricing: {
      unitPrice: { type: Number, required: true },
      hours: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    status: { type: String, enum: ["pending", "paid", "cancelled", "returned"], default: "pending" },
  },
  { timestamps: true }
);

export default mongoose.model("AccessoryOrder", accessoryOrderSchema);
