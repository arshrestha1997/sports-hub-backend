import { Router } from "express";
import Club from "../models/Club.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = Router();

/**
 * ADMIN: list ALL clubs (approved + unapproved)
 * GET /api/admin/clubs
 */
router.get("/clubs", authRequired, roleRequired("admin"), async (req, res) => {
  const clubs = await Club.find().sort({ createdAt: -1 });
  res.json({ clubs });
});

/**
 * ADMIN: list only pending (unapproved) clubs
 * GET /api/admin/clubs/pending
 */
router.get("/clubs/pending", authRequired, roleRequired("admin"), async (req, res) => {
  const clubs = await Club.find({ approved: false }).sort({ createdAt: -1 });
  res.json({ clubs });
});

/**
 * ADMIN: approve a club
 * POST /api/admin/clubs/:id/approve
 */
router.post("/clubs/:id/approve", authRequired, roleRequired("admin"), async (req, res) => {
  const club = await Club.findByIdAndUpdate(
    req.params.id,
    { approved: true },
    { new: true }
  );

  if (!club) return res.status(404).json({ message: "Club not found" });

  res.json({ message: "Club approved", club });
});

/**
 * ADMIN: cancel approval (unapprove)
 * POST /api/admin/clubs/:id/unapprove
 */
router.post("/clubs/:id/unapprove", authRequired, roleRequired("admin"), async (req, res) => {
  const club = await Club.findByIdAndUpdate(
    req.params.id,
    { approved: false },
    { new: true }
  );

  if (!club) return res.status(404).json({ message: "Club not found" });

  res.json({ message: "Club approval cancelled", club });
});

/**
 * OPTIONAL: delete club permanently
 * DELETE /api/admin/clubs/:id
 */
router.delete("/clubs/:id", authRequired, roleRequired("admin"), async (req, res) => {
  const club = await Club.findByIdAndDelete(req.params.id);
  if (!club) return res.status(404).json({ message: "Club not found" });
  res.json({ message: "Club deleted permanently" });
});

export default router;
