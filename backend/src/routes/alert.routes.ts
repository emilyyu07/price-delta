import { Router } from "express";
import prisma from "../config/prisma.js";
import { Decimal } from "@prisma/client/runtime/library";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { z } from "zod";

const router = Router();
const createAlertSchema = z.object({
  productId: z.string().uuid("productId must be a valid UUID."),
  targetPrice: z.number().positive("Target price must be positive."),
});

// GET all alerts for the logged-in user
router.get("/", protect, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    const alerts = await prisma.priceAlert.findMany({
      where: { userId: req.user.id },
      include: { product: true },
    });
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});

// CREATE an alert for the logged-in user
router.post(
  "/",
  protect,
  validate(createAlertSchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.user) {
        return res
          .status(401)
          .json({ message: "Not authorized, user not found" });
      }
      const { productId, targetPrice } = req.body;

      const alert = await prisma.priceAlert.create({
        data: {
          userId: req.user.id,
          productId: productId,
          targetPrice: new Decimal(targetPrice),
          isActive: true,
        },
      });

      res.status(201).json({ success: true, message: "Alert set!", alert });
    } catch (error) {
      next(error);
    }
  },
);

// DELETE an alert for the logged-in user
router.delete("/:id", protect, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "Invalid alert ID" });
    }

    const alert = await prisma.priceAlert.findUnique({
      where: { id },
    });

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    if (alert.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to delete this alert" });
    }

    await prisma.priceAlert.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// TEST endpoint — simulate a price drop to verify the full notification pipeline
// Only available in development mode
router.post("/:id/test", protect, async (req: AuthRequest, res, next) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Test endpoint disabled in production" });
    }

    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }

    const { id } = req.params;

    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "Invalid alert ID" });
    }

    const alert = await prisma.priceAlert.findUnique({
      where: { id },
      include: { product: true, user: true },
    });

    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }

    if (alert.userId !== req.user.id) {
      return res
        .status(403)
        .json({ message: "You are not authorized to test this alert" });
    }

    // Use a fake price guaranteed to trigger: targetPrice - 1, or $1 if no target
    const fakePrice = alert.targetPrice
      ? Math.max(Number(alert.targetPrice) - 1, 0.01)
      : 1.0;

    console.log(
      `[Test Alert] Simulating price drop to $${fakePrice} for product "${alert.product.title}" (alert ${id})`,
    );

    // Import and call the alert checker directly
    const { checkAlertsForProduct } = await import("../workers/alertChecker.js");

    // Temporarily clear lastNotifiedPrice so the anti-spam check doesn't block us
    await prisma.priceAlert.update({
      where: { id },
      data: { lastNotifiedPrice: null, lastNotifiedAt: null },
    });

    await checkAlertsForProduct(alert.productId, fakePrice);

    res.json({
      success: true,
      message: `Test alert triggered! Simulated price: $${fakePrice}`,
      details: {
        product: alert.product.title,
        targetPrice: alert.targetPrice ? Number(alert.targetPrice) : null,
        simulatedPrice: fakePrice,
        emailSentTo: alert.user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
