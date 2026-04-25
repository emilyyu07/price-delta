/*
Notifcation Routes:
- mounted on /api/notifications
- GET /api/notifications: Get all notifications for the logged-in user
- PATCH /api/notifications/:id/read: Mark a notification as read

Handles in app inbox notifications for price alerts, etc.

*/
import { Router } from "express";
import prisma from "../config/prisma.js";
import { protect } from "../middleware/auth.middleware.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";

const router = Router();

// GET all notifications for the logged-in user
router.get("/", protect, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { alert: { include: { product: true } } },
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});

// MARK a notification as read
router.patch("/:id/read", protect, async (req: AuthRequest, res, next) => {
  try {
    if (!req.user) {
      return res
        .status(401)
        .json({ message: "Not authorized, user not found" });
    }
    const { id } = req.params as { id: string };
    const userId = req.user.id;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }

    if (notification.userId !== userId) {
      return res.status(403).json({
        message: "You are not authorized to update this notification",
      });
    }

    const updatedNotification = await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    res.json(updatedNotification);
  } catch (error) {
    next(error);
  }
});

export default router;
