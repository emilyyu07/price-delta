import { Router } from "express";
import prisma from "../config/prisma.js";
import { protect } from "../middleware/auth.middleware.js";
import type { AuthRequest } from "../middleware/auth.middleware.js";
import { env } from "../config/env.js";

const router = Router();

// Server-Sent Events endpoint for real-time notifications
router.get("/", protect, (req: AuthRequest, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, user not found" });
  }
  const userId = req.user.id;
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': env.FRONTEND_URL,
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to notification stream' })}\n\n`);

  // Function to send notifications
  const sendNotification = async () => {
    try {
      const notifications = await prisma.notification.findMany({
        where: { 
          userId: userId,
          isRead: false 
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      res.write(`data: ${JSON.stringify({ type: 'notifications', data: notifications })}\n\n`);
    } catch (error) {
      console.error('[Notification Stream] Error fetching notifications:', error);
    }
  };

  // Initial fetch
  sendNotification();

  // Set up polling every 30 seconds
  const interval = setInterval(sendNotification, 30000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    console.log(`[Notification Stream] User ${userId} disconnected`);
  });
});

export default router;
