# PriceDelta — Agent Briefing Document

**For:** GitHub Copilot / AI coding assistants  
**Purpose:** Full project context to load at the start of every session  
**Repo:** `github.com/emilyyu07/priceDelta`  
**Last updated:** See git log

> **Always read `pricedelta-spec.md` alongside this file.**  
> That document tracks outstanding bugs and features with completion checkboxes.  
> This document explains what the project _is_. That document explains what still needs _doing_.

---

## 1. What This Project Is

PriceDelta is a **fullstack price-tracking web application**. Users paste an Aritzia product URL into a dashboard, and the system:

1. Enqueues a scrape job in Redis via BullMQ
2. A BullMQ worker launches a headless Chromium instance (Playwright) to scrape the live price, title, and image
3. The result is written to PostgreSQL inside a Prisma transaction
4. The alert engine checks if any user's target price has been met and sends an email via Nodemailer
5. In-app notifications are pushed to the frontend via a Server-Sent Events (SSE) stream

The target user is a fashion-conscious shopper who wants to buy from Aritzia but only at the right price. The scraper is currently scoped to Aritzia only, but the architecture is designed to be extensible to other retailers.

---

## 2. Monorepo Structure

```
pricedelta/
├── .github/
│   └── copilot-instructions.md     ← YOU ARE HERE
├── docker-compose.yml               ← Starts PostgreSQL + Redis only (not the app)
├── pricedelta-spec.md               ← Outstanding tasks and bugs — read this every session
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma            ← Source of truth for all data models
│   │   └── migrations/              ← Migration history (4 migrations so far)
│   └── src/
│       ├── config/
│       │   ├── prisma.ts            ← PrismaClient singleton
│       │   ├── mail.ts              ← Nodemailer transporter + sendPriceDropEmail()
│       │   └── scheduler.ts        ← node-cron: 4-hour full sweep + 30-min recent sync
│       ├── controllers/
│       │   ├── health.controller.ts
│       │   ├── product.controller.ts ← trackProduct, getTrackStatus, getQueueHealth, clearStuckJobs
│       │   └── user.controller.ts
│       ├── middleware/
│       │   ├── auth.middleware.ts   ← JWT protect() guard + AuthRequest interface
│       │   └── errorHandler.ts      ← Global Express error handler
│       ├── queue/
│       │   └── priceQueue.ts        ← BullMQ Queue + Worker definition (CURRENTLY SAME FILE)
│       ├── routes/
│       │   ├── alert.routes.ts
│       │   ├── auth.routes.ts
│       │   ├── health.routes.ts
│       │   ├── notification-stream.routes.ts ← SSE endpoint
│       │   ├── notification.routes.ts
│       │   ├── product.routes.ts
│       │   └── user.routes.ts
│       ├── services/
│       │   └── price.service.ts     ← saveScrapedPrice() — the core transactional write
│       ├── utils/
│       │   └── urlParser.ts         ← parseUrl(), extractStoreName()
│       ├── workers/
│       │   ├── alertChecker.ts      ← checkAlertsForProduct() — queries alerts, sends email
│       │   ├── authenticator.ts     ← registerUser(), loginUser() — bcrypt + JWT
│       │   └── scrapers/
│       │       └── aritziaScraper.ts ← Playwright scraper with global browser instance
│       └── index.ts                 ← Express app entry point
└── frontend/
    └── src/
        ├── api/                     ← Axios service modules (auth, products, alerts, notifications, user)
        ├── components/
        │   ├── common/              ← Button, Card, Input primitives
        │   ├── dashboard/           ← Dashboard.tsx, ProductTracker.tsx
        │   ├── layout/              ← Header.tsx, Layout.tsx, AmbientBackground.tsx
        │   ├── notifications/       ← NotificationProvider, NotificationContext, NotificationBell
        │   ├── products/            ← ProductCard.tsx, ProductGrid.tsx
        │   └── ui/                  ← AnimatedButton, AnimatedInput, AnimatedStats, LoadingSpinner, etc.
        ├── contexts/
        │   ├── AuthContext.tsx       ← AuthContextType interface + createContext
        │   └── AuthProvider.tsx     ← State, login/logout/register, auto-refresh on mount
        ├── hooks/
        │   ├── useAuth.ts
        │   └── useRealTimeNotifications.ts ← EventSource SSE connection (currently broken — see spec T1-1)
        ├── pages/                   ← LoginPage, RegisterPage, Dashboard wrapper, ProductsPage,
        │                               ProductDetailPage, AlertsPage, NotificationsPage, ProfilePage
        ├── services/
        │   └── auth.service.ts      ← localStorage token helpers (getToken, loginApi, logoutApi)
        ├── types/
        │   └── index.ts             ← All shared TS interfaces (Product, ProductListing, Retailer,
        │                               PriceHistory, PriceAlert, Notification, User)
        └── utils/
            ├── cn.ts                ← clsx + tailwind-merge helper
            └── formatters.ts        ← formatCurrency, formatDate, formatRelativeTime
```

