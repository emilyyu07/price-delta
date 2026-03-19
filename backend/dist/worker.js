// src/worker.ts
import "dotenv/config";

// src/config/prisma.ts
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
var prisma = new PrismaClient({
  log: ["error", "warn"]
});
var prisma_default = prisma;

// src/config/scheduler.ts
import cron from "node-cron";

// src/queue/priceQueue.ts
import "dotenv/config";
import { Queue, Worker } from "bullmq";

// src/config/env.ts
import "dotenv/config";
import { z } from "zod";
var envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  REDIS_HOST: z.string().default("127.0.0.1"),
  REDIS_PORT: z.coerce.number().default(6379),
  PORT: z.coerce.number().default(3001),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional()
});
var env = envSchema.parse(process.env);

// src/workers/scrapers/aritziaScraper.ts
import { chromium } from "playwright";
var globalBrowser = null;
async function scrapeAritziaPrice(productUrl) {
  console.log(`\u{1F50D} [Scraper] Starting scrape for: ${productUrl}`);
  let context = null;
  const timeout = 6e4;
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(() => {
      if (context) {
        void context.close().catch((closeError) => {
          console.warn("\u26A0\uFE0F [Scraper] Failed to close timed-out context:", closeError);
        });
        context = null;
      }
      reject(new Error("Scrape timeout after 60 seconds"));
    }, timeout);
  });
  if (globalBrowser && !globalBrowser.isConnected()) {
    console.warn("[Scraper] Browser disconnected. Relaunching browser instance.");
    await globalBrowser.close().catch(() => void 0);
    globalBrowser = null;
  }
  if (!globalBrowser) {
    console.log(`\u{1F680} [Scraper] Launching new browser instance...`);
    globalBrowser = await chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-background-timer-throttling",
        "--disable-renderer-backgrounding",
        "--disable-backgrounding-occluded-windows",
        "--memory-pressure-off",
        "--max_old_space_size=4096",
        // Anti-detection flags
        "--disable-blink-features=AutomationControlled",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor"
      ]
    });
  }
  const browser = globalBrowser;
  if (!browser) {
    throw new Error("Browser initialization failed");
  }
  const scrapeTask = async () => {
    try {
      const userAgents = [
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
      ];
      const randomUserAgent = userAgents[Math.floor(Math.random() * userAgents.length)];
      context = await browser.newContext({
        userAgent: randomUserAgent,
        viewport: { width: 1920, height: 1080 },
        deviceScaleFactor: 1,
        hasTouch: false,
        // Performance optimizations
        ignoreHTTPSErrors: true,
        bypassCSP: true,
        // Reduce resource loading for faster scraping
        javaScriptEnabled: true,
        offline: false,
        // Anti-detection measures
        locale: "en-US",
        timezoneId: "America/New_York"
      });
      const page = await context.newPage();
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "webdriver", {
          get: () => void 0
        });
        Object.defineProperty(navigator, "plugins", {
          get: () => [1, 2, 3, 4, 5]
        });
        Object.defineProperty(navigator, "languages", {
          get: () => ["en-US", "en"]
        });
      });
      await page.route(
        "**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,css}",
        (route) => {
          route.abort();
        }
      );
      await page.route("**/*.{analytics,pixel,tracking}", (route) => {
        route.abort();
      });
      console.log(`\u{1F310} [Scraper] Navigating to: ${productUrl}`);
      await page.goto(productUrl, {
        waitUntil: "domcontentloaded",
        timeout: 3e4
      });
      const randomDelay = Math.floor(Math.random() * 2500) + 1500;
      console.log(`\u23F3 [Scraper] Waiting ${randomDelay}ms to appear human...`);
      await page.waitForTimeout(randomDelay);
      const pageTitle = await page.title();
      if (pageTitle.toLowerCase().includes("robot") || pageTitle.toLowerCase().includes("blocked") || pageTitle.toLowerCase().includes("access denied")) {
        throw new Error("Bot detection detected - page blocked");
      }
      console.log(`\u{1F50D} [Scraper] Looking for price elements...`);
      const priceSelectors = [
        '[data-testid="product-list-price-text"]',
        '[data-testid="product-list-sale-text"]',
        ".price",
        ".sale-price",
        '[class*="price"]',
        '[data-test*="price"]'
      ];
      let rawPriceText = "";
      let priceFound = false;
      for (const selector of priceSelectors) {
        try {
          const element = page.locator(selector).first();
          if (await element.count() > 0) {
            rawPriceText = await element.innerText();
            console.log(
              `\u2705 [Scraper] Found price using selector "${selector}": ${rawPriceText}`
            );
            priceFound = true;
            break;
          }
        } catch (error) {
          console.log(`\u274C [Scraper] Selector "${selector}" failed:`, error);
        }
      }
      if (!priceFound) {
        const priceElements = await page.locator("text=/\\$[0-9]+\\.?[0-9]*/").all();
        const firstPriceElement = priceElements[0];
        if (firstPriceElement) {
          rawPriceText = await firstPriceElement.innerText();
          console.log(`\u2705 [Scraper] Found price using regex: ${rawPriceText}`);
          priceFound = true;
        }
      }
      if (!priceFound) {
        throw new Error(
          "DOM Parse Error: Could not find price element. Aritzia may have changed their DOM structure."
        );
      }
      console.log(
        `\u{1F4B0} [Scraper] Successfully extracted raw price string: ${rawPriceText}`
      );
      const cleanPrice = parseFloat(rawPriceText.replace(/[^0-9.]/g, ""));
      if (isNaN(cleanPrice)) {
        throw new Error(`Failed to parse price string: ${rawPriceText}`);
      }
      console.log(`\u{1F4CA} [Scraper] Parsed price: $${cleanPrice}`);
      let productTitle = null;
      try {
        const ogTitleLocator = page.locator('meta[property="og:title"]').first();
        const ogTitle = await ogTitleLocator.count() > 0 ? await ogTitleLocator.getAttribute("content", { timeout: 2e3 }) : null;
        if (ogTitle) {
          productTitle = ogTitle;
          console.log(`\u{1F4DD} [Scraper] Found OG title: ${productTitle}`);
        }
        if (!productTitle) {
          const h1Title = await page.locator('h1[data-testid="product-title"], h1.product-title, h1').first().innerText();
          if (h1Title) {
            productTitle = h1Title.trim();
            console.log(`\u{1F4DD} [Scraper] Found H1 title: ${productTitle}`);
          }
        }
        if (!productTitle) {
          const pageTitle2 = await page.title();
          if (pageTitle2) {
            productTitle = pageTitle2.replace(/Aritzia/gi, "").replace(/\|.*$/, "").replace(/^\s+|\s+$/g, "").trim();
            if (productTitle) {
              console.log(`\u{1F4DD} [Scraper] Found page title: ${productTitle}`);
            }
          }
        }
      } catch (err) {
        console.warn("\u26A0\uFE0F [Scraper] Could not extract product title:", err);
      }
      let imageUrl = null;
      try {
        const ogImageLocator = page.locator('meta[property="og:image"]').first();
        let ogImage = await ogImageLocator.count() > 0 ? await ogImageLocator.getAttribute("content", { timeout: 2e3 }) : null;
        if (ogImage) {
          if (ogImage.startsWith("//")) {
            ogImage = "https:" + ogImage;
          } else if (ogImage.startsWith("/")) {
            ogImage = "https://www.aritzia.com" + ogImage;
          }
          imageUrl = ogImage;
          console.log(`\u{1F5BC}\uFE0F [Scraper] Found OG image: ${imageUrl}`);
        }
        if (!imageUrl) {
          const twitterImageLocator = page.locator('meta[name="twitter:image"]').first();
          const twitterImage = await twitterImageLocator.count() > 0 ? await twitterImageLocator.getAttribute("content", { timeout: 2e3 }) : null;
          if (twitterImage) {
            if (twitterImage.startsWith("//")) {
              imageUrl = "https:" + twitterImage;
            } else if (twitterImage.startsWith("/")) {
              imageUrl = "https://www.aritzia.com" + twitterImage;
            } else {
              imageUrl = twitterImage;
            }
            console.log(`\u{1F5BC}\uFE0F [Scraper] Found Twitter image: ${imageUrl}`);
          }
        }
        if (!imageUrl) {
          const productImageLocator = page.locator(
            'img[alt*="product"], img[data-testid="product-image"], .product-image img'
          ).first();
          const productImage = await productImageLocator.count() > 0 ? await productImageLocator.getAttribute("src", { timeout: 2e3 }) : null;
          if (productImage) {
            if (productImage.startsWith("//")) {
              imageUrl = "https:" + productImage;
            } else if (productImage.startsWith("/")) {
              imageUrl = "https://www.aritzia.com" + productImage;
            } else {
              imageUrl = productImage;
            }
            console.log(`\u{1F5BC}\uFE0F [Scraper] Found product image: ${imageUrl}`);
          }
        }
        if (!imageUrl) {
          const images = await page.locator("img").all();
          for (const img of images.slice(0, 5)) {
            const src = await img.getAttribute("src");
            const alt = await img.getAttribute("alt");
            if (src && (alt?.toLowerCase().includes("product") || src.includes("product"))) {
              if (src.startsWith("//")) {
                imageUrl = "https:" + src;
              } else if (src.startsWith("/")) {
                imageUrl = "https://www.aritzia.com" + src;
              } else {
                imageUrl = src;
              }
              console.log(`\u{1F5BC}\uFE0F [Scraper] Found fallback image: ${imageUrl}`);
              break;
            }
          }
        }
      } catch (err) {
        console.warn("\u26A0\uFE0F [Scraper] Could not find product image:", err);
      }
      console.log(`\u2705 [Scraper] Scrape completed successfully!`);
      return {
        price: cleanPrice,
        imageUrl,
        title: productTitle
      };
    } catch (error) {
      console.error(
        `\u274C [Scraper] Failed to scrape Aritzia: ${productUrl}`,
        error
      );
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          throw new Error(
            "Scrape timeout - Aritzia might be slow or blocking us"
          );
        } else if (error.message.includes("bot detection")) {
          throw new Error("Bot detection detected - Aritzia has blocked us");
        } else if (error.message.includes("DOM Parse Error")) {
          throw new Error("DOM structure changed - need to update selectors");
        }
      }
      throw new Error("Scrape failed. Target is blocking or structure changed.");
    } finally {
      if (context) {
        await context.close();
      }
      console.log(`\u{1F9F9} [Scraper] Context closed`);
    }
  };
  try {
    return await Promise.race([scrapeTask(), timeoutPromise]);
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }
}

