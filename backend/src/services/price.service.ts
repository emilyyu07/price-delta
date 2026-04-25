/*

Price monitoring service:
- saveScrapedPrice(listingId, newPrice): 
  Saves the newly scraped price to the database and triggers alert checks

*/
import prisma from "../config/prisma.js";
import { checkAlertsForProduct } from "../workers/alertChecker.js";

export async function saveScrapedPrice(
  listingId: string,
  newPrice: number,
  imageUrl?: string,
  title?: string,
) {
  try {
    let productId: string = "";

    // Start the transaction
    await prisma.$transaction(async (tx) => {
      // 1. UPDATE the current price on the listing
      const updatedListing = await tx.productListing.update({
        where: { id: listingId },
        data: { currentPrice: newPrice, isActive: true },
        include: { product: true },
      });

      productId = updatedListing.productId;

      if (imageUrl) {
        await tx.product.update({
          where: { id: updatedListing.productId },
          data: { imageUrl: imageUrl },
        });
      }

      if (title) {
        await tx.product.update({
          where: { id: updatedListing.productId },
          data: { title: title },
        });
      }

      // 2. INSERT the new datapoint into the history graph
      await tx.priceHistory.create({
        data: {
          listingId: listingId,
          price: newPrice,
          // currency defaults to "USD" or "CAD" based on your schema
          // timestamp defaults to now()
        },
      });
    });

    console.log(
      `Successfully saved new price: $${newPrice} for listing ${listingId}`,
    );

    // 3. TRIGGER ALERT CHECKS (outside transaction for performance)
    if (productId) {
      console.log(
        `[Alert Engine] Checking alerts for product ${productId} at $${newPrice}`,
      );
      await checkAlertsForProduct(productId, newPrice);
    }
  } catch (error) {
    console.error(
      `Transaction failed! Rolling back changes for listing ${listingId}`,
      error,
    );
    throw error;
  }
}
