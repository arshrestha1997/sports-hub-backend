import mongoose from "mongoose";

const accessorySchema = new mongoose.Schema(
  {
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", required: true },
    sport: { type: String, required: true }, // tennis, futsal, cricket, table-tennis
    name: { type: String, required: true },

    rentEnabled: { type: Boolean, default: true },
    rentPricePerHour: { type: Number, default: 0 },

    buyEnabled: { type: Boolean, default: true },
    buyPrice: { type: Number, default: 0 },

    stock: { type: Number, default: 0 }, // total items in club inventory
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default mongoose.model("Accessory", accessorySchema);
