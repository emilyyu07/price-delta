# PriceDelta

![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-316192?style=for-the-badge&logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white)

_Automated Retail Intelligence Engine_

---

PriceDelta is a full-stack price tracking app that scrapes retail product pages on a schedule, logs historical price data, and emails you when a tracked item drops below your target price.

---

## Key Features

- **Playwright-Powered Scraping Engine** — Headless Chromium scraper with anti-bot evasion (randomized user agents, stealth scripts, resource blocking) targeting Aritzia product pages, extensible to other retailers.
- **BullMQ + Redis Job Queue** — Scrape requests are enqueued and processed asynchronously with configurable concurrency, staggered delays, and full job lifecycle monitoring (waiting / active / completed / failed).
- **node-cron Scheduled Polling** — Periodic price-check jobs run every 4 hours across all active listings, with a 30-minute quick-sync for recently added products.
- **Real-Time SSE Notification Stream** — Server-Sent Events endpoint pushes unread price-drop notifications to the frontend without client-side polling overhead.
- **JWT + Bcrypt Authentication** — Stateless auth with HS256 JWT tokens and industry-standard password hashing; session state managed entirely client-side via `localStorage`.
- **End-to-End Type Safety** — Shared TypeScript types bridging the Prisma schema, Express controllers, and React components, eliminating runtime type mismatches across the stack.
- **Prisma ORM with Transactional Writes** — Price saves and alert checks are wrapped in `$transaction` blocks; Prisma migrations enforce schema consistency across `User → Product → ProductListing → PriceHistory → PriceAlert → Notification` relations.

---

## Tech Stack

| Layer              | Technology                                                                      |
| ------------------ | ------------------------------------------------------------------------------- |
| **Frontend**       | React 19, TypeScript, Vite 7, Tailwind CSS v4, Recharts, Axios, React Router v7 |
| **Backend**        | Node.js ≥18, Express 5, TypeScript, tsx / ts-node                               |
| **ORM / DB**       | Prisma 6, PostgreSQL 15                                                         |
| **Queue**          | BullMQ 5, ioredis, Redis 7                                                      |
| **Scraping**       | Playwright 1.58 (Chromium)                                                      |
| **Auth**           | jsonwebtoken 9, bcryptjs 3                                                      |
| **Email**          | Nodemailer 7 (SMTP / Gmail)                                                     |
| **Scheduling**     | node-cron 4                                                                     |
| **Infrastructure** | Docker Compose (Redis + PostgreSQL)                                             |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    React Frontend                   │
│  (Vite + Tailwind)  ←─ Axios ─→  Express REST API  │
│                     ←─  SSE  ──  Notification Stream│
└───────────────────────────┬─────────────────────────┘
                            │ HTTP / SSE
┌───────────────────────────▼─────────────────────────┐
│                   Express Backend                   │
│  Controllers → Services → Prisma ORM → PostgreSQL   │
│                     ↕                               │
│         BullMQ Producer  ←→  Redis Queue            │
│                     ↕                               │
│         BullMQ Worker → Playwright Scraper          │
│                     ↕                               │
│         Alert Checker → Nodemailer (SMTP)           │
└─────────────────────────────────────────────────────┘
```

A URL submitted by the user is normalized, persisted as a `ProductListing` (`isActive: false`), and enqueued in Redis. A BullMQ worker picks up the job, launches a headless Chromium context, scrapes price / title / image, and writes the result inside a Prisma transaction. The alert checker then evaluates active `PriceAlert` records and dispatches Nodemailer emails when thresholds are met. Cron jobs re-enqueue stale listings on a schedule.

---

## Prerequisites

| Dependency              | Minimum Version | Notes                                 |
| ----------------------- | --------------- | ------------------------------------- |
| Node.js                 | 18.18.0         | Required by Prisma 6 and Express 5    |
| npm                     | 9.x             | Bundled with Node 18                  |
| Docker & Docker Compose | 20.x / 2.x      | Runs PostgreSQL and Redis             |
| PostgreSQL              | 15              | Managed via Docker Compose            |
| Redis                   | 7 (alpine)      | Managed via Docker Compose            |
| Playwright Chromium     | Auto-installed  | Via `npx playwright install chromium` |

---

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/<your-org>/pricedelta.git
cd pricedelta
```

