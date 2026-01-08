import { Router } from "express";
import Club from "../models/Club.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = Router();

// list unapproved clubs
router.get("/clubs/pending", authRequired, roleRequired("admin"), async (req, res) => {
  const clubs = await Club.find({ approved: false }).sort({ createdAt: -1 });
  res.json({ clubs });
});

// approve a club + set commission 0.15 or 0.20
router.post("/clubs/:id/approve", authRequired, roleRequired("admin"), async (req, res) => {
  const commissionRate = Number(req.body?.commissionRate ?? 0.15);
  if (![0.15, 0.2].includes(commissionRate)) {
    return res.status(400).json({ message: "commissionRate must be 0.15 or 0.20" });
  }

  const club = await Club.findByIdAndUpdate(
    req.params.id,
    { approved: true, commissionRate },
    { new: true }
  );

  if (!club) return res.status(404).json({ message: "Club not found" });
  res.json({ club });
});

export default router;