---

## 3. Tech Stack

### Backend

| Layer              | Technology                  | Version  | Notes                                        |
| ------------------ | --------------------------- | -------- | -------------------------------------------- |
| Runtime            | Node.js                     | ≥18.18   | Required by Prisma 6                         |
| Framework          | Express                     | 5.x      | Note: Express 5 has minor API diffs from 4.x |
| Language           | TypeScript                  | 5.9      | `strict: true`, CommonJS module output       |
| ORM                | Prisma                      | 6.0      | PostgreSQL provider                          |
| Database           | PostgreSQL                  | 15       | Runs in Docker on port **5433** (not 5432)   |
| Job Queue          | BullMQ                      | 5.x      | Backed by Redis                              |
| Cache/Queue broker | Redis                       | 7 alpine | Runs in Docker on port 6379                  |
| Scraping           | Playwright (Chromium)       | 1.58     | Headless, single global browser instance     |
| Auth               | jsonwebtoken 9 + bcryptjs 3 | —        | HS256, 1-hour expiry (no refresh yet)        |
| Email              | Nodemailer 7                | —        | SMTP / Gmail App Password                    |
| Scheduling         | node-cron 4                 | —        | Two jobs: `0 */4 * * *` and `*/30 * * * *`   |
| Dev runner         | tsx + nodemon               | —        | `nodemon --exec tsx src/index.ts`            |

### Frontend

| Layer       | Technology            | Version | Notes                                           |
| ----------- | --------------------- | ------- | ----------------------------------------------- |
| Framework   | React                 | 19.x    | With strict mode                                |
| Language    | TypeScript            | 5.9     | `verbatimModuleSyntax`, `strict: true`          |
| Bundler     | Vite                  | 7.x     | Dev on port 5173                                |
| Styling     | Tailwind CSS          | v4.x    | CSS-based config via `@theme {}` in `index.css` |
| Routing     | React Router          | v7      | `BrowserRouter` + `Routes`                      |
| HTTP client | Axios                 | 1.x     | Interceptor attaches JWT from localStorage      |
| Charts      | Recharts              | 3.x     | Price history line chart on ProductDetailPage   |
| Icons       | lucide-react          | 0.562   |                                                 |
| CSS utils   | clsx + tailwind-merge | —       | Exposed via `src/utils/cn.ts`                   |

### Infrastructure

| Service       | How it runs                    | Port                    |
| ------------- | ------------------------------ | ----------------------- |
| PostgreSQL 15 | `docker compose up -d`         | 5433 → 5432 (container) |
| Redis 7       | `docker compose up -d`         | 6379                    |
| Backend API   | `npm run dev` (in `/backend`)  | 3001                    |
| Frontend      | `npm run dev` (in `/frontend`) | 5173                    |

---

## 4. Data Model (Prisma Schema Summary)

All models are in `backend/prisma/schema.prisma`. Key relationships:

```
User
 └── PriceAlert[]       (userId FK, productId FK)
 └── Notification[]     (userId FK, alertId FK nullable)
 └── SavedSearch[]

Product
 └── ProductListing[]   (productId FK, retailerId FK) — UNIQUE(productId, retailerId)
 └── PriceAlert[]

ProductListing
 └── PriceHistory[]     (listingId FK)
 └── Retailer           (retailerId FK)

Retailer
 └── ProductListing[]
```

**Key field notes:**

- `ProductListing.currentPrice` — `Decimal(10,2)`, updated on every scrape
- `ProductListing.isActive` — `false` while scrape is pending, `true` after first successful scrape
- `ProductListing.url` — the clean URL (no query params) used for re-scraping
- `PriceAlert.lastNotifiedPrice` — anti-spam: we do NOT re-notify if price hasn't changed since last notification
- `PriceAlert.lastNotifiedAt` — timestamp of last notification sent
- `Product.externalId` — the numeric ID extracted from the Aritzia URL path (e.g., `77775` from `.../77775.html`)
- `Product.url` — clean product URL stored on the product itself (added in migration `20260303`)