### 2. Start infrastructure services

```bash
docker compose up -d
```

This starts:

- **PostgreSQL** on `localhost:5432` (user: `admin`, password: `root`, db: `pricedelta`)
- **Redis** on `localhost:6379`

### 3. Configure the backend

```bash
cd backend
cp .env.example .env   # see Configuration section for required values
npm install
```

### 4. Initialize the database

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5. Install Playwright browsers

```bash
npx playwright install chromium
```

### 6. Start the backend server

```bash
npm run dev
```

Confirm it's running:

```bash
curl http://localhost:3001/health
# {"status":"UP","timestamp":"2026-03-14T00:00:00.000Z","uptime":3.2}
```

### 7. Configure and start the frontend

```bash
cd ../frontend
npm install
npm run dev
```

The React app is available at **http://localhost:5173**.

---

## Usage

### Track a product

1. Register at `http://localhost:5173/register`
2. Navigate to **Dashboard**
3. Paste an Aritzia product URL into the tracker input:

```
https://www.aritzia.com/en/product/effortless-pant/77775.html
```

4. Click **Track Price** — the job is queued immediately, with a live progress bar while Playwright runs.
5. On completion you are redirected to the product detail page showing the current price and price history chart.

### Set a price alert

On any product detail page, enter a target price and click **Set Alert**. When the scraper detects a price at or below your target you receive:

- An in-app notification visible at `/notifications` and pushed via the SSE stream
- A transactional email from your configured SMTP sender

### Manually trigger ingestion (development)

```bash
curl http://localhost:3001/api/ingest
```

---

## Configuration

### Backend — `backend/.env`

| Variable       | Type   | Default                 | Purpose                                                             |
| -------------- | ------ | ----------------------- | ------------------------------------------------------------------- |
| `DATABASE_URL` | string | —                       | Prisma PostgreSQL connection string                                 |
| `JWT_SECRET`   | string | —                       | HS256 signing secret (≥32 chars recommended)                        |
| `REDIS_HOST`   | string | `127.0.0.1`             | Redis hostname                                                      |
| `REDIS_PORT`   | number | `6379`                  | Redis port                                                          |
| `SMTP_HOST`    | string | —                       | SMTP server (e.g. `smtp.gmail.com`)                                 |
| `SMTP_PORT`    | number | `587`                   | SMTP port (587 = STARTTLS)                                          |
| `SMTP_USER`    | string | —                       | SMTP sender address                                                 |
| `SMTP_PASS`    | string | —                       | SMTP password or Gmail App Password                                 |
| `FRONTEND_URL` | string | `http://localhost:3000` | Used in welcome-email CTA links                                     |
| `PORT`         | number | `3001`                  | Express server port                                                 |
| `NODE_ENV`     | string | —                       | Set to `production` to suppress stack traces in API error responses |

### Frontend — `frontend/.env` (optional)

| Variable       | Type   | Default                     | Purpose          |
| -------------- | ------ | --------------------------- | ---------------- |
| `VITE_API_URL` | string | `http://localhost:3001/api` | Backend base URL |

### Scraper tuning (`backend/src/queue/priceQueue.ts`)

| Option                 | Current Value | Purpose                                                                  |
| ---------------------- | ------------- | ------------------------------------------------------------------------ |
| `concurrency`          | `1`           | Parallel Playwright workers — increase cautiously to avoid bot detection |
| Cron job delay         | `i * 2000 ms` | Per-listing stagger for cron-enqueued batches                            |
| `maxRetriesPerRequest` | `null`        | Lets BullMQ manage Redis retries internally                              |

### Cron schedule (`backend/src/config/scheduler.ts`)

| Job                  | Cron Expression | Purpose                                           |
| -------------------- | --------------- | ------------------------------------------------- |
| Periodic price check | `0 */4 * * *`   | Re-scrape all active listings every 4 hours       |
| Recent product sync  | `*/30 * * * *`  | Re-scrape listings added within the last 24 hours |

