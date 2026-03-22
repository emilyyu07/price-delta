import "dotenv/config";
import { Queue, Worker, Job } from "bullmq";
import { env } from "../config/env.js";
import { scrapeAritziaPrice } from "../workers/scrapers/aritziaScraper.js";
import { saveScrapedPrice } from "../services/price.service.js";

// establish connection to Redis
// Prefer REDIS_URL (for Upstash/production) over host/port (for local Docker)
const redisConnectionOptions = env.REDIS_URL
  ? {
      // Upstash TLS connection
      host: new URL(env.REDIS_URL).hostname,
      port: parseInt(new URL(env.REDIS_URL).port) || 6379,
      password: new URL(env.REDIS_URL).password || undefined,
      tls: {
        rejectUnauthorized: false,
      },
      maxRetriesPerRequest: null,
    }
  : {
      // Local Docker connection
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      maxRetriesPerRequest: null,
    };

// create queue
export const scrapeQueue = new Queue("price-scrape-queue", {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 10000,
    },
    removeOnComplete: 100,
    removeOnFail: 100,
  },
});

export const createScrapeWorker = () => {
  const scrapeWorker = new Worker(
    "price-scrape-queue",
    async (job: Job) => {
      const { productUrl, listingId } = job.data;

      console.log(`[Worker] Picked up job ${job.id} for listing ${listingId}`);

      const scrapeResult = await scrapeAritziaPrice(productUrl);
      const newPrice = scrapeResult.price;
      const imageUrl = scrapeResult.imageUrl ?? undefined;
      const title = scrapeResult.title ?? undefined;

      await saveScrapedPrice(listingId, newPrice, imageUrl, title);
      return scrapeResult;
    },
    {
      connection: redisConnectionOptions,
      concurrency: 1,
    },
  );

  scrapeWorker.on("completed", (job) => {
    console.log(`✅ [Worker] Job ${job.id} completed successfully`);
  });

  scrapeWorker.on("failed", (job, err) => {
    console.error(`❌ [Worker] Job ${job?.id} failed:`, err.message);
    if (job?.data) {
      console.error(`Failed URL: ${job.data.productUrl}`);
      console.error(`Listing ID: ${job.data.listingId}`);
    }
  });

  scrapeWorker.on("error", (err) => {
    console.error(`🚨 [Worker] Worker error:`, err);
  });

  const monitorInterval = setInterval(async () => {
    try {
      const waiting = await scrapeQueue.getWaiting();
      const active = await scrapeQueue.getActive();
      const completed = await scrapeQueue.getCompleted();
      const failed = await scrapeQueue.getFailed();

      console.log(
        `📊 [Queue Status] Waiting: ${waiting.length}, Active: ${active.length}, Completed: ${completed.length}, Failed: ${failed.length}`,
      );

      if (waiting.length > 5) {
        console.warn(
          `⚠️ [Queue Alert] ${waiting.length} jobs waiting - possible bottleneck`,
        );
      }
    } catch (error) {
      console.error(`❌ [Queue Monitoring] Error:`, error);
    }
  }, 10000);

  return { scrapeWorker, monitorInterval };
};
