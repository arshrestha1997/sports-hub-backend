import dotenv from "dotenv";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import User from "./src/models/User.js";

dotenv.config();

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    const email = "admin@test.com";
    const password = "Admin@12345"; // change later if you want

    const exists = await User.findOne({ email });
    if (exists) {
      console.log("ℹ️ Admin already exists:", email);
      process.exit(0);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    await User.create({
      name: "Admin",
      email,
      passwordHash,
      role: "admin",
      membership: "none",
      clubId: null
    });

    console.log("✅ Admin created");
    console.log("Email:", email);
    console.log("Password:", password);
  } catch (err) {
    console.error("❌ Failed:", err.message);
  } finally {
    await mongoose.disconnect();
    process.exit(0);
  }
}

run();