**Migration history (chronological):**

1. `20260101_init` — full schema bootstrap
2. `20260103_add_current_price_to_listing` — adds `currentPrice` to `ProductListing`
3. `20260108_add_notification_tracks` — adds `lastNotifiedAt` + `lastNotifiedPrice` to `PriceAlert`
4. `20260124_add_pw_to_user` — adds `password` column with temp default `'changelater'`
5. `20260303_add_product_url` — adds `url` to `Product`, drops the password default

---

## 5. Core Data Flows

### Flow 1: User Tracks a New Product

```
POST /api/products/track { url }
  → urlParser.parseUrl(url)          → extracts cleanUrl + externalId
  → extractStoreName(cleanUrl)       → "Aritzia"
  → prisma.retailer.upsert()         → get or create Retailer record
  → prisma.product.upsert()          → get or create Product by externalId
  → prisma.productListing.upsert()   → get or create Listing (isActive: false, currentPrice: 0)
  → scrapeQueue.add("scrape-aritzia", { productUrl, listingId })
  → 202 response { listingId, status: "PENDING" }

Frontend polls GET /api/products/track/:listingId/status every 3s
  → listing.isActive === false → { status: "PENDING" }
  → listing.isActive === true  → { status: "COMPLETED", productId, price }
  → On COMPLETED: navigate to /products/:productId
```

### Flow 2: BullMQ Worker Processes a Scrape Job

```
BullMQ Worker picks up job { productUrl, listingId }
  → scrapeAritziaPrice(productUrl)
      → reuse globalBrowser (or launch new Chromium)
      → newContext() with random user agent + stealth scripts
      → page.goto(productUrl, { waitUntil: "domcontentloaded" })
      → randomized delay (1.5–4s)
      → try multiple CSS selectors for price
      → extract og:title and og:image
      → context.close()
      → return { price, imageUrl, title }
  → saveScrapedPrice(listingId, price, imageUrl, title)
      → prisma.$transaction([
          productListing.update({ currentPrice: price, isActive: true }),
          product.update({ imageUrl, title }),   // if provided
          priceHistory.create({ price })
        ])
      → checkAlertsForProduct(productId, price)
          → find active PriceAlerts where targetPrice >= price
          → skip if lastNotifiedPrice === price (anti-spam)
          → prisma.$transaction([
              notification.create({ type: "PRICE_DROP", ... }),
              priceAlert.update({ lastNotifiedPrice, lastNotifiedAt })
            ])
          → sendPriceDropEmail(user.email, product.title, price, productUrl)
```

### Flow 3: SSE Notification Stream

```
Frontend: new EventSource(`/api/notifications/stream?token=${token}`)
  ⚠️ CURRENTLY BROKEN — see pricedelta-spec.md T1-1 and T1-2

Backend: GET /api/notifications/stream
  → protect middleware validates JWT
  → sends initial "connected" event
  → setInterval(30s): fetchUnreadNotifications → send as SSE data
  → req.on("close"): clearInterval, log disconnect
```

### Flow 4: Cron Scheduler (runs inside the API process — should be separated)

```
Every 4 hours: find all active listings → scrapeQueue.add() with 2s stagger between each
Every 30 min:  find listings created in last 24h → scrapeQueue.add()
```

---

## 6. Authentication Flow

- **Register:** `POST /api/auth/register { email, password }` → bcrypt hash → create User → sign JWT (1h) → return `{ token, user }`
- **Login:** `POST /api/auth/login { email, password }` → find user → bcrypt.compare → sign JWT (1h) → return `{ token, user }`
- **Token storage:** `localStorage` (XSS-vulnerable — known tradeoff, documented)
- **Request auth:** Axios interceptor reads token from localStorage, adds `Authorization: Bearer <token>` header
- **Middleware:** `protect()` in `auth.middleware.ts` — decodes JWT → fetches user from DB → attaches to `req.user`
- **Known issue:** `req.user` is typed as `any` — see spec T2-6

**No refresh token system yet.** Token expires after 1 hour and the user is silently logged out. Refresh token implementation is tracked in spec T3-4.

---

## 7. Frontend Architecture

### Routing (React Router v7)

All routes under `/` require authentication via `<ProtectedRoute>`. Unauthenticated users are redirected to `/login`.

```
/login          → LoginPage (public)
/register       → RegisterPage (public)
/dashboard      → Dashboard (protected) — ProductTracker + stats + recent products
/products       → ProductsPage (protected) — full product grid
/products/:id   → ProductDetailPage (protected) — price chart + alert creation
/alerts         → AlertsPage (protected)
/notifications  → NotificationsPage (protected)
/profile        → ProfilePage (protected)
```

