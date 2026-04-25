var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/config/env.ts
import "dotenv/config";
import { z } from "zod";
var envSchema, env;
var init_env = __esm({
  "src/config/env.ts"() {
    "use strict";
    envSchema = z.object({
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
    env = envSchema.parse(process.env);
  }
});

// src/config/prisma.ts
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
var getDatabaseUrl, prisma, prisma_default;
var init_prisma = __esm({
  "src/config/prisma.ts"() {
    "use strict";
    init_env();
    getDatabaseUrl = () => {
      const baseUrl = env.DATABASE_URL;
      if (env.NODE_ENV === "production") {
        const separator = baseUrl.includes("?") ? "&" : "?";
        return `${baseUrl}${separator}pgbouncer=true&connection_limit=1`;
      }
      return baseUrl;
    };
    prisma = new PrismaClient({
      log: ["error", "warn"],
      datasources: {
        db: {
          url: getDatabaseUrl()
        }
      }
    });
    prisma_default = prisma;
  }
});

// src/config/mail.ts
import nodemailer from "nodemailer";
var transporter, sendPriceDropEmail;
var init_mail = __esm({
  "src/config/mail.ts"() {
    "use strict";
    init_env();
    transporter = nodemailer.createTransport({
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
    sendPriceDropEmail = async (toEmail, productName, newPrice, productUrl) => {
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
  }
});

// src/workers/alertChecker.ts
async function checkAlertsForProduct(productId, newPrice) {
  try {
    const checkStartTime = Date.now();
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
    console.log(
      `[Alert Engine] Found ${alerts.length} active alert(s) for product ${productId}`
    );
    for (const alert of alerts) {
      let triggered = false;
      if (alert.targetPrice && newPrice <= Number(alert.targetPrice)) {
        triggered = true;
      }
      if (triggered) {
        if (alert.lastNotifiedPrice && Number(alert.lastNotifiedPrice) === newPrice) {
          console.log(
            `[Alert Engine] \u23ED\uFE0F  User ${alert.user.email} already notified about $${newPrice}. Skipping.`
          );
          continue;
        }
        console.log(
          `[Alert Engine] \u{1F6A8} ALERT TRIGGERED for User ${alert.user.email}! (Target: $${alert.targetPrice}, New: $${newPrice})`
        );
        const productUrl = alert.product.url || "https://www.aritzia.com";
        const dbStartTime = Date.now();
        const [notification] = await prisma_default.$transaction([
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
        const dbDuration = Date.now() - dbStartTime;
        console.log(
          `[Alert Engine] \u{1F4BE} Notification created in DB (took ${dbDuration}ms) - ID: ${notification.id}, Timestamp: ${notification.createdAt.toISOString()}`
        );
        if (alert.user.email) {
          sendPriceDropEmail(
            alert.user.email,
            alert.product.title,
            newPrice,
            productUrl
          ).catch((err) => console.error("Email error:", err));
        }
        const totalDuration = Date.now() - checkStartTime;
        console.log(
          `[Alert Engine] \u2705 Alert processing complete (total: ${totalDuration}ms)`
        );
      }
    }
  } catch (error) {
    console.error("[Alert Engine] Failed to check alerts:", error);
  }
}
var init_alertChecker = __esm({
  "src/workers/alertChecker.ts"() {
    "use strict";
    init_prisma();
    init_mail();
  }
});

// src/utils/testNotificationTiming.ts
var testNotificationTiming_exports = {};
__export(testNotificationTiming_exports, {
  testNotificationTiming: () => testNotificationTiming
});
async function testNotificationTiming(alertId) {
  const timings = [];
  const startTime = Date.now();
  try {
    timings.push({
      step: "Start",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
    const alert = await prisma_default.priceAlert.findUnique({
      where: { id: alertId },
      include: { product: true, user: true }
    });
    if (!alert) {
      return {
        success: false,
        timings,
        error: "Alert not found"
      };
    }
    timings.push({
      step: "Alert fetched from DB",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      durationMs: Date.now() - startTime
    });
    const fakePrice = alert.targetPrice ? Math.max(Number(alert.targetPrice) - 1, 0.01) : 1;
    console.log(
      `
${"=".repeat(60)}
[Test] Starting notification timing test
${"=".repeat(60)}
Alert ID: ${alertId}
User: ${alert.user.email}
Product: ${alert.product.title}
Target Price: $${alert.targetPrice}
Test Price: $${fakePrice}
${"=".repeat(60)}
`
    );
    await prisma_default.priceAlert.update({
      where: { id: alertId },
      data: { lastNotifiedPrice: null, lastNotifiedAt: null }
    });
    timings.push({
      step: "Anti-spam fields cleared",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      durationMs: Date.now() - startTime
    });
    const triggerStartTime = Date.now();
    await checkAlertsForProduct(alert.productId, fakePrice);
    const triggerDuration = Date.now() - triggerStartTime;
    timings.push({
      step: "Alert check completed",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      durationMs: Date.now() - startTime
    });
    const notification = await prisma_default.notification.findFirst({
      where: {
        userId: alert.userId,
        alertId
      },
      orderBy: { createdAt: "desc" }
    });
    timings.push({
      step: "Notification fetched from DB",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      durationMs: Date.now() - startTime
    });
    const totalDuration = Date.now() - startTime;
    console.log(
      `
${"=".repeat(60)}
TIMING REPORT
${"=".repeat(60)}
`
    );
    timings.forEach((timing, index) => {
      const duration = timing.durationMs !== void 0 ? `(+${timing.durationMs}ms)` : "";
      console.log(`${index + 1}. ${timing.step.padEnd(35)} ${duration}`);
    });
    console.log(
      `
${"=".repeat(60)}
SUMMARY
${"=".repeat(60)}
\u2705 Notification created: ${notification?.id || "N/A"}
\u23F1\uFE0F  Alert trigger time: ${triggerDuration}ms
\u23F1\uFE0F  Total execution time: ${totalDuration}ms
\u{1F4C5} Notification timestamp: ${notification?.createdAt.toISOString() || "N/A"}

\u26A0\uFE0F  NOTE: SSE polling happens every 30 seconds.
   Clients will receive this notification on the next poll.
   Expected client receipt: within 0-30 seconds from now.
${"=".repeat(60)}
`
    );
    return {
      success: true,
      timings,
      notificationId: notification?.id
    };
  } catch (error) {
    console.error("[Test] Error during timing test:", error);
    return {
      success: false,
      timings,
      error: error instanceof Error ? error.message : "Unknown error"
    };
  }
}
var isMainModule;
var init_testNotificationTiming = __esm({
  "src/utils/testNotificationTiming.ts"() {
    "use strict";
    init_prisma();
    init_alertChecker();
    isMainModule = process.argv[1]?.replace(/\\/g, "/").endsWith("testNotificationTiming.ts");
    if (isMainModule) {
      const alertId = process.argv[2];
      if (!alertId) {
        console.error("Usage: tsx src/utils/testNotificationTiming.ts <alertId>");
        process.exit(1);
      }
      testNotificationTiming(alertId).then(() => {
        console.log("\n\u2705 Test complete. Check your SSE connection logs.");
        process.exit(0);
      }).catch((error) => {
        console.error("\n\u274C Test failed:", error);
        process.exit(1);
      });
    }
  }
});

// src/index.ts
init_env();
init_prisma();
import express from "express";
import cors from "cors";

// src/routes/health.routes.ts
import { Router } from "express";

// src/controllers/health.controller.ts
var getHealth = (_req, res) => {
  res.status(200).json({
    status: "UP",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    //how long server has been running
    uptime: process.uptime()
  });
};

// src/routes/health.routes.ts
var router = Router();
router.get("/", getHealth);
var health_routes_default = router;

// src/routes/product.routes.ts
import { Router as Router2 } from "express";

// src/queue/priceQueue.ts
init_env();
import "dotenv/config";
import { Queue, Worker } from "bullmq";

// src/workers/scrapers/aritziaScraper.ts
import { chromium as stealthChromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
stealthChromium.use(StealthPlugin());

// src/services/price.service.ts
init_prisma();
init_alertChecker();

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

// src/utils/urlParser.ts
function parseUrl(rawUrl) {
  let parsedUrl;
  try {
    parsedUrl = new URL(rawUrl);
  } catch {
    throw new Error("Invalid URL provided");
  }
  const cleanUrl = `${parsedUrl.origin}${parsedUrl.pathname}`;
  const match = parsedUrl.pathname.match(/\/(\d+)\.html$/);
  const externalId = match ? match[1] : null;
  if (!externalId) {
    throw new Error("Could not extract Aritzia Product ID from URL");
  }
  return {
    cleanUrl,
    externalId
  };
}
function extractStoreName(url) {
  try {
    const hostname = new URL(url).hostname;
    const parts = hostname.split(".");
    const ignoreList = [
      "www",
      "shop",
      "store",
      "com",
      "ca",
      "co",
      "uk",
      "org",
      "net"
    ];
    const meaningfulParts = parts.filter((part) => !ignoreList.includes(part));
    if (meaningfulParts.length > 0) {
      const brand = meaningfulParts[0];
      return brand.charAt(0).toUpperCase() + brand.slice(1);
    }
    return "Unknown Retailer";
  } catch (error) {
    return "Unknown Retailer";
  }
}

// src/controllers/product.controller.ts
init_prisma();
var trackProduct = async (req, res) => {
  try {
    const { url } = req.body;
    const { cleanUrl, externalId } = parseUrl(url);
    const storeName = extractStoreName(cleanUrl);
    const retailer = await prisma_default.retailer.upsert({
      where: { name: storeName },
      update: {},
      create: {
        name: storeName,
        apiUrl: new URL(cleanUrl).origin,
        isActive: true
      }
    });
    const product = await prisma_default.product.upsert({
      where: { externalId },
      update: {},
      create: {
        externalId,
        title: `Aritzia Item ${externalId}`,
        // Placeholder name
        url: cleanUrl
        // optional: description, category, imageUrl
      }
    });
    const listing = await prisma_default.productListing.upsert({
      where: {
        productId_retailerId: {
          productId: product.id,
          retailerId: retailer.id
        }
      },
      update: {
        url: cleanUrl,
        isActive: false
        // Mark as pending for scraper
      },
      create: {
        productId: product.id,
        retailerId: retailer.id,
        currentPrice: 0,
        url: cleanUrl,
        isActive: false
      }
    });
    await scrapeQueue.add("scrape-aritzia", {
      productUrl: cleanUrl,
      listingId: listing.id
    });
    res.status(202).json({
      message: "Scrape job added to queue.",
      listingId: listing.id,
      status: "PENDING"
    });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : "An unknown error occurred"
    });
  }
};
var getTrackStatus = async (req, res) => {
  try {
    const listingId = Array.isArray(req.params.listingId) ? req.params.listingId[0] : req.params.listingId;
    const listing = await prisma_default.productListing.findUnique({
      where: { id: listingId }
    });
    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }
    if (!listing.isActive) {
      return res.status(200).json({ status: "PENDING" });
    }
    return res.status(200).json({
      status: "COMPLETED",
      productId: listing.productId,
      price: listing.currentPrice
    });
  } catch (error) {
    console.error("Status Check Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
var getQueueHealth = async (_req, res) => {
  try {
    const waiting = await scrapeQueue.getWaiting();
    const active = await scrapeQueue.getActive();
    const completed = await scrapeQueue.getCompleted();
    const failed = await scrapeQueue.getFailed();
    const dbStatus = await prisma_default.$queryRaw`SELECT 1 as status`;
    let redisStatus = "connected";
    try {
      await scrapeQueue.getWaiting();
    } catch (error) {
      redisStatus = "disconnected";
    }
    res.json({
      status: "healthy",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      queue: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length
      },
      database: dbStatus ? "connected" : "disconnected",
      redis: redisStatus
    });
  } catch (error) {
    console.error("Health Check Error:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  }
};
var clearStuckJobs = async (_req, res) => {
  try {
    await scrapeQueue.obliterate({ force: true });
    await prisma_default.productListing.updateMany({
      where: {
        isActive: false,
        createdAt: {
          lt: new Date(Date.now() - 10 * 60 * 1e3)
          // Older than 10 minutes
        }
      },
      data: { isActive: false }
    });
    res.json({
      message: "Queue cleared and stuck listings reset",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    });
  } catch (error) {
    console.error("Clear Jobs Error:", error);
    res.status(500).json({ error: error.message });
  }
};
var deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid product ID" });
    }
    const product = await prisma_default.product.findUnique({
      where: { id },
      include: {
        listings: true,
        alerts: true
      }
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    await prisma_default.product.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// src/middleware/auth.middleware.ts
init_prisma();
init_env();
import jwt from "jsonwebtoken";
import "dotenv/config";
var protect = async (req, res, next) => {
  const headerToken = req.headers.authorization && req.headers.authorization.startsWith("Bearer") ? req.headers.authorization.split(" ")[1] : void 0;
  const queryToken = typeof req.query.token === "string" ? req.query.token : void 0;
  const token = headerToken ?? queryToken;
  if (token) {
    try {
      const decoded = jwt.verify(token, env.JWT_SECRET);
      const user = await prisma_default.user.findUnique({
        where: { id: decoded.userId },
        select: { id: true, email: true, name: true, createdAt: true }
      });
      if (!user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }
      req.user = user;
      next();
    } catch (error) {
      console.error(error);
      return res.status(401).json({ message: "Not authorized, token failed" });
    }
  } else {
    return res.status(401).json({ message: "Not authorized, no token" });
  }
};

// src/middleware/validate.ts
var validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({
      error: "Validation failed",
      details: result.error.flatten().fieldErrors
    });
  }
  req.body = result.data;
  return next();
};

// src/routes/product.routes.ts
init_prisma();
import { z as z2 } from "zod";
var router2 = Router2();
var trackSchema = z2.object({
  url: z2.string().url("Must be a valid URL.")
});
router2.post("/track", validate(trackSchema), trackProduct);
router2.get("/track/:listingId/status", getTrackStatus);
router2.get("/", async (_req, res, next) => {
  try {
    const limitQuery = _req.query.limit;
    const cursorQuery = _req.query.cursor;
    const hasPaginationQuery = typeof limitQuery !== "undefined" || typeof cursorQuery !== "undefined";
    const limit = Math.min(
      Number.parseInt(String(limitQuery || "20"), 10) || 20,
      100
    );
    const cursor = typeof cursorQuery === "string" ? cursorQuery : void 0;
    const productSelect = {
      id: true,
      externalId: true,
      title: true,
      description: true,
      category: true,
      imageUrl: true,
      url: true,
      createdAt: true,
      updatedAt: true,
      listings: {
        select: {
          id: true,
          productId: true,
          retailerId: true,
          currentPrice: true,
          url: true,
          isActive: true,
          retailer: {
            select: {
              id: true,
              name: true,
              apiUrl: true,
              isActive: true
            }
          }
        }
      }
    };
    if (!hasPaginationQuery) {
      const products2 = await prisma_default.product.findMany({
        where: {
          listings: {
            some: {
              isActive: true
            }
          }
        },
        select: productSelect,
        orderBy: { createdAt: "desc" }
      });
      return res.json(products2);
    }
    const products = await prisma_default.product.findMany({
      take: limit + 1,
      ...cursor ? { cursor: { id: cursor }, skip: 1 } : {},
      where: {
        listings: {
          some: {
            isActive: true
          }
        }
      },
      select: productSelect,
      orderBy: { createdAt: "desc" }
    });
    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;
    return res.json({
      items,
      nextCursor: hasNextPage ? items[items.length - 1]?.id ?? null : null,
      hasNextPage
    });
  } catch (error) {
    next(error);
  }
});
router2.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await prisma_default.product.findUnique({
      where: { id },
      select: {
        id: true,
        externalId: true,
        title: true,
        description: true,
        category: true,
        imageUrl: true,
        url: true,
        createdAt: true,
        updatedAt: true,
        listings: {
          include: {
            retailer: true,
            priceHistory: {
              orderBy: {
                timestamp: "asc"
              }
            }
          }
        }
      }
    });
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    res.json(product);
  } catch (error) {
    next(error);
  }
});
router2.delete("/:id", protect, deleteProduct);
router2.get("/health", protect, getQueueHealth);
router2.post("/clear-stuck-jobs", protect, clearStuckJobs);
var product_routes_default = router2;

// src/routes/alert.routes.ts
init_prisma();
import { Router as Router3 } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { z as z3 } from "zod";
var router3 = Router3();
var createAlertSchema = z3.object({
  productId: z3.string().uuid("productId must be a valid UUID."),
  targetPrice: z3.number().positive("Target price must be positive.")
});
var updateAlertSchema = z3.object({
  targetPrice: z3.number().positive("Target price must be positive.")
});
router3.get("/", protect, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    const alerts = await prisma_default.priceAlert.findMany({
      where: { userId: req.user.id },
      include: { product: true }
    });
    res.json(alerts);
  } catch (error) {
    next(error);
  }
});
router3.post(
  "/",
  protect,
  validate(createAlertSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }
      const { productId, targetPrice } = req.body;
      const alert = await prisma_default.priceAlert.create({
        data: {
          userId: req.user.id,
          productId,
          targetPrice: new Decimal(targetPrice),
          isActive: true
        }
      });
      res.status(201).json({ success: true, message: "Alert set!", alert });
    } catch (error) {
      next(error);
    }
  }
);
router3.patch(
  "/:id",
  protect,
  validate(updateAlertSchema),
  async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ message: "Not authorized, user not found" });
      }
      const { id } = req.params;
      const { targetPrice } = req.body;
      if (!id || Array.isArray(id)) {
        return res.status(400).json({ message: "Invalid alert ID" });
      }
      const existingAlert = await prisma_default.priceAlert.findUnique({
        where: { id }
      });
      if (!existingAlert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      if (existingAlert.userId !== req.user.id) {
        return res.status(403).json({ message: "You are not authorized to update this alert" });
      }
      const updatedAlert = await prisma_default.priceAlert.update({
        where: { id },
        data: { targetPrice: new Decimal(targetPrice) }
      });
      res.json({
        success: true,
        message: "Alert updated!",
        alert: updatedAlert
      });
    } catch (error) {
      next(error);
    }
  }
);
router3.delete("/:id", protect, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "Invalid alert ID" });
    }
    const alert = await prisma_default.priceAlert.findUnique({
      where: { id }
    });
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }
    if (alert.userId !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to delete this alert" });
    }
    await prisma_default.priceAlert.delete({
      where: { id }
    });
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});
router3.post("/:id/test", protect, async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === "production") {
      return res.status(403).json({ message: "Test endpoint disabled in production" });
    }
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    const { id } = req.params;
    if (!id || Array.isArray(id)) {
      return res.status(400).json({ message: "Invalid alert ID" });
    }
    const alert = await prisma_default.priceAlert.findUnique({
      where: { id },
      include: { product: true, user: true }
    });
    if (!alert) {
      return res.status(404).json({ message: "Alert not found" });
    }
    if (alert.userId !== req.user.id) {
      return res.status(403).json({ message: "You are not authorized to test this alert" });
    }
    const { testNotificationTiming: testNotificationTiming2 } = await Promise.resolve().then(() => (init_testNotificationTiming(), testNotificationTiming_exports));
    console.log(
      `
[API] Test alert triggered via API by ${req.user.email} for alert ${id}`
    );
    const result = await testNotificationTiming2(id);
    if (!result.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to trigger test alert",
        error: result.error
      });
    }
    res.json({
      success: true,
      message: `Test alert triggered successfully!`,
      details: {
        product: alert.product.title,
        targetPrice: alert.targetPrice ? Number(alert.targetPrice) : null,
        emailSentTo: alert.user.email,
        notificationId: result.notificationId,
        executionTimeMs: result.timings[result.timings.length - 1]?.durationMs
      },
      timings: result.timings,
      info: {
        message: "Notification created successfully",
        ssePollingInterval: "30 seconds",
        expectedClientReceipt: "0-30 seconds from now",
        tip: "Check your browser console for SSE timing logs"
      }
    });
  } catch (error) {
    next(error);
  }
});
var alert_routes_default = router3;

