import { Router } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { z } from "zod";
import User from "../models/User.js";
import Club from "../models/Club.js";

const router = Router();

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["player", "club"]),
  clubName: z.string().optional(),
  clubLocation: z.string().optional(),
});

router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);

    const exists = await User.findOne({ email: data.email });
    if (exists) return res.status(400).json({ message: "Email already in use" });

    const passwordHash = await bcrypt.hash(data.password, 10);

    let clubId = null;

    // ✅ Only runs for club accounts
    if (data.role === "club") {
      if (!data.clubName || !data.clubLocation) {
        return res
          .status(400)
          .json({ message: "clubName and clubLocation required for club registration" });
      }

      const club = await Club.create({
        name: data.clubName,
        location: data.clubLocation,
        approved: false,
        commissionRate: 0.15,
        sports: [],
        facilities: [],
      });

      clubId = club._id;
    }

    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      membership: "none",
      clubId,
    });

    return res.json({ message: "Registered", userId: user._id, clubId });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Invalid input" });
  }
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, role: user.role, membership: user.membership, clubId: user.clubId },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        membership: user.membership,
        clubId: user.clubId,
      },
    });
  } catch (err) {
    return res.status(400).json({ message: err.message || "Invalid input" });
  }
});

export default router;