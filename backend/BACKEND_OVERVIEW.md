# Backend overview – PriceDelta

This document explains how the **backend** is organized, how requests flow through the API, how the **worker/scraper** pipeline works, and the most common reasons the scraper “does nothing.”

---

## Architecture at a glance

The backend is actually **two Node processes**:

- **API server** (`src/index.ts`): Express REST API used by the React frontend.
- **Worker** (`src/worker.ts`): Runs **BullMQ** (Redis-backed queue) + **Playwright** scraping jobs + **node-cron** schedules.

If you only run the API server, **scrape jobs can queue up but never execute** (because no worker is consuming them).

---

## Key dependencies and why they exist

- **Express**: REST API framework (`src/index.ts` mounts routes).
- **Prisma + PostgreSQL**: type-safe ORM and relational storage (`src/config/prisma.ts`, `prisma/schema.prisma`).
- **jsonwebtoken + bcryptjs**: JWT auth + password hashing (`src/middleware/auth.middleware.ts`, `src/workers/authenticator.ts`).
- **zod**: input validation (e.g. `auth.routes.ts`, `alert.routes.ts`) + env validation (`src/config/env.ts`).
- **BullMQ + ioredis**: job queue for scraping (producer: API, consumer: worker).
- **Playwright**: headless browser scraping (`src/workers/scrapers/aritziaScraper.ts`).
- **node-cron**: periodic scheduling that enqueues scrape jobs (`src/config/scheduler.ts`).
- **nodemailer**: email delivery (`src/config/mail.ts`) used by the alert engine.

---

## Project structure (backend)

High-signal folders/files:

- `src/index.ts`: API entrypoint (Express app, route mounting, graceful shutdown).
- `src/worker.ts`: Worker entrypoint (creates BullMQ Worker, starts cron schedules, graceful shutdown).
- `src/config/`
  - `env.ts`: validates and exports environment vars via Zod.
  - `prisma.ts`: Prisma client instance.
  - `scheduler.ts`: cron schedules that enqueue scraping jobs.
  - `mail.ts`: Nodemailer transport and email templates.
- `src/middleware/`
  - `auth.middleware.ts`: JWT protection middleware.
  - `validate.ts`: Zod request-body validation helper.
  - `errorHandler.ts`: global JSON error formatter.
- `src/routes/`: Express routers for each API surface.
- `src/controllers/`: “business logic” handlers (e.g. product tracking).
- `src/queue/priceQueue.ts`: BullMQ queue + worker wiring and monitoring logs.
- `src/workers/`
  - `authenticator.ts`: register/login helpers (bcrypt + JWT).
  - `alertChecker.ts`: alert evaluation + Notification + email triggers.
  - `scrapers/aritziaScraper.ts`: Playwright scraper.
- `prisma/schema.prisma`: DB schema.

---

## Request flow (API server)

### 1) Startup (`src/index.ts`)

- Loads `env` (`src/config/env.ts`) and Prisma client.
- Applies middleware:
  - CORS (frontend origin from `FRONTEND_URL`)
  - `express.json()`
- Mounts routers:
  - `/health`
  - `/api/auth`
  - `/api/user`
  - `/api/products`
  - `/api/alerts`
  - `/api/notifications`
  - `/api/notifications/stream` (SSE)
- Adds global `errorHandler`

### 2) Auth middleware (`src/middleware/auth.middleware.ts`)

Protected routes use `protect`:

- Reads Bearer token from:
  - `Authorization: Bearer <token>` header **or**
  - `?token=<token>` query (useful for SSE/EventSource)
- Verifies JWT with `JWT_SECRET`
- Loads the user from DB and attaches it to `req.user`

### 3) Validation middleware (`src/middleware/validate.ts`)

Routes use:

```ts
router.post("/...", validate(zodSchema), handler)
```

If validation fails, returns `400` with structured error details.

---

## Main API endpoints (what they do)

### Auth (`src/routes/auth.routes.ts`)

- `POST /api/auth/register`: validates `{ email, password, name }`, creates user, returns `{ token, user }`.
- `POST /api/auth/login`: validates `{ email, password }`, returns `{ token, user }`.

### Products (`src/routes/product.routes.ts`)

- `POST /api/products/track`:
  - normalizes URL + derives an `externalId` (`parseUrl`)
  - upserts `Retailer`, `Product`, and `ProductListing` (inactive/pending initially)
  - **enqueues a BullMQ job** to scrape price
  - returns `{ listingId, status: "PENDING" }`