// src/routes/auth.routes.ts
import { Router as Router4 } from "express";
import rateLimit from "express-rate-limit";
import { z as z4 } from "zod";

// src/workers/authenticator.ts
init_prisma();
init_env();
import bcrypt from "bcryptjs";
import jwt2 from "jsonwebtoken";
import "dotenv/config";
var registerUser = async (email, password, name) => {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail || !password) {
    throw new Error("Email, password, and name are required.");
  }
  const existingUser = await prisma_default.user.findUnique({
    where: { email: normalizedEmail },
    select: { id: true }
  });
  if (existingUser) {
    throw new Error("An account with this email already exists.");
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  const newUser = await prisma_default.user.create({
    data: {
      email: normalizedEmail,
      password: hashedPassword,
      name: name?.trim() || null
    },
    select: { id: true, email: true, name: true }
  });
  const token = jwt2.sign({ userId: newUser.id }, env.JWT_SECRET, {
    expiresIn: "1h"
  });
  return { token, user: newUser };
};
var loginUser = async (email, password) => {
  const normalizedEmail = email.toLowerCase().trim();
  if (!normalizedEmail || !password) {
    throw new Error("Email and password are required.");
  }
  const user = await prisma_default.user.findUnique({
    where: { email: normalizedEmail }
  });
  if (!user) {
    throw new Error("Invalid credentials.");
  }
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error("Invalid credentials.");
  }
  const token = jwt2.sign({ userId: user.id }, env.JWT_SECRET, {
    expiresIn: "1h"
  });
  return { token, user: { id: user.id, email: user.email } };
};

