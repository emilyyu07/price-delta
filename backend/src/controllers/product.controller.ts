/*
Handles product tracking requests, checks product status, and manages the scraping queue
*/
import type { Request, Response } from "express";
import { scrapeQueue } from "../queue/priceQueue.js";
import { parseUrl, extractStoreName } from "../utils/urlParser.js";
import prisma from "../config/prisma.js";

export const trackProduct = async (req: Request, res: Response) => {
  try {
    const { url } = req.body;

    // normalize URL
    const { cleanUrl, externalId } = parseUrl(url);

    const storeName = extractStoreName(cleanUrl);

    //ensure retailer exists
    const retailer = await prisma.retailer.upsert({
      where: { name: storeName },
      update: {},
      create: {
        name: storeName,
        apiUrl: new URL(cleanUrl).origin,
        isActive: true,
      },
    });

    //ensure product exists
    const product = await prisma.product.upsert({
      where: { externalId: externalId },
      update: {},
      create: {
        externalId: externalId,
        title: `Aritzia Item ${externalId}`, // Placeholder name
        url: cleanUrl,
        // optional: description, category, imageUrl
      },
    });

    // create "pending" Listing in PostgreSQL so we have an ID
    const listing = await prisma.productListing.upsert({
      where: {
        productId_retailerId: {
          productId: product.id,
          retailerId: retailer.id,
        },
      },
      update: {
        url: cleanUrl,
        isActive: false, // Mark as pending for scraper
      },
      create: {
        productId: product.id,
        retailerId: retailer.id,
        currentPrice: 0,
        url: cleanUrl,
        isActive: false,
      },
    });

    // push job to queue
    await scrapeQueue.add("scrape-aritzia", {
      productUrl: cleanUrl,
      listingId: listing.id,
    });

    //respond to frontend
    res.status(202).json({
      message: "Scrape job added to queue.",
      listingId: listing.id,
      status: "PENDING",
    });
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error ? error.message : "An unknown error occurred",
    });
  }
};

export const getTrackStatus = async (req: Request, res: Response) => {
  try {
    const listingId = Array.isArray(req.params.listingId)
      ? req.params.listingId[0]
      : req.params.listingId;

    // find listing in database
    const listing = await prisma.productListing.findUnique({
      where: { id: listingId },
    });

    if (!listing) {
      return res.status(404).json({ error: "Listing not found" });
    }

    // check if pending
    if (!listing.isActive) {
      return res.status(200).json({ status: "PENDING" });
    }

    // check if done
    return res.status(200).json({
      status: "COMPLETED",
      productId: listing.productId,
      price: listing.currentPrice,
    });
  } catch (error: any) {
    console.error("Status Check Error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};

export const getQueueHealth = async (_req: Request, res: Response) => {
  try {
    // Check queue status
    const waiting = await scrapeQueue.getWaiting();
    const active = await scrapeQueue.getActive();
    const completed = await scrapeQueue.getCompleted();
    const failed = await scrapeQueue.getFailed();

    // Check database connection
    const dbStatus = await prisma.$queryRaw`SELECT 1 as status`;

    // Check Redis connection by trying to get queue info
    let redisStatus = "connected";
    try {
      await scrapeQueue.getWaiting();
    } catch (error) {
      redisStatus = "disconnected";
    }

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      queue: {
        waiting: waiting.length,
        active: active.length,
        completed: completed.length,
        failed: failed.length,
      },
      database: dbStatus ? "connected" : "disconnected",
      redis: redisStatus,
    });
  } catch (error: any) {
    console.error("Health Check Error:", error);
    res.status(500).json({
      status: "unhealthy",
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
};

export const clearStuckJobs = async (_req: Request, res: Response) => {
  try {
    // Clear all jobs in queue
    await scrapeQueue.obliterate({ force: true });

    // Update stuck listings to active=false
    await prisma.productListing.updateMany({
      where: {
        isActive: false,
        createdAt: {
          lt: new Date(Date.now() - 10 * 60 * 1000), // Older than 10 minutes
        },
      },
      data: { isActive: false },
    });

    res.json({
      message: "Queue cleared and stuck listings reset",
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error("Clear Jobs Error:", error);
    res.status(500).json({ error: error.message });
  }
};

export const deleteProduct = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id || typeof id !== "string") {
      return res.status(400).json({ error: "Invalid product ID" });
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        listings: true,
        alerts: true,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // Delete product (cascades to listings, price history, and alerts)
    await prisma.product.delete({
      where: { id },
    });

    res.status(204).send();
  } catch (error: any) {
    console.error("Delete Product Error:", error);
    res.status(500).json({ error: error.message });
  }
};
