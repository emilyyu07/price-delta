// web Scraper for Aritzia

import { chromium as baseChromium } from "playwright";
import { chromium as stealthChromium } from "playwright-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import type { Browser, BrowserContext, Page } from "playwright";

stealthChromium.use(StealthPlugin());

// keep a single global browser instance alive in memory
let globalBrowser: Browser | null = null;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Uniformly random integer in [min, max] */
const randInt = (min: number, max: number) =>
  Math.floor(Math.random() * (max - min + 1)) + min;

/** Sleep for a random duration in [minMs, maxMs] */
const humanDelay = (minMs: number, maxMs: number) =>
  new Promise<void>((res) => setTimeout(res, randInt(minMs, maxMs)));

/**
 * Simulate a human scrolling down the page gradually.
 */
async function humanScroll(page: Page): Promise<void> {
  const scrollSteps = randInt(3, 6);
  for (let i = 0; i < scrollSteps; i++) {
    await page.mouse.wheel(0, randInt(200, 500));
    await humanDelay(300, 700);
  }
  // Scroll back up slightly — humans rarely stay at the very bottom
  await page.mouse.wheel(0, -randInt(100, 300));
  await humanDelay(200, 500);
}

/**
 * Move the mouse to a few random positions on screen.
 */
async function humanMouseMove(page: Page): Promise<void> {
  const moves = randInt(2, 4);
  for (let i = 0; i < moves; i++) {
    await page.mouse.move(randInt(300, 1400), randInt(200, 800), {
      steps: randInt(5, 15), // smooth arc, not a teleport
    });
    await humanDelay(100, 300);
  }
}

// ─── Browser launch ───────────────────────────────────────────────────────────

async function getOrLaunchBrowser(): Promise<Browser> {
  // Liveness check — if Chromium crashed, globalBrowser is non-null but dead
  if (globalBrowser && !globalBrowser.isConnected()) {
    console.warn("[Scraper] Browser disconnected — relaunching.");
    await globalBrowser.close().catch(() => undefined);
    globalBrowser = null;
  }

  if (!globalBrowser) {
    console.log("🚀 [Scraper] Launching new browser instance...");
    globalBrowser = await (stealthChromium as typeof baseChromium).launch({
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
        "--window-size=1920,1080",
      ],
    });
  }

  return globalBrowser;
}

// ─── Context factory ──────────────────────────────────────────────────────────

// Rotate through realistic macOS + Windows Chrome UAs
const USER_AGENTS = [
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 13_3_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
];

