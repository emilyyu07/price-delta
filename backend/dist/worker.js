// src/worker.ts
import "dotenv/config";

// src/config/prisma.ts
import { PrismaClient } from "@prisma/client";
import "dotenv/config";

// src/config/env.ts
import "dotenv/config";
import { z } from "zod";
var envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters"),
  REDIS_URL: z.string().optional(),
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

// src/config/prisma.ts
var getDatabaseUrl = () => {
  const baseUrl = env.DATABASE_URL;
  if (env.NODE_ENV === "production") {
    const separator = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${separator}pgbouncer=true&connection_limit=1`;
  }
  return baseUrl;
};
var prisma = new PrismaClient({
  log: ["error", "warn"],
  datasources: {
    db: {
      url: getDatabaseUrl()
    }
  }
});
var prisma_default = prisma;

// src/config/scheduler.ts
import cron from "node-cron";

// src/queue/priceQueue.ts
import "dotenv/config";
import { Queue, Worker } from "bullmq";

// src/workers/scrapers/aritziaScraper.ts
import { chromium as stealthChromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
stealthChromium.use(StealthPlugin());
var globalBrowser = null;
var randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
var humanDelay = (minMs, maxMs) => new Promise((res) => setTimeout(res, randInt(minMs, maxMs)));
async function humanScroll(page) {
  const scrollSteps = randInt(3, 6);
  for (let i = 0; i < scrollSteps; i++) {
    await page.mouse.wheel(0, randInt(200, 500));
    await humanDelay(300, 700);
  }
  await page.mouse.wheel(0, -randInt(100, 300));
  await humanDelay(200, 500);
}
async function humanMouseMove(page) {
  const moves = randInt(2, 4);
  for (let i = 0; i < moves; i++) {
    await page.mouse.move(randInt(300, 1400), randInt(200, 800), {
      steps: randInt(5, 15)
      // smooth arc, not a teleport
    });
    await humanDelay(100, 300);
  }
}
async function getOrLaunchBrowser() {
  if (globalBrowser && !globalBrowser.isConnected()) {
    console.warn("[Scraper] Browser disconnected \u2014 relaunching.");
    await globalBrowser.close().catch(() => void 0);
    globalBrowser = null;
  }
  if (!globalBrowser) {
    console.log("\u{1F680} [Scraper] Launching new browser instance...");
    globalBrowser = await stealthChromium.launch({
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
        // Suppress automation flags
        "--disable-blink-features=AutomationControlled",
        // NOTE: --disable-web-security removed — it is itself a bot signal
        // NOTE: --disable-features=VizDisplayCompositor removed — not needed
        "--window-size=1920,1080"
      ]
    });
  }
  return globalBrowser;
}
var USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36"
];
async function createContext(browser) {
  const userAgent = USER_AGENTS[randInt(0, USER_AGENTS.length - 1)];
  return browser.newContext({
    userAgent,
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    hasTouch: false,
    locale: "en-US",
    timezoneId: "America/New_York",
    ignoreHTTPSErrors: true,
    bypassCSP: true,
    javaScriptEnabled: true,
    // Realistic HTTP headers — missing Accept-Language is a common bot signal
    extraHTTPHeaders: {
      "Accept-Language": "en-US,en;q=0.9",
      "Accept-Encoding": "gzip, deflate, br",
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "sec-ch-ua": '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1"
    }
  });
}
async function scrapeAritziaPrice(productUrl) {
  console.log(`\u{1F50D} [Scraper] Starting scrape for: ${productUrl}`);
  let context = null;
  let contextClosed = false;
  let cancelled = false;
  const closeContext = async () => {
    if (!contextClosed && context) {
      contextClosed = true;
      await context.close().catch(
        (err) => console.warn("\u26A0\uFE0F [Scraper] Error closing context:", err)
      );
    }
  };
  const timeout = 9e4;
  let timeoutHandle;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandle = setTimeout(async () => {
      cancelled = true;
      await closeContext();
      reject(new Error("Scrape timeout after 90 seconds"));
    }, timeout);
  });
  const browser = await getOrLaunchBrowser();
  const scrapeTask = async () => {
    try {
      context = await createContext(browser);
      const page = await context.newPage();
      await page.route("**/*.{woff,woff2,ttf}", (route) => route.abort());
      await page.route(
        /google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|segment\.io/,
        (route) => route.abort()
      );
      if (cancelled) throw new Error("Scrape cancelled due to timeout");
      console.log("\u{1F3E0} [Scraper] Visiting homepage to establish session...");
      await page.goto("https://www.aritzia.com/en/aritzia", {
        waitUntil: "domcontentloaded",
        timeout: 3e4
      });
      await humanDelay(1500, 3e3);
      await humanMouseMove(page);
      if (cancelled) throw new Error("Scrape cancelled due to timeout");
      console.log(`\u{1F310} [Scraper] Navigating to product: ${productUrl}`);
      await page.goto(productUrl, {
        waitUntil: "networkidle",
        timeout: 45e3,
        referer: "https://www.aritzia.com/en/aritzia"
      });
      if (cancelled) throw new Error("Scrape cancelled due to timeout");
      const pauseMs = randInt(2e3, 4e3);
      console.log(
        `\u23F3 [Scraper] Pausing ${pauseMs}ms and simulating human behaviour...`
      );
      await humanDelay(pauseMs / 2, pauseMs / 2);
      await humanMouseMove(page);
      await humanScroll(page);
      await humanDelay(500, 1200);
      if (cancelled) throw new Error("Scrape cancelled due to timeout");
      const pageTitle = await page.title();
      if (pageTitle.toLowerCase().includes("robot") || pageTitle.toLowerCase().includes("blocked") || pageTitle.toLowerCase().includes("access denied") || pageTitle.toLowerCase().includes("403") || pageTitle.toLowerCase().includes("just a moment") || pageTitle.toLowerCase().includes("verify you are human") || pageTitle.toLowerCase().includes("attention required") || pageTitle.toLowerCase().includes("checking your browser")) {
        throw new Error("Bot detection detected - page blocked");
      }
      if (pageTitle.toLowerCase().includes("404") || pageTitle.toLowerCase().includes("page not found")) {
        throw new Error(
          "Product page returned 404 \u2014 product may be discontinued"
        );
      }
      console.log("\u{1F50D} [Scraper] Looking for price elements...");
      const priceSelectors = [
        '[data-testid="product-list-price-text"]',
        '[data-testid="product-list-sale-text"]',
        '[data-testid*="price"]',
        '[class*="ProductPrice"]',
        '[class*="product-price"]',
        '[class*="ProductDetailsPrice"]',
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
              `\u2705 [Scraper] Price found via "${selector}": ${rawPriceText}`
            );
            priceFound = true;
            break;
          }
        } catch {
        }
      }
      if (!priceFound) {
        const priceElements = await page.locator("text=/\\$[0-9]+\\.?[0-9]*/").all();
        if (priceElements[0]) {
          rawPriceText = await priceElements[0].innerText();
          console.log(`\u2705 [Scraper] Price found via regex: ${rawPriceText}`);
          priceFound = true;
        }
      }
      if (!priceFound) {
        throw new Error(
          "DOM Parse Error: Could not find price element. Aritzia may have changed their DOM structure."
        );
      }
      const cleanPrice = parseFloat(rawPriceText.replace(/[^0-9.]/g, ""));
      if (isNaN(cleanPrice)) {
        throw new Error(`Failed to parse price string: "${rawPriceText}"`);
      }
      console.log(`\u{1F4CA} [Scraper] Parsed price: $${cleanPrice}`);
      let productTitle = null;
      try {
        const ogTitle = await page.locator('meta[property="og:title"]').getAttribute("content", { timeout: 3e3 }).catch(() => null);
        if (ogTitle && ogTitle.trim().length > 3) {
          productTitle = ogTitle.trim();
        } else {
          const h1Locator = page.locator('h1[data-testid="product-title"], h1.product-title, h1').first();
          const h1 = await h1Locator.waitFor({ state: "visible", timeout: 5e3 }).then(() => h1Locator.innerText()).catch(() => null);
          productTitle = h1?.trim() || (await page.title()).replace(/Aritzia/gi, "").replace(/\|.*$/, "").trim() || null;
        }
        console.log(`\u{1F4DD} [Scraper] Title: ${productTitle}`);
      } catch (err) {
        console.warn("\u26A0\uFE0F [Scraper] Could not extract product title:", err);
      }
      let imageUrl = null;
      const resolveUrl = (raw) => {
        if (raw.startsWith("//")) return "https:" + raw;
        if (raw.startsWith("/")) return "https://www.aritzia.com" + raw;
        return raw;
      };
      try {
        const ogImage = await page.locator('meta[property="og:image"]').getAttribute("content", { timeout: 3e3 }).catch(() => null);
        if (ogImage) {
          imageUrl = resolveUrl(ogImage);
        } else {
          const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute("content", { timeout: 3e3 }).catch(() => null);
          if (twitterImage) {
            imageUrl = resolveUrl(twitterImage);
          } else {
            const imgLocator = page.locator('#product-images img[loading="lazy"]').first();
            await imgLocator.waitFor({ state: "visible", timeout: 5e3 }).catch(() => null);
            const rawSrc = await imgLocator.evaluate((el) => {
              const srcset = el.getAttribute("srcset");
              if (srcset) {
                const entries = srcset.split(/\s+\d+w,?\s*/).map((s) => s.trim()).filter((s) => s.startsWith("http"));
                const best = entries[entries.length - 1];
                if (best) return best;
              }
              const src = el.getAttribute("src");
              return src && !src.startsWith("data:") ? src : null;
            }).catch(() => null);
            if (rawSrc && !rawSrc.startsWith("data:")) {
              imageUrl = resolveUrl(rawSrc);
            }
          }
        }
        if (imageUrl) {
          console.log(`\u{1F5BC}\uFE0F [Scraper] Image: ${imageUrl}`);
        } else {
          console.warn("\u26A0\uFE0F [Scraper] No image found via any selector");
        }
      } catch (err) {
        console.warn("\u26A0\uFE0F [Scraper] Could not extract product image:", err);
      }
      console.log("\u2705 [Scraper] Scrape completed successfully!");
      return { price: cleanPrice, imageUrl, title: productTitle };
    } catch (error) {
      console.error(`\u274C [Scraper] Failed to scrape: ${productUrl}`, error);
      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          throw new Error(
            "Scrape timeout - Aritzia might be slow or blocking us"
          );
        } else if (error.message.toLowerCase().includes("bot detection")) {
          throw new Error("Bot detection detected - Aritzia has blocked us");
        } else if (error.message.includes("DOM Parse Error")) {
          throw new Error("DOM structure changed - need to update selectors");
        }
      }
      throw new Error(
        "Scrape failed. Target is blocking or structure changed."
      );
    } finally {
      await closeContext();
      console.log("\u{1F9F9} [Scraper] Context closed");
    }
  };
  try {
    return await Promise.race([scrapeTask(), timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
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
var redisConnectionOptions = env.REDIS_URL ? {
  // Upstash TLS connection
  host: new URL(env.REDIS_URL).hostname,
  port: parseInt(new URL(env.REDIS_URL).port) || 6379,
  password: new URL(env.REDIS_URL).password || void 0,
  tls: {
    rejectUnauthorized: false
  },
  maxRetriesPerRequest: null
} : {
  // Local Docker connection
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