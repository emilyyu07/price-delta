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
  const userEmail = req.user.email;
  
  // Set headers for SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': env.FRONTEND_URL,
    'Access-Control-Allow-Credentials': 'true',
    'X-Accel-Buffering': 'no' // Disable nginx buffering
  });

  console.log(`[SSE] ✅ User ${userEmail} (${userId}) connected to notification stream`);

  // Send initial connection message with timestamp
  const connectionMsg = {
    type: 'connected',
    message: 'Connected to notification stream',
    timestamp: new Date().toISOString(),
    userId: userId
  };
  res.write(`data: ${JSON.stringify(connectionMsg)}\n\n`);

  // Function to send notifications
  const sendNotification = async () => {
    try {
      const queryStartTime = Date.now();
      
      const notifications = await prisma.notification.findMany({
        where: { 
          userId: userId,
          isRead: false 
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      });

      const queryDuration = Date.now() - queryStartTime;

      const payload = {
        type: 'notifications',
        data: notifications,
        timestamp: new Date().toISOString(),
        serverProcessingTime: queryDuration,
        count: notifications.length
      };

      res.write(`data: ${JSON.stringify(payload)}\n\n`);

      if (notifications.length > 0) {
        console.log(`[SSE] 📨 Sent ${notifications.length} notification(s) to ${userEmail} (query took ${queryDuration}ms)`);
      }
    } catch (error) {
      console.error(`[SSE] ❌ Error fetching notifications for ${userEmail}:`, error);
    }
  };

  // Initial fetch
  sendNotification();

  // Set up polling every 30 seconds (configurable via query param for testing)
  const pollInterval = parseInt(req.query.pollInterval as string) || 30000;
  const interval = setInterval(sendNotification, pollInterval);

  console.log(`[SSE] Polling every ${pollInterval}ms for user ${userEmail}`);

  // Send heartbeat every 15 seconds to keep connection alive
  const heartbeatInterval = setInterval(() => {
    res.write(`:heartbeat ${new Date().toISOString()}\n\n`);
  }, 15000);

  // Clean up on client disconnect
  req.on('close', () => {
    clearInterval(interval);
    clearInterval(heartbeatInterval);
    console.log(`[SSE] ❌ User ${userEmail} (${userId}) disconnected from notification stream`);
  });
});

export default router;
