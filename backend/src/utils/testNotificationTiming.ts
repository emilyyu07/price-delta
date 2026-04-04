/**
 * Test Notification Timing Utility
 * 
 * This script helps test the SSE notification pipeline end-to-end.
 * It simulates a price drop alert and measures timing at each step.
 * 
 * Usage:
 *   tsx src/utils/testNotificationTiming.ts <alertId>
 * 
 * Or via API:
 *   POST /api/alerts/:id/test
 */

import prisma from "../config/prisma.js";
import { checkAlertsForProduct } from "../workers/alertChecker.js";

interface TimingResult {
  step: string;
  timestamp: string;
  durationMs?: number;
}

export async function testNotificationTiming(alertId: string): Promise<{
  success: boolean;
  timings: TimingResult[];
  notificationId?: string;
  error?: string;
}> {
  const timings: TimingResult[] = [];
  const startTime = Date.now();

  try {
    // Step 1: Fetch alert
    timings.push({ 
      step: "Start", 
      timestamp: new Date().toISOString() 
    });

    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
      include: { product: true, user: true },
    });

    if (!alert) {
      return {
        success: false,
        timings,
        error: "Alert not found",
      };
    }

    timings.push({
      step: "Alert fetched from DB",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    });

    // Step 2: Calculate test price
    const fakePrice = alert.targetPrice
      ? Math.max(Number(alert.targetPrice) - 1, 0.01)
      : 1.0;

    console.log(
      `\n${"=".repeat(60)}\n` +
      `[Test] Starting notification timing test\n` +
      `${"=".repeat(60)}\n` +
      `Alert ID: ${alertId}\n` +
      `User: ${alert.user.email}\n` +
      `Product: ${alert.product.title}\n` +
      `Target Price: $${alert.targetPrice}\n` +
      `Test Price: $${fakePrice}\n` +
      `${"=".repeat(60)}\n`
    );

    // Step 3: Clear anti-spam fields
    await prisma.priceAlert.update({
      where: { id: alertId },
      data: { lastNotifiedPrice: null, lastNotifiedAt: null },
    });

    timings.push({
      step: "Anti-spam fields cleared",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    });

    // Step 4: Trigger alert (this will create notification)
    const triggerStartTime = Date.now();
    await checkAlertsForProduct(alert.productId, fakePrice);
    const triggerDuration = Date.now() - triggerStartTime;

    timings.push({
      step: "Alert check completed",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    });

    // Step 5: Fetch the created notification
    const notification = await prisma.notification.findFirst({
      where: {
        userId: alert.userId,
        alertId: alertId,
      },
      orderBy: { createdAt: "desc" },
    });

    timings.push({
      step: "Notification fetched from DB",
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    });

    const totalDuration = Date.now() - startTime;

    // Print detailed timing report
    console.log(
      `\n${"=".repeat(60)}\n` +
      `TIMING REPORT\n` +
      `${"=".repeat(60)}\n`
    );
    
    timings.forEach((timing, index) => {
      const duration = timing.durationMs !== undefined ? `(+${timing.durationMs}ms)` : "";
      console.log(`${index + 1}. ${timing.step.padEnd(35)} ${duration}`);
    });

    console.log(
      `\n${"=".repeat(60)}\n` +
      `SUMMARY\n` +
      `${"=".repeat(60)}\n` +
      `✅ Notification created: ${notification?.id || "N/A"}\n` +
      `⏱️  Alert trigger time: ${triggerDuration}ms\n` +
      `⏱️  Total execution time: ${totalDuration}ms\n` +
      `📅 Notification timestamp: ${notification?.createdAt.toISOString() || "N/A"}\n` +
      `\n` +
      `⚠️  NOTE: SSE polling happens every 30 seconds.\n` +
      `   Clients will receive this notification on the next poll.\n` +
      `   Expected client receipt: within 0-30 seconds from now.\n` +
      `${"=".repeat(60)}\n`
    );

    return {
      success: true,
      timings,
      notificationId: notification?.id,
    };
  } catch (error) {
    console.error("[Test] Error during timing test:", error);
    return {
      success: false,
      timings,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// Allow direct execution via command line
// Check if this file is being run directly (not imported)
const isMainModule = process.argv[1]?.replace(/\\/g, "/").endsWith("testNotificationTiming.ts");

if (isMainModule) {
  const alertId = process.argv[2];
  
  if (!alertId) {
    console.error("Usage: tsx src/utils/testNotificationTiming.ts <alertId>");
    process.exit(1);
  }

  testNotificationTiming(alertId)
    .then(() => {
      console.log("\n✅ Test complete. Check your SSE connection logs.");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n❌ Test failed:", error);
      process.exit(1);
    });
}