async function createContext(browser: Browser): Promise<BrowserContext> {
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
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
      "sec-ch-ua":
        '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
      "sec-ch-ua-mobile": "?0",
      "sec-ch-ua-platform": '"macOS"',
      "Sec-Fetch-Dest": "document",
      "Sec-Fetch-Mode": "navigate",
      "Sec-Fetch-Site": "none",
      "Sec-Fetch-User": "?1",
      "Upgrade-Insecure-Requests": "1",
    },
  });
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function scrapeAritziaPrice(
  productUrl: string,
): Promise<{ price: number; imageUrl: string | null; title: string | null }> {
  console.log(`🔍 [Scraper] Starting scrape for: ${productUrl}`);

  let context: BrowserContext | null = null;

  // Shared close guard — prevents double-close race between timeout and finally
  let contextClosed = false;
  let cancelled = false;

  const closeContext = async () => {
    if (!contextClosed && context) {
      contextClosed = true;
      await context
        .close()
        .catch((err) =>
          console.warn("⚠️ [Scraper] Error closing context:", err),
        );
    }
  };

  // 90s total — networkidle needs more headroom than domcontentloaded
  const timeout = 90000;
  let timeoutHandle: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutHandle = setTimeout(async () => {
      cancelled = true;
      await closeContext();
      reject(new Error("Scrape timeout after 90 seconds"));
    }, timeout);
  });

  const browser = await getOrLaunchBrowser();

  const scrapeTask = async (): Promise<{
    price: number;
    imageUrl: string | null;
    title: string | null;
  }> => {
    try {
      context = await createContext(browser);
      const page = await context.newPage();

      await page.route("**/*.{woff,woff2,ttf}", (route) => route.abort());

      // Block analytics/tracking — reduces noise, marginally faster
      await page.route(
        /google-analytics|googletagmanager|doubleclick|facebook\.net|hotjar|segment\.io/,
        (route) => route.abort(),
      );

      if (cancelled) throw new Error("Scrape cancelled due to timeout");

      // Land on the homepage first ──────────────────────────────────
      console.log("🏠 [Scraper] Visiting homepage to establish session...");
      await page.goto("https://www.aritzia.com/en/aritzia", {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });
      await humanDelay(1500, 3000);
      await humanMouseMove(page);

      if (cancelled) throw new Error("Scrape cancelled due to timeout");

      // Navigate to the product page ────────────────────────────────
      console.log(`🌐 [Scraper] Navigating to product: ${productUrl}`);
      await page.goto(productUrl, {
        waitUntil: "networkidle",
        timeout: 45000,
        referer: "https://www.aritzia.com/en/aritzia",
      });

      if (cancelled) throw new Error("Scrape cancelled due to timeout");

      // Human-like behaviour before extraction ──────────────────────
      const pauseMs = randInt(2000, 4000);
      console.log(
        `⏳ [Scraper] Pausing ${pauseMs}ms and simulating human behaviour...`,
      );
      await humanDelay(pauseMs / 2, pauseMs / 2);
      await humanMouseMove(page);
      await humanScroll(page);
      await humanDelay(500, 1200);

      if (cancelled) throw new Error("Scrape cancelled due to timeout");

      // Bot-block check ──────────────────────────────────────────────
      const pageTitle = await page.title();
      if (
        pageTitle.toLowerCase().includes("robot") ||
        pageTitle.toLowerCase().includes("blocked") ||
        pageTitle.toLowerCase().includes("access denied") ||
        pageTitle.toLowerCase().includes("403")
      ) {
        throw new Error("Bot detection detected - page blocked");
      }

      console.log("🔍 [Scraper] Looking for price elements...");

      // Price extraction ─────────────────────────────────────────────
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
        '[data-test*="price"]',
      ];

      let rawPriceText = "";
      let priceFound = false;

      for (const selector of priceSelectors) {
        try {
          const element = page.locator(selector).first();
          if ((await element.count()) > 0) {
            rawPriceText = await element.innerText();
            console.log(
              `✅ [Scraper] Price found via "${selector}": ${rawPriceText}`,
            );
            priceFound = true;
            break;
          }
        } catch {
          // selector didn't match — try next
        }
      }

      if (!priceFound) {
        const priceElements = await page
          .locator("text=/\\$[0-9]+\\.?[0-9]*/")
          .all();
        if (priceElements[0]) {
          rawPriceText = await priceElements[0].innerText();
          console.log(`✅ [Scraper] Price found via regex: ${rawPriceText}`);
          priceFound = true;
        }
      }

      if (!priceFound) {
        throw new Error(
          "DOM Parse Error: Could not find price element. Aritzia may have changed their DOM structure.",
        );
      }

      const cleanPrice = parseFloat(rawPriceText.replace(/[^0-9.]/g, ""));
      if (isNaN(cleanPrice)) {
        throw new Error(`Failed to parse price string: "${rawPriceText}"`);
      }

      console.log(`📊 [Scraper] Parsed price: $${cleanPrice}`);

      // Title extraction ─────────────────────────────────────────────
      let productTitle: string | null = null;
      try {
        const ogTitle = await page
          .locator('meta[property="og:title"]')
          .getAttribute("content");
        if (ogTitle) {
          productTitle = ogTitle;
        } else {
          const h1 = await page
            .locator('h1[data-testid="product-title"], h1.product-title, h1')
            .first()
            .innerText()
            .catch(() => null);
          productTitle =
            h1?.trim() ??
            (await page.title())
              .replace(/Aritzia/gi, "")
              .replace(/\|.*$/, "")
              .trim() ??
            null;
        }
        console.log(`📝 [Scraper] Title: ${productTitle}`);
      } catch {
        console.warn("⚠️ [Scraper] Could not extract product title");
      }

      // Image extraction ─────────────────────────────────────────────
      let imageUrl: string | null = null;
      const resolveUrl = (raw: string): string => {
        if (raw.startsWith("//")) return "https:" + raw;
        if (raw.startsWith("/")) return "https://www.aritzia.com" + raw;
        return raw;
      };

      try {
        const ogImage = await page
          .locator('meta[property="og:image"]')
          .getAttribute("content");
        if (ogImage) {
          imageUrl = resolveUrl(ogImage);
        } else {
          const twitterImage = await page
            .locator('meta[name="twitter:image"]')
            .getAttribute("content");
          if (twitterImage) {
            imageUrl = resolveUrl(twitterImage);
          } else {
            const productImg = await page
              .locator(
                'img[alt*="product"], img[data-testid="product-image"], .product-image img',
              )
              .first()
              .getAttribute("src")
              .catch(() => null);
            if (productImg) imageUrl = resolveUrl(productImg);
          }
        }
        if (imageUrl) console.log(`🖼️ [Scraper] Image: ${imageUrl}`);
      } catch {
        console.warn("⚠️ [Scraper] Could not extract product image");
      }

      console.log("✅ [Scraper] Scrape completed successfully!");
      return { price: cleanPrice, imageUrl, title: productTitle };
    } catch (error) {
      console.error(`❌ [Scraper] Failed to scrape: ${productUrl}`, error);

      if (error instanceof Error) {
        if (error.message.includes("timeout")) {
          throw new Error(
            "Scrape timeout - Aritzia might be slow or blocking us",
          );
        } else if (error.message.toLowerCase().includes("bot detection")) {
          throw new Error("Bot detection detected - Aritzia has blocked us");
        } else if (error.message.includes("DOM Parse Error")) {
          throw new Error("DOM structure changed - need to update selectors");
        }
      }

      throw new Error(
        "Scrape failed. Target is blocking or structure changed.",
      );
    } finally {
      await closeContext();
      console.log("🧹 [Scraper] Context closed");
    }
  };

  try {
    return await Promise.race([scrapeTask(), timeoutPromise]);
  } finally {
    if (timeoutHandle) clearTimeout(timeoutHandle);
  }
}