- `GET /api/products`: returns products (supports pagination via `limit`/`cursor`).
- `GET /api/products/:id`: returns one product with listings + retailer + priceHistory.

- `GET /api/products/health` (protected): returns queue/db/redis health info.
- `POST /api/products/clear-stuck-jobs` (protected): obliterates queue + resets “stuck” listings.

### Alerts (`src/routes/alert.routes.ts`)

- `GET /api/alerts` (protected): list alerts for user.
- `POST /api/alerts` (protected): create alert `{ productId, targetPrice }`.
- `DELETE /api/alerts/:id` (protected): delete alert (ownership enforced).

### Notifications (`src/routes/notification.routes.ts`)

- `GET /api/notifications` (protected): list notifications.
- `PATCH /api/notifications/:id/read` (protected): mark read (ownership enforced).

### Notification stream (`src/routes/notification-stream.routes.ts`)

- `GET /api/notifications/stream` (protected): SSE stream that polls unread notifications and pushes them to the client periodically.

---

## Worker pipeline (scraper not working = usually here)

### Process 1: API enqueues jobs

When you call `POST /api/products/track`, the API **adds a job** to Redis:

```ts
await scrapeQueue.add("scrape-aritzia", { productUrl, listingId })
```

### Process 2: Worker consumes jobs (`src/worker.ts`)

The worker process:

- creates a BullMQ `Worker` (`createScrapeWorker` in `src/queue/priceQueue.ts`)
- starts cron schedules (`initScheduledJobs` in `src/config/scheduler.ts`)

### Process 3: Scraper runs (Playwright)

Worker job handler:

1. Calls `scrapeAritziaPrice(productUrl)` (Playwright navigation + DOM parsing).
2. Calls `saveScrapedPrice(listingId, newPrice, imageUrl, title)`:
   - DB transaction updates listing price + inserts a `PriceHistory` row
   - then triggers `checkAlertsForProduct(productId, newPrice)`

### Process 4: Alert engine

`checkAlertsForProduct`:

- finds active alerts for the product
- checks conditions (e.g. `newPrice <= targetPrice`)
- writes:
  - `Notification` row
  - `PriceAlert.lastNotifiedPrice/At`
  - in a **single transaction**
- sends an email (if SMTP env vars are configured)

---

## Most common reasons “the scraper is not working”

### 1) Worker isn’t running

You need **both** terminals:

- `npm run dev` (API)
- `npm run dev:worker` (worker)

If you only run the API, jobs will sit in Redis as “waiting”.

### 2) Redis isn’t running / connection wrong

BullMQ requires Redis. Check:

- `REDIS_HOST`, `REDIS_PORT` in `.env`
- Redis service actually running locally

API health endpoint can help:

- `GET /api/products/health` (requires auth)

### 3) Playwright browsers not installed

First-time Playwright setup often needs:

- `npx playwright install`

### 4) The URL is invalid / product page doesn’t contain a price

If you try a placeholder URL (e.g. a fake product id), the scraper may fail with “DOM parse error”.

### 5) DOM/selector changes on the target site

Your scraper uses a set of selectors plus a regex fallback. If Aritzia changes the DOM, you’ll see errors like:

- “DOM Parse Error: Could not find price element…”

In that case you update `priceSelectors` and/or change the `waitUntil` strategy.

### 6) Timeouts due to missing meta tags

If a selector isn’t present, Playwright locators can wait a long time. The scraper has an overall timeout, so repeated long waits can cause job failures. Reducing locator timeouts (or checking `count()` first) is the right fix.

---

## Notes on ESM imports (important)

This backend is ESM (`\"type\": \"module\"`). Local imports must resolve correctly at runtime.\nIf the server fails to boot with “Cannot find module …”, it’s often caused by missing `.js` extensions in import paths.

---

## How to debug quickly (practical checklist)

1. **Start API**: `npm run dev` → ensure it logs server URL.\n2. **Start Worker**: `npm run dev:worker` → should log worker start + queue status.\n3. **Track a product**: `POST /api/products/track` with a real URL.\n4. **Watch worker logs**:\n   - “Picked up job …”\n   - scraper logs (navigate, found price)\n   - “Job completed” or “Job failed”\n5. **Check DB**: listing should flip `isActive: true` after a successful scrape and have `PriceHistory` rows.\n\nIf you want, paste the worker log lines around a failure (especially the thrown error), and we can make the scraper more robust for that specific page structure.\n+
