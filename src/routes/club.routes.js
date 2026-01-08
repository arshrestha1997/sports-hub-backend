import { Router } from "express";
import Club from "../models/Club.js";

const router = Router();

// Public: list only approved clubs
router.get("/", async (req, res) => {
  const clubs = await Club.find({ approved: true }).sort({ createdAt: -1 });
  res.json({ clubs });
});

// Public: get one approved club by id
router.get("/:id", async (req, res) => {
  const club = await Club.findOne({ _id: req.params.id, approved: true });
  if (!club) return res.status(404).json({ message: "Club not found" });
  res.json({ club });
});

export default router;
