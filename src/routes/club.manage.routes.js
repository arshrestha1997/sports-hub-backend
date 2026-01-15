import { Router } from "express";
import Club from "../models/Club.js";
import { authRequired, roleRequired } from "../middleware/auth.js";
import mongoose from "mongoose";

const router = Router();

/**
 * GET current club facilities
 * GET /api/club/facilities
 */
router.get("/facilities", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    if (!clubId) {
      return res.status(400).json({ message: "No club linked to this account" });
    }

    const club = await Club.findById(clubId).select("facilities");
    return res.json({ facilities: club?.facilities || [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to load facilities" });
  }
});

/**
 * ADD a new facility
 * POST /api/club/facilities
 */
router.post("/facilities", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    if (!clubId) {
      return res.status(400).json({ message: "No club linked to this account" });
    }

    const { sport, name, hourlyPrice } = req.body;

    if (!sport || !name || hourlyPrice == null) {
      return res.status(400).json({ message: "All fields required" });
    }

    const facility = {
      _id: new mongoose.Types.ObjectId(),
      sport,
      name,
      hourlyPrice: Number(hourlyPrice),
    };

    const club = await Club.findByIdAndUpdate(
      clubId,
      { $push: { facilities: facility } },
      { new: true }
    ).select("facilities");

    return res.status(201).json({ facility, facilities: club.facilities });
  } catch (err) {
    return res.status(500).json({ message: "Failed to add facility" });
  }
});

/**
 * UPDATE a facility
 * PUT /api/club/facilities/:facilityId
 */
router.put("/facilities/:facilityId", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    if (!clubId) {
      return res.status(400).json({ message: "No club linked to this account" });
    }

    const { facilityId } = req.params;
    const { sport, name, hourlyPrice } = req.body;

    if (!mongoose.Types.ObjectId.isValid(facilityId)) {
      return res.status(400).json({ message: "Invalid facilityId" });
    }

    if (!sport || !name || hourlyPrice == null) {
      return res.status(400).json({ message: "sport, name and hourlyPrice are required" });
    }

    const club = await Club.findOneAndUpdate(
      { _id: clubId, "facilities._id": facilityId },
      {
        $set: {
          "facilities.$.sport": sport,
          "facilities.$.name": name,
          "facilities.$.hourlyPrice": Number(hourlyPrice),
        },
      },
      { new: true }
    ).select("facilities");

    if (!club) return res.status(404).json({ message: "Facility not found" });

    return res.json({ facilities: club.facilities });
  } catch (err) {
    return res.status(500).json({ message: "Failed to update facility" });
  }
});

/**
 * DELETE a facility
 * DELETE /api/club/facilities/:facilityId
 */
router.delete("/facilities/:facilityId", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const clubId = req.user.clubId;
    if (!clubId) {
      return res.status(400).json({ message: "No club linked to this account" });
    }

    const { facilityId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(facilityId)) {
      return res.status(400).json({ message: "Invalid facilityId" });
    }

    const club = await Club.findByIdAndUpdate(
      clubId,
      { $pull: { facilities: { _id: facilityId } } },
      { new: true }
    ).select("facilities");

    return res.json({ facilities: club?.facilities || [] });
  } catch (err) {
    return res.status(500).json({ message: "Failed to delete facility" });
  }
});

/**
 * UPDATE club profile (existing)
 * PUT /api/club/me
 */
router.put("/me", authRequired, roleRequired("club"), async (req, res) => {
  const clubId = req.user.clubId;
  if (!clubId) {
    return res.status(400).json({ message: "No club linked to this club account" });
  }

  const allowed = ["sports", "facilities"];
  const update = {};
  for (const key of allowed) if (key in req.body) update[key] = req.body[key];

  const club = await Club.findByIdAndUpdate(clubId, update, { new: true });
  return res.json({ club });
});

export default router;
