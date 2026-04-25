/*
Email alert checker worker:
- checkAlertsForProduct(productId, newPrice): 
  Checks all active alerts for the given product and triggers notifications if conditions are met
- Includes anti-spam logic to prevent multiple notifications for the same price point
*/
import prisma from "../config/prisma.js";
import { sendPriceDropEmail } from "../config/mail.js";

export async function checkAlertsForProduct(
  productId: string,
  newPrice: number,
) {
  try {
    const checkStartTime = Date.now();

    const alerts = await prisma.priceAlert.findMany({
      where: {
        productId: productId,
        isActive: true,
      },
      include: {
        user: true,
        product: true,
      },
    });

    console.log(
      `[Alert Engine] Found ${alerts.length} active alert(s) for product ${productId}`,
    );

    for (const alert of alerts) {
      let triggered = false;

      // Check target price condition
      if (alert.targetPrice && newPrice <= Number(alert.targetPrice)) {
        triggered = true;
      }

      if (triggered) {
        // Anti-spam check
        if (
          alert.lastNotifiedPrice &&
          Number(alert.lastNotifiedPrice) === newPrice
        ) {
          console.log(
            `[Alert Engine] ⏭️  User ${alert.user.email} already notified about $${newPrice}. Skipping.`,
          );
          continue;
        }

        console.log(
          `[Alert Engine] 🚨 ALERT TRIGGERED for User ${alert.user.email}! (Target: $${alert.targetPrice}, New: $${newPrice})`,
        );

        // Get product URL directly from product model
        const productUrl = alert.product.url || "https://www.aritzia.com";

        const dbStartTime = Date.now();

        // Update the database first
        const [notification] = await prisma.$transaction([
          prisma.notification.create({
            data: {
              userId: alert.userId,
              alertId: alert.id,
              type: "PRICE_DROP",
              title: "Price Drop Alert! 🎉",
              message: `Great news! ${alert.product.title} has dropped to $${newPrice}!`,
              isRead: false,
            },
          }),
          prisma.priceAlert.update({
            where: { id: alert.id },
            data: {
              lastNotifiedPrice: newPrice,
              lastNotifiedAt: new Date(),
            },
          }),
        ]);

        const dbDuration = Date.now() - dbStartTime;
        console.log(
          `[Alert Engine] 💾 Notification created in DB (took ${dbDuration}ms) - ID: ${notification.id}, Timestamp: ${notification.createdAt.toISOString()}`,
        );

        // send the email (non-blocking)
        if (alert.user.email) {
          sendPriceDropEmail(
            alert.user.email,
            alert.product.title,
            newPrice,
            productUrl,
          ).catch((err) => console.error("Email error:", err));
        }

        const totalDuration = Date.now() - checkStartTime;
        console.log(
          `[Alert Engine] ✅ Alert processing complete (total: ${totalDuration}ms)`,
        );
      }
    }
  } catch (error) {
    console.error("[Alert Engine] Failed to check alerts:", error);
  }
}
