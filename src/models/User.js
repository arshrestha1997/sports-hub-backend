import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ["admin", "club", "player"], required: true },
    membership: { type: String, enum: ["none", "member"], default: "none" },
    clubId: { type: mongoose.Schema.Types.ObjectId, ref: "Club", default: null },

  },
  { timestamps: true }
);

export default mongoose.model("User", userSchema);