// src/routes/auth.routes.ts
var router4 = Router4();
var loginSchema = z4.object({
  email: z4.string().email("A valid email is required."),
  password: z4.string().min(8, "Password must be at least 8 characters.")
});
var registerSchema = z4.object({
  email: z4.string().email("A valid email is required."),
  password: z4.string().min(8, "Password must be at least 8 characters."),
  name: z4.string().min(1, "Name is required.").max(100, "Name is too long.")
});
var authLimiter = rateLimit({
  windowMs: 15 * 60 * 1e3,
  max: 10,
  message: { error: "Too many attempts, please try again later." },
  standardHeaders: true,
  legacyHeaders: false
});
router4.post("/login", authLimiter, validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await loginUser(email, password);
    res.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Authentication failed.";
    const status = message === "Invalid credentials." ? 401 : message === "Email and password are required." ? 400 : 500;
    res.status(status).json({ error: message });
  }
});
router4.post(
  "/register",
  authLimiter,
  validate(registerSchema),
  async (req, res) => {
    try {
      const { email, password, name } = req.body;
      const { token, user } = await registerUser(email, password, name);
      res.status(201).json({ token, user });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed.";
      const status = message === "An account with this email already exists." || message === "Email, password, and name are required." ? 400 : 500;
      res.status(status).json({ error: message });
    }
  }
);
var auth_routes_default = router4;

