import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import mongoose from "mongoose";

import authRoutes from "./src/routes/auth.routes.js";
import adminRoutes from "./src/routes/admin.routes.js";
import clubRoutes from "./src/routes/club.routes.js";
import clubManageRoutes from "./src/routes/club.manage.routes.js";
import bookingRoutes from "./src/routes/booking.routes.js";
import paymentRoutes from "./src/routes/payment.routes.js";
import receiptRoutes from "./src/routes/receipt.routes.js";
import accessoryRoutes from "./src/routes/accessory.routes.js";
import coachRoutes from "./src/routes/coach.routes.js";
import clubAnalyticsRoutes from "./src/routes/club.analytics.routes.js";
import clubPaymentsRoutes from "./src/routes/club.payments.routes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// routes
app.use("/api/admin", adminRoutes);
app.use("/api/clubs", clubRoutes);
app.use("/api/auth", authRoutes);

app.use("/api/bookings", bookingRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/receipts", receiptRoutes);
app.use("/api/accessories", accessoryRoutes);
app.use("/api/coaches", coachRoutes);

// ✅ mount the more specific path first
app.use("/api/club/payments", clubPaymentsRoutes);

// ✅ then mount /api/club routers
app.use("/api/club", clubManageRoutes);
app.use("/api/club", clubAnalyticsRoutes);

app.get("/", (req, res) => res.json({ ok: true, msg: "Sports Hub API running" }));

const PORT = process.env.PORT || 5000;

async function start() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");
    app.listen(PORT, () =>
      console.log(`✅ Server running on http://localhost:${PORT}`)
    );
  } catch (err) {
    console.error("❌ MongoDB connection failed:", err.message);
    process.exit(1);
  }
}

start();