### State Management

- **Auth state:** React Context (`AuthContext` + `AuthProvider`) — user, isAuthenticated, isLoading
- **Server state:** Manual `useState` + `useEffect` in each page (React Query not yet installed — tracked in spec T3-5)
- **Notification state:** `useRealTimeNotifications` hook → `NotificationContext` → `NotificationProvider`

### Styling System

Tailwind v4 with CSS-variable-based theme defined in `frontend/src/index.css` under `@theme {}`.

**Color palette (primary brand):**

```
primary-50  → #edf2f9  (page background)
primary-100 → #c8eaf9  (tinted surfaces)
primary-200 → #90d2f0  (borders)
primary-500 → #2e97d4  (dominant blue — icons, links)
primary-700 → #1a6fbb  (CTA buttons, dark accents)
primary-900 → #0f3460  (nav, strong headings)
```

**Custom utility classes** (defined in `index.css`):

- `.ambient-page` — full-page background wrapper
- `.ambient-auth-card` — glassmorphism card used on login/register
- `.frosted-surface` — frosted glass card used throughout the app
- `.font-sleek` / `.font-chic` — custom typography utilities
- `.animate-float`, `.animate-shimmer`, `.animate-badge-pop` — animation utilities

---

## 8. Key Conventions & Patterns

### Backend Conventions

- **All routes** import `protect` from `auth.middleware.ts` for authenticated endpoints
- **Controllers** receive `(req: AuthRequest, res: Response)` — use `AuthRequest` not `Request` for authenticated routes
- **Error handling** — throw errors in controllers/services, caught by global `errorHandler` middleware in `index.ts`
- **Prisma** — import the singleton from `config/prisma.ts`, never `new PrismaClient()` directly
- **Environment variables** — currently accessed via `process.env.*` directly (migration to `config/env.ts` with Zod is a spec task T1-7)
- **TypeScript module system** — `"module": "CommonJS"` in `tsconfig.json`. Use `.js` extensions in imports when tsx requires it (e.g., `import prisma from "../config/prisma.js"`)

### Frontend Conventions

- **API calls** — always go through the service modules in `src/api/`. Never call `axios` directly in components.
- **Auth token** — use `localStorage.getItem("token")` / `localStorage.setItem("token", ...)` only through `src/services/auth.service.ts`
- **Shared types** — all TypeScript interfaces live in `src/types/index.ts`. Do not define inline types in components.
- **Class merging** — use `cn()` from `src/utils/cn.ts` (wraps `clsx` + `tailwind-merge`) for conditional class strings
- **Forms** — no `<form>` tags; use `onClick` handlers directly on buttons (Vite/React convention here)
- **Prices from API** — come as strings (Prisma `Decimal` serializes to string). Always `parseFloat(listing.currentPrice)` before display or math.

---

## 9. Known Bugs (Quick Reference)

Full details are in `pricedelta-spec.md`. Here is the fast-lookup summary:

| ID   | File                                                 | Bug                                                                                                                 |
| ---- | ---------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| T1-1 | `useRealTimeNotifications.ts` + `auth.middleware.ts` | SSE returns 401 — `EventSource` can't send auth headers                                                             |
| T1-2 | `notification-stream.routes.ts`                      | Route resolves to `/stream/stream` — wrong path                                                                     |
| T1-3 | `product.controller.ts`                              | Retailer upsert hardcodes `name: "Aritzia"`                                                                         |
| T1-4 | `product.routes.ts`                                  | `/health` and `/clear-stuck-jobs` have no auth — anyone can obliterate the queue                                    |
| T1-5 | `aritziaScraper.ts`                                  | No `isConnected()` check — crashed browser leaves worker in permanent failure state                                 |
| T1-6 | `index.ts`                                           | `cors()` with no config — accepts requests from any origin                                                          |
| T1-7 | (missing file)                                       | No env var validation — app boots silently with missing secrets                                                     |
| T1-8 | `ProductsPage.tsx`                                   | Search bar `console.log`s and does nothing                                                                          |
| T1-9 | Multiple                                             | Dead files: empty `notification.controller.ts`, unused `AnimatedProductCard.tsx`, unused `useBackgroundScraping.ts` |

---

## 10. Environment Setup

### Prerequisites

- Node.js ≥18.18
- Docker + Docker Compose
- A Gmail account with App Password for SMTP (or any SMTP provider)

