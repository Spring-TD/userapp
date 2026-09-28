# Plata merchant & programmatic access model

**Read this before answering questions about Plata, springApp, integrators, API keys, or gateway routes.**

## One tenant, two auth channels

On Plata, the **FI merchant is the integrator**. There is no separate third-party “external integrator” persona.

| Channel | Auth | Who | Typical use |
|---------|------|-----|-------------|
| **Dashboard** | JWT (`Authorization: Bearer`) | Merchant staff | Products, applications, wallets, KYC, team |
| **Programmatic** | `PLATA_PUBLIC_KEY` + `PLATA_SECRET_KEY` | Same merchant’s backends | Catalog sync, external users/applications, principal repayment |

Both channels belong to the **same FI merchant tenant**. API keys are created in the merchant dashboard (Settings → API Keys) and resolve to that merchant’s `merchantId` at the gateway.

## springApp is a merchant, not an external party

**springApp** is a reference merchant deployment (Spring TD). It is **not** a separate integrator calling *into* an FI.

- springApp runs its own microservices locally.
- For Plata-hosted capabilities it calls **upstream** `account-ms-plata` with `PLATA_PUBLIC_KEY`, `PLATA_SECRET_KEY`, and `PLATA_ACCOUNT_SERVICE_URL`.
- Examples: `GET /api/v1/products`, `POST /api/v1/products/external-applications`, `POST /api/v1/wallets/*/principal-repayment`.

When documenting or implementing APIs, treat springApp as **a merchant stack consuming Plata** — the same model as any FI’s own backend.

## Terminology to avoid

| Misleading | Correct |
|------------|---------|
| “External integrator (e.g. Spring)” as a different actor from the FI | **Merchant programmatic API** (API keys) |
| “Integrator-only” features that exclude the FI | Features for the **merchant** via API keys |
| springApp as third-party storefront on someone else’s Plata tenant | springApp as **this repo’s merchant deployment** wired to Plata upstream |

Swagger tags like `Integrator — Product Catalog` mean **merchant API-key routes** on the gateway, not a different customer.

## Gateway (`account-ms-plata`)

- Production: `https://account-ms-plata.fly.dev`
- API-key routes are enforced in `plata/account-ms/src/middleware/merchantGatewayAuth.ts`
- Gateway verifies keys → forwards `X-Gateway-Verified`, `X-Merchant-Id`, etc. to product-ms / wallet-ms

**Current API-key surfaces (representative):**

- `GET /api/v1/products` (no `appId`) — catalog; optional `type=LOAN|MORTGAGE|…`
- `POST /api/v1/products/external-accounts`
- `POST /api/v1/products/external-applications`
- Loan servicing: status / offer / account / repayment-schedule
- `POST /api/v1/wallets/{commodity|savings|investment}/principal-repayment` (+ maturity request/payout)
- Wallet **reads** (scoped to key merchant): merchant wallets + treasury/billing/repayment history; user wallet details + history

**Still JWT dashboard (not API keys):** treasury transfers/debits, repayment payout, balance overrides, and most privileged ledger writes.

## springApp local vs Plata upstream

| Surface | Auth | Proxied by account-ms? |
|---------|------|------------------------|
| Plata gateway (`/api/v1/products`, `/api/v1/wallets/...`) | `PLATA_PUBLIC_KEY` + `PLATA_SECRET_KEY` | Yes (account-ms) |
| springApp `create-app-ms` `/api/v1/special/*` | Legacy `X-Special-Key` + `PLATA_PUBLIC_KEY` | **No** — local stack only |

When wallets and ledger live on **Plata** (`wallet-ms-plata`), transaction reads for merchant backends must go through Plata gateway routes (to be added) or JWT dashboard — not springApp `/api/v1/special/transactions/*` alone.

## Repo layout reminder

- `plata/` — deployable Plata microservices (`*-plata` on Fly)
- `springApp/` — reference merchant deployment calling Plata upstream where configured

## Swagger UI: never share `swaggerUi.serve` across mounts

**Bug (seen live):** https://account-ms.fly.dev/frontendspring/#/ showed **Spring Frontend — Storefront PWA** (and `/api-docs/spec/frontend-storefront`) even though merchant OpenAPI was correct.

| Surface | Correct content |
|---------|-----------------|
| `/frontendspring` + `/frontendspring/openapi.json` | Merchant dashboard — **Spring Frontend API**; tag **Products — Catalog & Turn On**; `GET /api/v1/products` |
| `/frontendstorefront` + `…/openapi.json` | Retail PWA |
| `/api-docs` | Multi-spec hub (dropdown) |

**Root cause:** `swagger-ui-express`’s `swaggerUi.serve` uses a **process-wide** `swagger-ui-init.js`. Each `setup()` overwrites it; the **last** mount wins for every path. Hub was last and had `'urls.primaryName': 'Spring Frontend (Storefront PWA)'`, so `/frontendspring` rendered storefront.

**Always:**

1. Mount each guide with **`swaggerUi.serveFiles(undefined, uiOpts)` + `setup`**, not shared `swaggerUi.serve` (see `mountSwaggerUi` in `springApp/account-ms/src/index.ts`; same rule for `plata/account-ms` if multiple UIs are added).
2. After deploy, verify **`/frontendspring/swagger-ui-init.js`** contains `frontendspring/openapi` and **not** `frontend-storefront`.
3. Do not trust HTML `<title>` alone — confirm `info.title` via openapi.json **and** init.js `url`.
4. Hub `urls.primaryName` must not steal a dedicated path’s identity; dedicated paths must load their own single `url`.

**Symptom checklist:** openapi.json correct + UI wrong title/spec link → shared init singleton, not a missing OpenAPI path.
