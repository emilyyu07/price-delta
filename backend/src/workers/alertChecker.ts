import prisma from "../config/prisma.js";
import { sendPriceDropEmail } from "../config/mail.js";

export async function checkAlertsForProduct(
  productId: string,
  newPrice: number,
) {
  try {
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
            `[Alert Engine] User ${alert.user.email} already notified about $${newPrice}. Skipping.`,
          );
          continue;
        }

        console.log(
          `[Alert Engine] 🚨 ALERT TRIGGERED for User ${alert.user.email}!`,
        );

        // Get product URL directly from product model
        const productUrl = alert.product.url || "https://www.aritzia.com";

        // Update the database first
        await prisma.$transaction([
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

        // send the email
        if (alert.user.email) {
          sendPriceDropEmail(
            alert.user.email,
            alert.product.title,
            newPrice,
            productUrl,
          ).catch((err) => console.error("Email error:", err));
        }
      }
    }
  } catch (error) {
    console.error("[Alert Engine] Failed to check alerts:", error);
  }
}