// src/routes/user.routes.ts
import { Router as Router5 } from "express";

// src/controllers/user.controller.ts
init_prisma();
var getMe = async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, user not found" });
  }
  res.status(200).json(req.user);
};
var updateUser = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    const { id } = req.user;
    const { name } = req.body;
    const updatedUser = await prisma_default.user.update({
      where: { id },
      data: { name },
      select: { id: true, email: true, name: true }
      // Select fields to return
    });
    res.status(200).json(updatedUser);
  } catch (error) {
    next(error);
  }
};

// src/routes/user.routes.ts
var router5 = Router5();
router5.get("/me", protect, getMe);
router5.patch("/me", protect, updateUser);
var user_routes_default = router5;

// src/routes/notification.routes.ts
init_prisma();
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/", protect, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    const notifications = await prisma_default.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
      include: { alert: { include: { product: true } } }
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
});
router6.patch("/:id/read", protect, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    const { id } = req.params;
    const userId = req.user.id;
    const notification = await prisma_default.notification.findUnique({
      where: { id }
    });
    if (!notification) {
      return res.status(404).json({ message: "Notification not found" });
    }
    if (notification.userId !== userId) {
      return res.status(403).json({
        message: "You are not authorized to update this notification"
      });
    }
    const updatedNotification = await prisma_default.notification.update({
      where: { id },
      data: { isRead: true }
    });
    res.json(updatedNotification);
  } catch (error) {
    next(error);
  }
});
var notification_routes_default = router6;

