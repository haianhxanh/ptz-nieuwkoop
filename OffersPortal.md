# Offer Portal — Developer Guide

> Supported by **backend** (`server/`) and the **offer portal frontend** (`server/client/`).  
> Internal B2B quoting tool — create offers, manage clients, export PDFs, generate Fakturoid proforma invoices.

---

## Prerequisites

- Node.js ≥ 20 and npm ≥ 10
- Access to the `dmp-udrzby` PostgreSQL database
- The `.env` values (ask the project owner if missing)

---

## Environment variables

### Backend — `server/.env`

```env
PORT=9000
NODE_ENV=development

# dmp-udrzby database — source of all offer portal data (Offers, Clients, Prices, Stock)
DMP_DB=postgres://...         # full Postgres connection URL
DMP_DB_ALLOW_REMOTE=false     # set to "true" to allow connecting to a remote DB outside production

# Cloudflare Access (authentication)
CF_AUTH_ENABLED=false         # set to "true" in production
CF_TEAM_DOMAIN=               # e.g. yourteam.cloudflareaccess.com
CF_ACCESS_AUD=                # Cloudflare Access Application Audience tag

# Nieuwkoop (stock and price source)
NIEUWKOOP_API_STOCK_ENDPOINT=
NIEUWKOOP_API_PRICE_ENDPOINT=
NIEUWKOOP_USERNAME=
NIEUWKOOP_PASSWORD=

# Fakturoid (proforma invoice creation)
FAKTUROID_API=
FAKTUROID_CLIENT_ID=
FAKTUROID_CLIENT_SECRET=

# CORS allowed origins
ALLOWED_ORIGINS=
```

> **Note:** `fakturoidSlug` is **not** an env variable. It is stored per-company in the database and configured through the offer portal Settings page.

### Offer portal frontend — `server/client/.env.local`

```env
# Points to the backend. In production this is the same origin, so it doesn't matter much.
NEXT_PUBLIC_API_URL=http://localhost:9000
```

Copy `server/client/.env.local.example` → `server/client/.env.local` as a starting point.

---

## Local development

You need two terminals running at the same time.

**Terminal 1 — backend**

```bash
cd server
yarn install
yarn build       # compile TypeScript once (creates dist/)
yarn start       # start with nodemon (auto-restarts on changes in dist/)
```

To watch and recompile TypeScript automatically when you edit source files:

```bash
# Terminal 1a — recompile on save
yarn dev:server   # runs: tsc -w

# Terminal 1b — run the compiled output
yarn start
```

**Terminal 2 — offer portal UI**

```bash
cd server/client
npm install
cp .env.local.example .env.local   # first time only
npm run dev          # starts Next.js on http://localhost:3001
```

The offer portal is at **http://localhost:3001**.  
The API is at **http://localhost:9000**.

In development `CF_AUTH_ENABLED=false` is expected, so no Cloudflare token is needed.

---

## Making and deploying changes

### Typical workflow

1. Make your changes in the source files.
2. Commit and push to the main branch.
3. Render auto-deploys on push to main branch

## Project structure (offer portal relevant files)

```
server/
├── src/
│   ├── index.ts                        ← server entry point; mounts Next.js at /app in production
│   ├── routes/
│   │   ├── api.route.ts                ← /api/* routes
│   │   └── offer.route.ts              ← /api/offers/* CRUD
│   ├── controllers/
│   │   ├── offer.controller.ts         ← offer + client CRUD
│   │   ├── config.controller.ts        ← app config key/values
│   │   ├── exchange_rate.controller.ts ← EUR exchange rate
│   │   ├── pdf.controller.ts           ← PDF export
│   │   ├── fakturoid.controller.ts     ← Fakturoid proforma creation/update
│   │   ├── price.controller.ts         ← price data served from DB
│   │   └── stock.controller.ts         ← stock data served from DB
│   ├── model/
│   │   ├── dmp_offer.model.ts          ← mirror of Offer table in dmp-udrzby DB
│   │   ├── dmp_client.model.ts         ← mirror of Client table in dmp-udrzby DB
│   │   ├── dmp_product_price.model.ts  ← mirror of ProductPrice table in dmp-udrzby DB
│   │   ├── dmp_product_stock.model.ts  ← mirror of ProductStock table in dmp-udrzby DB
│   │   ├── dmp_user.model.ts           ← mirror of User table in dmp-udrzby DB
│   │   └── dmp_config.model.ts         ← mirror of Config table in dmp-udrzby DB
│   ├── utilities/
│   │   └── clientAuth.ts               ← Cloudflare Access middleware
│   └── database_connection/
│       └── dmp_db_connect.ts           ← Sequelize connection to dmp-udrzby DB (DMP_DB)
│
└── client/                             ← Next.js offer portal ("offer-portal-client")
    ├── src/
    │   ├── app/
    │   │   └── offers/                 ← offer list, offer detail, PDF export
    │   ├── lib/
    │   │   └── api.ts                  ← all API calls (offers, clients, prices, stock…)
    │   └── middleware.ts               ← Cloudflare Access token check (frontend)
    └── .env.local.example
```

---

## Key API routes

Auth is handled automatically by the frontend. Set `CF_AUTH_ENABLED=false` locally to skip it.

| Route                          | What it does                                           |
| ------------------------------ | ------------------------------------------------------ |
| `/api/offers` + `/:id`         | CRUD for offers, plus duplicate, add items, export PDF |
| `/api/offers/clients`          | CRUD for clients                                       |
| `/api/offers/configs`          | Read/write app config key/value pairs                  |
| `/api/offers/exchange-rate`    | EUR exchange rate (cached 1 hour)                      |
| `/api/fakturoid/invoice`       | Create / update Fakturoid proforma                     |
| `/api/stock`                   | Current stock levels (from DB)                         |
| `/api/prices` + `/prices/sync` | Current price list; sync trigger                       |

---

## Common tasks

### Trigger a price sync manually

Prices are synced automatically from Nieuwkoop every 6 hours on server startup. To sync on demand:

```
GET https://your-render-service.onrender.com/api/prices/sync
```

### Update app config (sell multiplier, company profile, fakturoidSlug, etc.)

Config values live in the database. Edit them through the **Settings** page in the offer portal UI, or directly via the `/api/offers/configs` API.

### Install a new package

```bash
# backend dependency (uses yarn)
cd server && yarn add <package>

# offer portal (frontend) dependency (uses npm)
cd server/client && npm install <package>
```

Commit the updated `package.json` and lock file (`yarn.lock` for backend, `package-lock.json` for frontend). Render will install dependencies automatically during the next build.

### Database schema changes (Offer, Client, ProductStock, ProductPrice)

The offer portal reads from the **`dmp-udrzby`** database (`/Users/hanka/shopify/potzillas/dmp-udrzby`). The models in `server/src/model/dmp_*.model.ts` are Sequelize mirrors of that schema — they describe the table structure to Sequelize but do **not** own or migrate the database.

**The correct workflow for any schema change:**

1. Make the change in the `dmp-udrzby` project first (add the column, new model, etc.) and apply the migration there.
2. Update the corresponding `dmp_*.model.ts` file in this repo to reflect the new shape.
3. Deploy both projects.

> Skipping step 1 and only changing the model file here will have no effect — `DMP_DB_CONNECTION` does not run `sync({ alter: true })`, so no columns are created or altered automatically from this side.
