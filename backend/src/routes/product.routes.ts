/*
Product Routes:
- mounted on /api/products
- POST /api/products/track: Start tracking a new product by URL (requires authentication)
- GET /api/products/track/:listingId/status: Get tracking status for a product listing (requires authentication)
- GET /api/products: Get a list of all tracked products with their active listings (public)
- GET /api/products/:id: Get detailed information and price history for a specific product (public)
- DELETE /api/products/:id: Delete a tracked product (requires authentication)  

Handles product ingestion, polling status, product catalog retrieval, etc.
*/

import { Router } from "express";
import {
  getTrackStatus,
  trackProduct,
  getQueueHealth,
  clearStuckJobs,
  deleteProduct,
} from "../controllers/product.controller.js";
import { protect } from "../middleware/auth.middleware.js";
import { validate } from "../middleware/validate.js";
import prisma from "../config/prisma.js";
import { z } from "zod";
const router = Router();
const trackSchema = z.object({
  url: z.string().url("Must be a valid URL."),
});

router.post("/track", validate(trackSchema), trackProduct);

// polling
router.get("/track/:listingId/status", getTrackStatus);

// get all products (browsing page)
router.get("/", async (_req, res, next) => {
  try {
    const limitQuery = _req.query.limit;
    const cursorQuery = _req.query.cursor;
    const hasPaginationQuery =
      typeof limitQuery !== "undefined" || typeof cursorQuery !== "undefined";
    const limit = Math.min(
      Number.parseInt(String(limitQuery || "20"), 10) || 20,
      100,
    );
    const cursor = typeof cursorQuery === "string" ? cursorQuery : undefined;
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
              isActive: true,
            },
          },
        },
      },
    } as const;

    if (!hasPaginationQuery) {
      const products = await prisma.product.findMany({
        where: {
          listings: {
            some: {
              isActive: true,
            },
          },
        },
        select: productSelect,
        orderBy: { createdAt: "desc" },
      });
      return res.json(products);
    }

    const products = await prisma.product.findMany({
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      where: {
        listings: {
          some: {
            isActive: true,
          },
        },
      },
      select: productSelect,
      orderBy: { createdAt: "desc" },
    });

    const hasNextPage = products.length > limit;
    const items = hasNextPage ? products.slice(0, limit) : products;

    return res.json({
      items,
      nextCursor: hasNextPage ? (items[items.length - 1]?.id ?? null) : null,
      hasNextPage,
    });
  } catch (error) {
    next(error);
  }
});

//get a single product with price history (chart page)
router.get("/:id", async (req, res, next) => {
  try {
    const id = req.params.id;
    const product = await prisma.product.findUnique({
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
                timestamp: "asc",
              },
            },
          },
        },
      },
    });

    //check if product exists, return error if not
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    //if valid, return product data
    res.json(product);
  } catch (error) {
    next(error);
  }
});

// Delete a product (requires authentication)
router.delete("/:id", protect, deleteProduct);

// Debugging and monitoring endpoints
router.get("/health", protect, getQueueHealth);
router.post("/clear-stuck-jobs", protect, clearStuckJobs);

export default router;
