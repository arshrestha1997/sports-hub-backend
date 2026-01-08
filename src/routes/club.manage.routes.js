import { Router } from "express";
import Club from "../models/Club.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = Router();

// Club account updates its own club
router.put("/me", authRequired, roleRequired("club"), async (req, res) => {
  const clubId = req.user.clubId;
  if (!clubId) return res.status(400).json({ message: "No club linked to this club account" });

  // only allow safe fields
  const allowed = ["sports", "facilities"];
  const update = {};
  for (const key of allowed) if (key in req.body) update[key] = req.body[key];

  const club = await Club.findByIdAndUpdate(clubId, update, { new: true });
  res.json({ club });
});

export default router;
