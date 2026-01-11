import { Router } from "express";
import Accessory from "../models/Accessory.js";
import { authRequired, roleRequired } from "../middleware/auth.js";

const router = Router();

/**
 * ============================
 * GET my accessories
 * ============================
 */
router.get("/me", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const items = await Accessory.find({ clubId: req.user.clubId }).sort({ createdAt: -1 });
    res.json({ items });
  } catch (err) {
    res.status(500).json({ message: "Failed to load accessories" });
  }
});

/**
 * ============================
 * ADD accessory
 * ============================
 */
router.post("/", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const {
      sport,
      name,
      stock,
      rentEnabled,
      rentPricePerHour,
      buyEnabled,
      buyPrice,
    } = req.body;

    const item = await Accessory.create({
      clubId: req.user.clubId,
      sport,
      name,
      stock,
      rentEnabled,
      rentPricePerHour,
      buyEnabled,
      buyPrice,
    });

    res.json({ item });
  } catch (err) {
    res.status(400).json({ message: "Failed to add accessory" });
  }
});

/**
 * ============================
 * UPDATE accessory
 * ============================
 */
router.put("/:accessoryId", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const { accessoryId } = req.params;

    const item = await Accessory.findOne({
      _id: accessoryId,
      clubId: req.user.clubId, // 🔒 only own accessories
    });

    if (!item) {
      return res.status(404).json({ message: "Accessory not found" });
    }

    // allow only safe fields
    const allowed = [
      "sport",
      "name",
      "stock",
      "rentEnabled",
      "rentPricePerHour",
      "buyEnabled",
      "buyPrice",
    ];

    for (const key of allowed) {
      if (key in req.body) item[key] = req.body[key];
    }

    await item.save();
    res.json({ item });
  } catch (err) {
    res.status(400).json({ message: "Failed to update accessory" });
  }
});

/**
 * ============================
 * DELETE accessory
 * ============================
 */
router.delete("/:accessoryId", authRequired, roleRequired("club"), async (req, res) => {
  try {
    const { accessoryId } = req.params;

    const item = await Accessory.findOneAndDelete({
      _id: accessoryId,
      clubId: req.user.clubId, // 🔒 only own accessories
    });

    if (!item) {
      return res.status(404).json({ message: "Accessory not found" });
    }

    res.json({ message: "Accessory deleted" });
  } catch (err) {
    res.status(400).json({ message: "Failed to delete accessory" });
  }
});

export default router;
