// src/index.ts
import express from "express";
import cors from "cors";

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

// src/config/prisma.ts
import { PrismaClient } from "@prisma/client";
import "dotenv/config";
var prisma = new PrismaClient({
  log: ["error", "warn"]
});
var prisma_default = prisma;

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
import "dotenv/config";
import { Queue, Worker } from "bullmq";

// src/workers/scrapers/aritziaScraper.ts
import { chromium } from "playwright";

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

// src/middleware/auth.middleware.ts
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
router2.get("/health", protect, getQueueHealth);
router2.post("/clear-stuck-jobs", protect, clearStuckJobs);
var product_routes_default = router2;

// src/routes/alert.routes.ts
import { Router as Router3 } from "express";
import { Decimal } from "@prisma/client/runtime/library";
import { z as z3 } from "zod";
var router3 = Router3();
var createAlertSchema = z3.object({
  productId: z3.string().uuid("productId must be a valid UUID."),
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
var alert_routes_default = router3;

// src/routes/auth.routes.ts
import { Router as Router4 } from "express";
import rateLimit from "express-rate-limit";
import { z as z4 } from "zod";

// src/workers/authenticator.ts
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
import { Router as Router6 } from "express";
var router6 = Router6();
router6.get("/", protect, async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Not authorized, user not found" });
    }
    const notifications = await prisma_default.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" }
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
import { Router as Router7 } from "express";
var router7 = Router7();
router7.get("/", protect, (req, res) => {
  if (!req.user) {
    return res.status(401).json({ message: "Not authorized, user not found" });
  }
  const userId = req.user.id;
  const frontendOrigin = process.env.FRONTEND_URL || "http://localhost:5173";
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "Access-Control-Allow-Origin": frontendOrigin,
    "Access-Control-Allow-Headers": "Cache-Control"
  });
  res.write(`data: ${JSON.stringify({ type: "connected", message: "Connected to notification stream" })}

`);
  const sendNotification = async () => {
    try {
      const notifications = await prisma_default.notification.findMany({
        where: {
          userId,
          isRead: false
        },
        orderBy: { createdAt: "desc" },
        take: 10
      });
      res.write(`data: ${JSON.stringify({ type: "notifications", data: notifications })}

`);
    } catch (error) {
      console.error("[Notification Stream] Error fetching notifications:", error);
    }
  };
  sendNotification();
  const interval = setInterval(sendNotification, 3e4);
  req.on("close", () => {
    clearInterval(interval);
    console.log(`[Notification Stream] User ${userId} disconnected`);
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