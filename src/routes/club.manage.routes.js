import { Router } from "express";
import Club from "../models/Club.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import mongoose from "mongoose";

const router = Router();

/**
 * GET current club facilities
 * GET /api/club/facilities
 */
router.get(
  "/facilities",
  authRequired,
  roleRequired("club"),
  async (req, res) => {
    try {
      const clubId = req.user.clubId;
      if (!clubId)
        return res
          .status(400)
          .json({ message: "No club linked to this account" });

      const club = await Club.findById(clubId).select("facilities");
      res.json({ facilities: club?.facilities || [] });
    } catch (err) {
      res.status(500).json({ message: "Failed to load facilities" });
    }
  }
);

/**
 * ADD a new facility
 * POST /api/club/facilities
 */
router.post(
  "/facilities",
  authRequired,
  roleRequired("club"),
  async (req, res) => {
    try {
      const clubId = req.user.clubId;
      const { sport, name, hourlyPrice } = req.body;

      if (!sport || !name || hourlyPrice == null) {
        return res.status(400).json({ message: "All fields required" });
      }

      const facility = {
        _id: new mongoose.Types.ObjectId(),
        sport,
        name,
        hourlyPrice,
      };

      const club = await Club.findByIdAndUpdate(
        clubId,
        { $push: { facilities: facility } },
        { new: true }
      );

      res.status(201).json({ facility, facilities: club.facilities });
    } catch (err) {
      res.status(500).json({ message: "Failed to add facility" });
    }
  }
);

/**
 * UPDATE club profile (existing)
 */
router.put(
  "/me",
  authRequired,
  roleRequired("club"),
  async (req, res) => {
    const clubId = req.user.clubId;
    if (!clubId)
      return res
        .status(400)
        .json({ message: "No club linked to this club account" });

    const allowed = ["sports", "facilities"];
    const update = {};
    for (const key of allowed) if (key in req.body) update[key] = req.body[key];

    const club = await Club.findByIdAndUpdate(clubId, update, { new: true });
    res.json({ club });
  }
);

export default router;