// src/config/mail.ts
import nodemailer from "nodemailer";
var transporter = nodemailer.createTransport({
  host: env.SMTP_HOST,
  // smtp.gmail.com
  port: env.SMTP_PORT || 587,
  secure: false,
  auth: {
    user: env.SMTP_USER,
    // pricedeltanotif@gmail.com
    pass: env.SMTP_PASS
    // app pw
  }
});
var sendPriceDropEmail = async (toEmail, productName, newPrice, productUrl) => {
  try {
    const info = await transporter.sendMail({
      from: `"PriceDelta Alerts" <${env.SMTP_USER}>`,
      to: toEmail,
      subject: `\u{1F6A8} Price Drop: ${productName} is now $${newPrice}!`,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>Great news from PriceDelta!</h2>
          <p>The item you are tracking just dropped in price.</p>
          <p><strong>${productName}</strong> is now available for <strong>$${newPrice}</strong>.</p>
          <a href="${productUrl}" style="background-color: #0284c7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 15px;">
            Buy it now
          </a>
          <p style="color: #9ca3af; font-size: 12px; margin-top: 30px;">
            You are receiving this because you set a price alert on PriceDelta.
          </p>
        </div>
      `
    });
    console.log(
      `[Mailer] Email sent successfully to ${toEmail}. Message ID: ${info.messageId}`
    );
  } catch (error) {
    console.error(`[Mailer] Failed to send email to ${toEmail}:`, error);
  }
};

// src/workers/alertChecker.ts
async function checkAlertsForProduct(productId, newPrice) {
  try {
    const alerts = await prisma_default.priceAlert.findMany({
      where: {
        productId,
        isActive: true
      },
      include: {
        user: true,
        product: true
      }
    });
    for (const alert of alerts) {
      let triggered = false;
      if (alert.targetPrice && newPrice <= Number(alert.targetPrice)) {
        triggered = true;
      }
      if (triggered) {
        if (alert.lastNotifiedPrice && Number(alert.lastNotifiedPrice) === newPrice) {
          console.log(
            `[Alert Engine] User ${alert.user.email} already notified about $${newPrice}. Skipping.`
          );
          continue;
        }
        console.log(
          `[Alert Engine] \u{1F6A8} ALERT TRIGGERED for User ${alert.user.email}!`
        );
        const productUrl = alert.product.url || "https://www.aritzia.com";
        await prisma_default.$transaction([
          prisma_default.notification.create({
            data: {
              userId: alert.userId,
              alertId: alert.id,
              type: "PRICE_DROP",
              title: "Price Drop Alert! \u{1F389}",
              message: `Great news! ${alert.product.title} has dropped to $${newPrice}!`,
              isRead: false
            }
          }),
          prisma_default.priceAlert.update({
            where: { id: alert.id },
            data: {
              lastNotifiedPrice: newPrice,
              lastNotifiedAt: /* @__PURE__ */ new Date()
            }
          })
        ]);
        if (alert.user.email) {
          sendPriceDropEmail(
            alert.user.email,
            alert.product.title,
            newPrice,
            productUrl
          ).catch((err) => console.error("Email error:", err));
        }
      }
    }
  } catch (error) {
    console.error("[Alert Engine] Failed to check alerts:", error);
  }
}

// src/services/price.service.ts
async function saveScrapedPrice(listingId, newPrice, imageUrl, title) {
  try {
    let productId = "";
    await prisma_default.$transaction(async (tx) => {
      const updatedListing = await tx.productListing.update({
        where: { id: listingId },
        data: { currentPrice: newPrice, isActive: true },
        include: { product: true }
      });
      productId = updatedListing.productId;
      if (imageUrl) {
        await tx.product.update({
          where: { id: updatedListing.productId },
          data: { imageUrl }
        });
      }
      if (title) {
        await tx.product.update({
          where: { id: updatedListing.productId },
          data: { title }
        });
      }
      await tx.priceHistory.create({
        data: {
          listingId,
          price: newPrice
          // currency defaults to "USD" or "CAD" based on your schema
          // timestamp defaults to now()
        }
      });
    });
    console.log(
      `Successfully saved new price: $${newPrice} for listing ${listingId}`
    );
    if (productId) {
      console.log(
        `[Alert Engine] Checking alerts for product ${productId} at $${newPrice}`
      );
      await checkAlertsForProduct(productId, newPrice);
    }
  } catch (error) {
    console.error(
      `Transaction failed! Rolling back changes for listing ${listingId}`,
      error
    );
    throw error;
  }
}

// src/queue/priceQueue.ts
var redisConnectionOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  maxRetriesPerRequest: null
};
var scrapeQueue = new Queue("price-scrape-queue", {
  connection: redisConnectionOptions,
  defaultJobOptions: {
    attempts: 2,
    backoff: {
      type: "exponential",
      delay: 1e4
    },
    removeOnComplete: 100,
    removeOnFail: 100
  }
});
var createScrapeWorker = () => {
  const scrapeWorker2 = new Worker(
    "price-scrape-queue",
    async (job) => {
      const { productUrl, listingId } = job.data;
      console.log(`[Worker] Picked up job ${job.id} for listing ${listingId}`);
      const scrapeResult = await scrapeAritziaPrice(productUrl);
      const newPrice = scrapeResult.price;
      const imageUrl = scrapeResult.imageUrl ?? void 0;
      const title = scrapeResult.title ?? void 0;
      await saveScrapedPrice(listingId, newPrice, imageUrl, title);
      return scrapeResult;
    },
    {
      connection: redisConnectionOptions,
      concurrency: 1
    }
  );
  scrapeWorker2.on("completed", (job) => {
    console.log(`\u2705 [Worker] Job ${job.id} completed successfully`);
  });
  scrapeWorker2.on("failed", (job, err) => {
    console.error(`\u274C [Worker] Job ${job?.id} failed:`, err.message);
    if (job?.data) {
      console.error(`Failed URL: ${job.data.productUrl}`);
      console.error(`Listing ID: ${job.data.listingId}`);
    }
  });
  scrapeWorker2.on("error", (err) => {
    console.error(`\u{1F6A8} [Worker] Worker error:`, err);
  });
  const monitorInterval2 = setInterval(async () => {
    try {
      const waiting = await scrapeQueue.getWaiting();
      const active = await scrapeQueue.getActive();
      const completed = await scrapeQueue.getCompleted();
      const failed = await scrapeQueue.getFailed();
      console.log(
        `\u{1F4CA} [Queue Status] Waiting: ${waiting.length}, Active: ${active.length}, Completed: ${completed.length}, Failed: ${failed.length}`
      );
      if (waiting.length > 5) {
        console.warn(
          `\u26A0\uFE0F [Queue Alert] ${waiting.length} jobs waiting - possible bottleneck`
        );
      }
    } catch (error) {
      console.error(`\u274C [Queue Monitoring] Error:`, error);
    }
  }, 1e4);
  return { scrapeWorker: scrapeWorker2, monitorInterval: monitorInterval2 };
};

// src/config/scheduler.ts
var initScheduledJobs = () => {
  console.log("Scheduled Jobs Initialized: Pulse engine active.");
  cron.schedule("0 */4 * * *", async () => {
    console.log("[CRON] Waking up to check all tracked prices...");
    try {
      const activeListings = await prisma_default.productListing.findMany({
        where: { isActive: true },
        select: { id: true, url: true }
      });
      console.log(
        `[CRON] Found ${activeListings.length} active listings to check.`
      );
      let queuedCount = 0;
      for (let i = 0; i < activeListings.length; i++) {
        const listing = activeListings[i];
        if (listing?.url) {
          await scrapeQueue.add(
            "periodic-scrape",
            {
              productUrl: listing.url,
              listingId: listing.id
            },
            {
              delay: i * 2e3
              // 2 second delay between each job
            }
          );
          queuedCount++;
        }
      }
      console.log(
        `[CRON] Successfully queued ${queuedCount} scrape jobs with staggered delays.`
      );
    } catch (error) {
      console.error("[CRON] Critical failure during periodic schedule:", error);
    }
  });
  cron.schedule("*/30 * * * *", async () => {
    console.log("[CRON] Quick sync for recent products...");
    try {
      const recentListings = await prisma_default.productListing.findMany({
        where: {
          isActive: true,
          createdAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1e3)
            // Last 24 hours
          }
        },
        select: { id: true, url: true }
      });
      for (const listing of recentListings) {
        if (listing.url) {
          await scrapeQueue.add("recent-sync", {
            productUrl: listing.url,
            listingId: listing.id
          });
        }
      }
      console.log(`[CRON] Synced ${recentListings.length} recent products.`);
    } catch (error) {
      console.error("[CRON] Quick sync failed:", error);
    }
  });
};

// src/worker.ts
var { scrapeWorker, monitorInterval } = createScrapeWorker();
initScheduledJobs();
console.log("[Worker] Price scrape worker started.");
var shutdown = async (signal) => {
  console.log(`[Worker] Received ${signal}. Starting graceful shutdown...`);
  clearInterval(monitorInterval);
  await scrapeWorker.close();
  await scrapeQueue.close();
  await prisma_default.$disconnect();
  console.log("[Worker] Shutdown complete.");
  process.exit(0);
};
process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});
process.on("SIGINT", () => {
  void shutdown("SIGINT");
});
//# sourceMappingURL=worker.js.map