// src/routes/notification-stream.routes.ts
init_prisma();
import { Router as Router7 } from "express";
init_env();
var router7 = Router7();
router7.get("/", protect, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, user not found" });
  }
  const userId = req.user.id;
  const userEmail = req.user.email;
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": env.FRONTEND_URL,
    "Access-Control-Allow-Credentials": "true",
    "X-Accel-Buffering": "no"
    // Disable nginx buffering
  });
  console.log(
    `[SSE] \u2705 User ${userEmail} (${userId}) connected to notification stream`
  );
  const connectionMsg = {
    type: "connected",
    message: "Connected to notification stream",
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    userId
  };
  res.write(`data: ${JSON.stringify(connectionMsg)}

`);
  const sendNotification = async () => {
    try {
      const queryStartTime = Date.now();
      const notifications = await prisma_default.notification.findMany({
        where: {
          userId,
          isRead: false
        },
        orderBy: { createdAt: "desc" },
        take: 10
      });
      const queryDuration = Date.now() - queryStartTime;
      const payload = {
        type: "notifications",
        data: notifications,
        timestamp: (/* @__PURE__ */ new Date()).toISOString(),
        serverProcessingTime: queryDuration,
        count: notifications.length
      };
      res.write(`data: ${JSON.stringify(payload)}

`);
      if (notifications.length > 0) {
        console.log(
          `[SSE] \u{1F4E8} Sent ${notifications.length} notification(s) to ${userEmail} (query took ${queryDuration}ms)`
        );
      }
    } catch (error) {
      console.error(
        `[SSE] \u274C Error fetching notifications for ${userEmail}:`,
        error
      );
    }
  };
  sendNotification();
  const pollInterval = parseInt(req.query.pollInterval) || 3e4;
  const interval = setInterval(sendNotification, pollInterval);
  console.log(`[SSE] Polling every ${pollInterval}ms for user ${userEmail}`);
  const heartbeatInterval = setInterval(() => {
    res.write(`:heartbeat ${(/* @__PURE__ */ new Date()).toISOString()}

`);
  }, 15e3);
  req.on("close", () => {
    clearInterval(interval);
    clearInterval(heartbeatInterval);
    console.log(
      `[SSE] \u274C User ${userEmail} (${userId}) disconnected from notification stream`
    );
  });
});
var notification_stream_routes_default = router7;

// src/middleware/errorHandler.ts
var errorHandler = (err, _req, res, _next) => {
  console.error("Backend error:", err.message);
  res.status(err.status || 500).json({
    error: err.message || "Internal Server Error",
    stack: process.env.NODE_ENV === "development" ? err.stack : void 0
  });
};

// src/index.ts
var app = express();
var PORT = env.PORT;
app.use(
  cors({
    origin: env.FRONTEND_URL,
    credentials: true
  })
);
app.use(express.json());
app.use("/health", health_routes_default);
app.use("/api/products", product_routes_default);
app.use("/api/alerts", alert_routes_default);
app.use("/api/auth", auth_routes_default);
app.use("/api/user", user_routes_default);
app.use("/api/notifications", notification_routes_default);
app.use("/api/notifications/stream", notification_stream_routes_default);
app.use(errorHandler);
var server = app.listen(PORT, () => {
  console.log(`Server successfully running at http://localhost:${PORT}/health`);
});
var shutdown = (signal) => {
  console.log(`[API] Received ${signal}. Starting graceful shutdown...`);
  server.close(async () => {
    await prisma_default.$disconnect();
    console.log("[API] Shutdown complete.");
    process.exit(0);
  });
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
//# sourceMappingURL=index.js.map