---

## API Reference

All authenticated endpoints require:

```http
Authorization: Bearer <jwt_token>
```

| Method   | Path                                    | Auth | Description                                                            |
| -------- | --------------------------------------- | ---- | ---------------------------------------------------------------------- |
| `POST`   | `/api/auth/register`                    | ✗    | Register a new user; returns `{ token, user }`                         |
| `POST`   | `/api/auth/login`                       | ✗    | Authenticate; returns `{ token, user }`                                |
| `GET`    | `/api/user/me`                          | ✓    | Get the authenticated user's profile                                   |
| `PATCH`  | `/api/user/me`                          | ✓    | Update profile fields (e.g. `name`)                                    |
| `GET`    | `/api/products`                         | ✗    | List all products that have at least one active listing                |
| `GET`    | `/api/products/:id`                     | ✗    | Single product with full price history per listing                     |
| `POST`   | `/api/products/track`                   | ✗    | Submit a URL for scraping; returns `{ listingId, status: "PENDING" }`  |
| `GET`    | `/api/products/track/:listingId/status` | ✗    | Poll scrape status: `PENDING` / `COMPLETED` (+ `productId`) / `FAILED` |
| `GET`    | `/api/alerts`                           | ✓    | List all price alerts for the authenticated user                       |
| `POST`   | `/api/alerts`                           | ✓    | Create an alert — body: `{ productId: string, targetPrice: number }`   |
| `DELETE` | `/api/alerts/:id`                       | ✓    | Delete a price alert by ID                                             |
| `GET`    | `/api/notifications`                    | ✓    | List all notifications for the user, newest first                      |
| `PATCH`  | `/api/notifications/:id/read`           | ✓    | Mark a notification as read                                            |
| `GET`    | `/api/notifications/stream`             | ✓    | SSE stream — pushes `{ type, data }` every 30 s                        |
| `GET`    | `/health`                               | ✗    | Health check — returns `{ status, uptime, timestamp }`                 |

---

## Project Structure

```
pricedelta/
├── docker-compose.yml              # PostgreSQL + Redis services
├── backend/
│   ├── prisma/                     # schema.prisma + migrations
│   └── src/
│       ├── config/                 # Prisma client, Nodemailer transport, node-cron init
│       ├── controllers/            # Route handler functions
│       ├── middleware/             # JWT auth guard, global error handler
│       ├── queue/                  # BullMQ queue definition + worker
│       ├── routes/                 # Express routers (auth, products, alerts, notifications, user)
│       ├── services/               # price.service — transactional price writes + alert dispatch
│       ├── utils/                  # URL parser, store-name extractor
│       ├── workers/                # Playwright scraper, alert checker, authenticator
│       └── index.ts                # App entry point — registers middleware, routes, cron
└── frontend/
    ├── public/                     # Static assets, service worker (sw.js)
    └── src/
        ├── api/                    # Axios service modules (auth, products, alerts, notifications, user)
        ├── components/             # UI primitives, layout, product cards, notification widgets
        ├── contexts/               # AuthContext + AuthProvider
        ├── hooks/                  # useAuth, useRealTimeNotifications, useBackgroundScraping
        ├── pages/                  # Route-level page components
        ├── services/               # auth.service — token storage helpers
        ├── types/                  # Shared TypeScript interfaces (Product, Alert, Notification …)
        └── utils/                  # formatCurrency, formatDate, cn() class merger
```

---

## Extending to Other Retailers

The scraper is currently scoped to Aritzia. To add a new retailer:

1. Create `backend/src/workers/scrapers/<retailer>Scraper.ts` returning `{ price: number, imageUrl: string | null, title: string | null }`.
2. Extend `parseUrl` in `backend/src/utils/urlParser.ts` to handle the new domain's URL structure and extract an `externalId`.
3. Update the `trackProduct` controller to select the correct scraper based on hostname.
4. Insert a `Retailer` record via a Prisma seed or migration.

---
