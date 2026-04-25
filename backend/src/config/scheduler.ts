import cron from "node-cron";
import prisma from "./prisma.js";
import { scrapeQueue } from "../queue/priceQueue.js";

export const initScheduledJobs = () => {
  console.log("Scheduled Jobs Initialized: Pulse engine active.");

  // Run every 4 hours instead of daily (0 */4 * * *)
  cron.schedule("0 */4 * * *", async () => {
    console.log("[CRON] Waking up to check all tracked prices...");

    try {
      //find all active/tracked product listings
      const activeListings = await prisma.productListing.findMany({
        where: { isActive: true },
        select: { id: true, url: true },
      });

      console.log(
        `[CRON] Found ${activeListings.length} active listings to check.`,
      );

      // push to redis Queue with staggered delays to prevent overwhelming
      let queuedCount = 0;
      for (let i = 0; i < activeListings.length; i++) {
        const listing = activeListings[i];
        if (listing?.url) {
          // Add delay to stagger requests (2 seconds between each)
          await scrapeQueue.add(
            "periodic-scrape",
            {
              productUrl: listing.url,
              listingId: listing.id,
            },
            {
              delay: i * 2000, // 2 second delay between each job
            },
          );
          queuedCount++;
        }
      }

      console.log(
        `[CRON] Successfully queued ${queuedCount} scrape jobs with staggered delays.`,
      );
    } catch (error) {
      console.error("[CRON] Critical failure during periodic schedule:", error);
    }
  });

  // Add a quick sync for recently added products (every 30 minutes)
  cron.schedule("*/30 * * * *", async () => {
    console.log("[CRON] Quick sync for recent products...");
    try {
      // Find products added in the last 24 hours that haven't been updated recently
      const recentListings = await prisma.productListing.findMany({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
          },
        },
        select: { id: true, url: true },
      });

      for (const listing of recentListings) {
        if (listing.url) {
          await scrapeQueue.add("recent-sync", {
            productUrl: listing.url,
            listingId: listing.id,
          });
        }
      }

      console.log(`[CRON] Synced ${recentListings.length} recent products.`);
    } catch (error) {
      console.error("[CRON] Quick sync failed:", error);
    }
  });
};
