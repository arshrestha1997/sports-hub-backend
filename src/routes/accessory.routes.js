import { Router } from "express";
import { z } from "zod";
import { authRequired, roleRequired } from "../middleware/auth.js";
import Accessory from "../models/Accessory.js";
import AccessoryOrder from "../models/AccessoryOrder.js";

const router = Router();

/** PUBLIC: list accessories for a club */
router.get("/club/:clubId", async (req, res) => {
  const items = await Accessory.find({ clubId: req.params.clubId, active: true }).sort({ createdAt: -1 });
  res.json({ items });
});

/** CLUB: add accessory */
const addSchema = z.object({
  sport: z.string(),
  name: z.string(),
  stock: z.number().int().min(0),
  rentEnabled: z.boolean().optional(),
  rentPricePerHour: z.number().min(0).optional(),
  buyEnabled: z.boolean().optional(),
  buyPrice: z.number().min(0).optional(),
});

router.post("/", authRequired, roleRequired("club"), async (req, res) => {
  const data = addSchema.parse(req.body);

  const accessory = await Accessory.create({
    clubId: req.user.clubId,
    ...data,
  });

  res.json({ accessory });
});

/** CLUB: my accessories */
router.get("/me", authRequired, roleRequired("club"), async (req, res) => {
  const items = await Accessory.find({ clubId: req.user.clubId }).sort({ createdAt: -1 });
  res.json({ items });
});

/** PLAYER: create order (rent/buy) */
const orderSchema = z.object({
  accessoryId: z.string(),
  type: z.enum(["rent", "buy"]),
  qty: z.number().int().min(1),
  startTime: z.string().optional(), // rent
  endTime: z.string().optional(),   // rent
});

router.post("/order", authRequired, roleRequired("player"), async (req, res) => {
  const data = orderSchema.parse(req.body);

  const accessory = await Accessory.findById(data.accessoryId);
  if (!accessory || !accessory.active) return res.status(404).json({ message: "Accessory not found" });

  if (data.qty > accessory.stock) return res.status(400).json({ message: "Not enough stock" });

  let unitPrice = 0;
  let hours = 0;
  let total = 0;

  if (data.type === "buy") {
    if (!accessory.buyEnabled) return res.status(400).json({ message: "Buying not available" });
    unitPrice = Number(accessory.buyPrice);
    total = unitPrice * data.qty;
  } else {
    if (!accessory.rentEnabled) return res.status(400).json({ message: "Rent not available" });
    if (!data.startTime || !data.endTime) return res.status(400).json({ message: "startTime/endTime required for rent" });

    const start = new Date(data.startTime);
    const end = new Date(data.endTime);
    if (isNaN(start) || isNaN(end) || start >= end) return res.status(400).json({ message: "Invalid rent time" });

    hours = (end - start) / (1000 * 60 * 60);
    if (hours <= 0 || hours > 24) return res.status(400).json({ message: "Invalid rent duration" });

    unitPrice = Number(accessory.rentPricePerHour);
    total = unitPrice * hours * data.qty;

    // store start/end on order
    data.startTime = start.toISOString();
    data.endTime = end.toISOString();
  }

  total = Math.round(total * 100) / 100;

  const order = await AccessoryOrder.create({
    playerId: req.user.userId,
    clubId: accessory.clubId,
    accessoryId: accessory._id,
    type: data.type,
    qty: data.qty,
    startTime: data.startTime ? new Date(data.startTime) : undefined,
    endTime: data.endTime ? new Date(data.endTime) : undefined,
    pricing: { unitPrice, hours, total },
    status: "pending",
  });

  res.json({ order });
});

/** PLAYER: my orders */
router.get("/orders/me", authRequired, roleRequired("player"), async (req, res) => {
  const orders = await AccessoryOrder.find({ playerId: req.user.userId }).sort({ createdAt: -1 });
  res.json({ orders });
});

/** PLAYER: cancel order */
router.post("/order/:id/cancel", authRequired, roleRequired("player"), async (req, res) => {
  const order = await AccessoryOrder.findOne({ _id: req.params.id, playerId: req.user.userId });
  if (!order) return res.status(404).json({ message: "Order not found" });
  if (order.status === "paid") return res.status(400).json({ message: "Cannot cancel a paid order" });

  order.status = "cancelled";
  await order.save();
  res.json({ order });
});

export default router;
