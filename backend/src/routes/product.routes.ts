import { Router } from "express";
import {
  getTrackStatus,
  trackProduct,
} from "../controllers/product.controller";
import prisma from "../config/prisma.js";
const router = Router();

router.post("/track", trackProduct);

// polling
router.get("/track/:listingId/status", getTrackStatus);

// get all products (browsing page)
router.get("/", async (_req, res, next) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        listings: {
          some: {
            isActive: true,
          },
        },
      },
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
      },
    });
    res.json(products);
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

export default router;
