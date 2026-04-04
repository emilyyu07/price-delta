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

const updateAlertSchema = z.object({
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

// UPDATE an alert for the logged-in user
router.patch(
  "/:id",
  protect,
  validate(updateAlertSchema),
  async (req: AuthRequest, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }
      
      const { id } = req.params;
      const { targetPrice } = req.body;

      if (!id || Array.isArray(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }

      const existingAlert = await prisma.priceAlert.findUnique({
        where: { id },
      });

      if (!existingAlert) {
        return res.status(404).json({ message: "Alert not found" });
      }

      if (existingAlert.userId !== req.user.id) {
        return res
          .status(403)
          .json({ message: "You are not authorized to update this alert" });
      }

      const updatedAlert = await prisma.priceAlert.update({
        where: { id },
        data: { targetPrice: new Decimal(targetPrice) },
      });

      res.json({ success: true, message: "Alert updated!", alert: updatedAlert });
    } catch (error) {
      next(error);
    }
  }
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

    // Import the timing test utility
    const { testNotificationTiming } = await import("../utils/testNotificationTiming.js");

    console.log(
      `\n[API] Test alert triggered via API by ${req.user.email} for alert ${id}`,
    );

    // Run the timing test
    const result = await testNotificationTiming(id);

    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to trigger test alert",
        error: result.error,
      });
    }

    res.json({
      success: true,
      message: `Test alert triggered successfully!`,
      details: {
        product: alert.product.title,
        targetPrice: alert.targetPrice ? Number(alert.targetPrice) : null,
        emailSentTo: alert.user.email,
        notificationId: result.notificationId,
        executionTimeMs: result.timings[result.timings.length - 1]?.durationMs,
      },
      timings: result.timings,
      info: {
        message: "Notification created successfully",
        ssePollingInterval: "30 seconds",
        expectedClientReceipt: "0-30 seconds from now",
        tip: "Check your browser console for SSE timing logs",
      },
    });
  } catch (error) {
    next(error);
  }
});

export default router;
