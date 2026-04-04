/**
 * Debug version of notification timing test
 */

console.log("Script started!");
console.log("Arguments:", process.argv);
console.log("CWD:", process.cwd());

import prisma from "../config/prisma.js";
import { checkAlertsForProduct } from "../workers/alertChecker.js";

const alertId = process.argv[2];

console.log(`\n${"=".repeat(60)}`);
console.log("SSE NOTIFICATION TIMING TEST - DEBUG MODE");
console.log("=".repeat(60));
console.log(`Alert ID: ${alertId}`);

if (!alertId) {
  console.error("\n❌ ERROR: No alert ID provided");
  console.error("Usage: npx tsx src/utils/testNotificationTimingDebug.ts <alertId>");
  process.exit(1);
}

async function runTest() {
  try {
    console.log("\n[1/6] Connecting to database...");
    
    const alert = await prisma.priceAlert.findUnique({
      where: { id: alertId },
      include: { product: true, user: true },
    });

    if (!alert) {
      console.error(`\n❌ ERROR: Alert not found with ID: ${alertId}`);
      await prisma.$disconnect();
      process.exit(1);
    }

    console.log(`[2/6] ✅ Alert found:`);
    console.log(`      User: ${alert.user.email}`);
    console.log(`      Product: ${alert.product.title}`);
    console.log(`      Target: $${alert.targetPrice}`);

    const fakePrice = alert.targetPrice
      ? Math.max(Number(alert.targetPrice) - 1, 0.01)
      : 1.0;

    console.log(`\n[3/6] Calculated test price: $${fakePrice}`);

    console.log(`\n[4/6] Clearing anti-spam fields...`);
    await prisma.priceAlert.update({
      where: { id: alertId },
      data: { lastNotifiedPrice: null, lastNotifiedAt: null },
    });
    console.log(`      ✅ Cleared`);

    console.log(`\n[5/6] Triggering alert check...`);
    const startTime = Date.now();
    await checkAlertsForProduct(alert.productId, fakePrice);
    const duration = Date.now() - startTime;
    console.log(`      ✅ Completed in ${duration}ms`);

    console.log(`\n[6/6] Fetching created notification...`);
    const notification = await prisma.notification.findFirst({
      where: {
        userId: alert.userId,
        alertId: alertId,
      },
      orderBy: { createdAt: "desc" },
    });

    if (notification) {
      console.log(`      ✅ Notification created:`);
      console.log(`         ID: ${notification.id}`);
      console.log(`         Title: ${notification.title}`);
      console.log(`         Created: ${notification.createdAt.toISOString()}`);
    } else {
      console.log(`      ⚠️  No notification found (might not have triggered)`);
    }

    console.log(`\n${"=".repeat(60)}`);
    console.log("✅ TEST COMPLETE");
    console.log("=".repeat(60));
    console.log(`\n⏱️  Total execution time: ${Date.now() - startTime}ms`);
    console.log(`📧 Email sent to: ${alert.user.email}`);
    console.log(`\n⚠️  SSE NOTE: Clients will receive this notification`);
    console.log(`   within 0-30 seconds (depends on polling interval).`);
    console.log(`${"=".repeat(60)}\n`);

    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error("\n❌ TEST FAILED:");
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

runTest();