### Local Dev Start Sequence

```bash
# 1. Start infrastructure
docker compose up -d

# 2. Backend
cd backend
cp .env.example .env    # fill in values
npm install
npx prisma migrate dev
npx playwright install chromium
npm run dev             # starts on :3001

# 3. Frontend (separate terminal)
cd frontend
npm install
npm run dev             # starts on :5173
```

### Required Environment Variables (`backend/.env`)

```
DATABASE_URL="postgresql://admin:root@localhost:5433/pricedelta"
JWT_SECRET="<min 32 chars>"
REDIS_HOST="127.0.0.1"
REDIS_PORT=6379
PORT=3001
NODE_ENV=development
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your@gmail.com"
SMTP_PASS="your-app-password"
FRONTEND_URL="http://localhost:5173"
```

### Optional (`frontend/.env`)

```
VITE_API_URL="http://localhost:3001/api"   # defaults to this if omitted
```

---

## 11. What Is NOT Yet Built (Spec Backlog)

These are planned features that do not exist yet. Do not assume they are implemented.

- **Zod input validation** on request bodies (spec T2-1)
- **Rate limiting** on auth endpoints (spec T2-2)
- **Separate worker entry point** — `backend/src/worker.ts` (spec T2-3); currently worker runs inside `index.ts`
- **Graceful shutdown** — no SIGTERM handler (spec T2-4)
- **Structured logging** — `console.log` everywhere, no pino/winston (spec T2-5)
- **Typed `req.user`** — currently `any` (spec T2-6)
- **Cursor-based pagination** on `GET /api/products` (spec T2-7)
- **Any tests** — `npm test` currently exits with error code 1 (spec T2-8)
- **GitHub Actions CI** (spec T3-1)
- **Dockerfiles** for the app itself (spec T3-2)
- **`.env.example` files** (spec T3-3)
- **Refresh tokens** — currently 1-hour JWT with no refresh (spec T3-4)
- **React Query** — all data fetching is manual `useState + useEffect` (spec T3-5)
- **Error boundaries** — unhandled React errors crash the whole app (spec T3-8)
- **OpenAPI / Swagger docs** (spec T3-7)

---

## 12. Scraper Notes (Aritzia-Specific)

The scraper in `aritziaScraper.ts` is the most fragile part of the system. Key implementation details:

- **Global browser instance** — `globalBrowser` is reused across jobs to avoid Chromium cold-start cost. One new `BrowserContext` is created per job and closed in `finally`.
- **Anti-bot measures:** randomized user agents (3 options), stealth init script (removes `navigator.webdriver`), resource blocking (images, fonts, CSS), randomized delay (1.5–4s), locale + timezone spoofing
- **Price selector cascade:** tries `[data-testid="product-list-price-text"]`, then sale price selector, then generic `[class*="price"]`, then regex match on `$` pattern
- **Title extraction cascade:** og:title → h1 → page title (cleaned)
- **Image extraction cascade:** og:image → twitter:image → product img selector → first 5 images scan
- **60-second hard timeout** on the entire scrape using `Promise.race`
- **Known fragility:** If Aritzia changes their DOM structure, all selectors break. This is expected and acceptable for a portfolio project.

**URL format this scraper expects:**

```
https://www.aritzia.com/en/product/<product-name>/<numeric-id>.html
```

The numeric ID is what gets stored as `Product.externalId`.

---

## 13. Files to Never Touch / Be Careful With

| File                           | Reason                                                                                                     |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `backend/prisma/migrations/`   | Never hand-edit migration files. Use `npx prisma migrate dev --name <name>`                                |
| `backend/prisma/schema.prisma` | Central data model. Changes require a new migration.                                                       |
| `frontend/src/index.css`       | Contains the full Tailwind v4 theme and all animation keyframes. Large file, changes affect the whole app. |
| `docker-compose.yml`           | Note PostgreSQL maps to host port **5433**, not 5432. `DATABASE_URL` must use 5433.                        |

---

## 14. Session Checklist for the Agent

At the start of every session, confirm:

- [ ] Which spec tasks (`pricedelta-spec.md`) are we working on today?
- [ ] Is the task in Tier 1 (blocking), Tier 2 (high), or Tier 3 (signal)?
- [ ] What files will be modified?
- [ ] Does the task require a new Prisma migration?
- [ ] Does the task require new npm packages? If so, in which directory (`backend` or `frontend`)?
- [ ] Should a test be written alongside this change?
