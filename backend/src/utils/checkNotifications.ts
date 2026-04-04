/**
 * Check notification and email status
 */

import prisma from "../config/prisma.js";

async function checkNotifications() {
  const notifications = await prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      user: true,
      alert: {
        include: {
          product: true
        }
      }
    }
  });

  console.log("\n" + "=".repeat(60));
  console.log("RECENT NOTIFICATIONS & EMAIL STATUS");
  console.log("=".repeat(60));
  console.log(`\nFound ${notifications.length} notifications:\n`);

  notifications.forEach((n, i) => {
    console.log(`${i + 1}. Created: ${n.createdAt.toISOString()}`);
    console.log(`   User: ${n.user.email}`);
    console.log(`   Product: ${n.alert?.product.title || 'N/A'}`);
    console.log(`   Message: ${n.message}`);
    console.log(`   Read: ${n.isRead ? 'Yes' : 'No'}`);
    console.log("");
  });

  console.log("=".repeat(60));
  console.log("\n📧 EMAIL STATUS:");
  console.log("   The email sending happens ASYNCHRONOUSLY after notification");
  console.log("   creation, so there's no direct tracking in the database.");
  console.log("\n   To verify emails were sent:");
  console.log("   1. Check Gmail inbox for: pricedeltanotif@gmail.com");
  console.log("   2. Check spam/junk folder");
  console.log("   3. Gmail might delay emails by 1-5 minutes");
  console.log("   4. Search in Gmail: from:pricedeltanotif@gmail.com");
  console.log("\n   Each notification above SHOULD have triggered an email");
  console.log("   to the user's email address.");
  console.log("=".repeat(60) + "\n");

  await prisma.$disconnect();
}

checkNotifications();
