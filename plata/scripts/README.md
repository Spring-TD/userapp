# Plata seed script

This script populates microservice databases with seed data for three users (admin@example.com, merchant@example.com, user@example.com). It seeds **client-auth-ms** first, then all other services using those users.

## Prerequisites

1. **MongoDB** must be running (e.g. `docker-compose up -d mongodb` from `plata/`, or a remote instance such as Digital Ocean).

## What gets seeded

- **client-auth-ms**: Four users (admin, merchant, user, user-ref) with password `Password123!` for the first three if the `users` collection is empty.
- **account-ms**: Gateway only (no database); not seeded.
- **billing-ms**: One `Subscription` for the merchant and one for the end user; one sample `Transaction` (payment).
- **create-app-ms**: One `App` (draft) for the merchant (seeded-merchant-001).
- **wallet-ms**: Three merchant wallets (Treasury, Operation, KYC) for the merchant; one user wallet for the end user.
- **payment-ms**: One `MerchantRecord` for the merchant, one `MerchantUserRecord` for the end user.
- **notifications-ms**: One sample notification per user (welcome email).
- **product-ms**: One `Product` (Savings, incomplete) for the merchant (appId = seeded-merchant-001).
- **service-auth-ms**: Two `Role`s for the seeded merchant (Admin, Member).
- **compliance-ms**: One KYC profile per user (admin, merchant, user) with one sample document each; status `pending`.

## Environment variables

### Base URI approach (Recommended)

You can now use a single base URI with default database names:

| Variable | Purpose | Default |
|----------|---------|--------|
| `MONGODB_BASE_URI` | Base MongoDB connection string (host + optional query; path ignored) | `mongodb://admin:adminpassword@localhost:27017` |

With `MONGODB_BASE_URI` set, the script builds each service URI as `base + "/" + dbName + "?authSource=admin"` (or reuses the base’s query if present). Default database names:

| Service | Database Name |
|---------|---------------|
| client-auth-ms | `client_auth_db` |
| billing-ms | `billing_db` |
| create-app-ms | `create-app-ms` |
| wallet-ms | `wallet_ms` |
| payment-ms | `payment_ms` |
| notifications-ms | `notifications_db` |
| product-ms | `product_ms` |
| service-auth-ms | `service_auth_db` |
| compliance-ms | `compliance_db` |

### Individual service override (Optional)

You can still override any individual service URI if needed:

| Variable | Purpose |
|----------|---------|
| `CLIENT_AUTH_MONGODB_URI` | client-auth-ms DB (overrides base + default) |
| `BILLING_MS_MONGODB_URI` | billing-ms DB (overrides base + default) |
| `CREATE_APP_MONGODB_URI` | create-app-ms DB (overrides base + default) |
| `WALLET_MS_MONGODB_URI` | wallet-ms DB (overrides base + default) |
| `PAYMENT_MS_MONGODB_URI` | payment-ms DB (overrides base + default) |
| `NOTIFICATIONS_MS_MONGODB_URI` | notifications-ms DB (overrides base + default) |
| `PRODUCT_MS_MONGODB_URI` | product-ms DB (overrides base + default) |
| `SERVICE_AUTH_MONGODB_URI` | service-auth-ms DB (overrides base + default) |
| `COMPLIANCE_MS_MONGODB_URI` | compliance-ms DB (overrides base + default) |

### Example

To use the base URI approach, set only:

```bash
MONGODB_BASE_URI=mongodb://doadmin:YOUR_PASSWORD@your-db-host.db.ondigitalocean.com:27017?authSource=admin
```

The script will then build each service URI from the base and the default database name for that service (e.g. `.../client_auth_db?authSource=admin`).

If you need to override a specific service, you can still set its individual variable:

```bash
MONGODB_BASE_URI=mongodb://doadmin:YOUR_PASSWORD@your-db-host.db.ondigitalocean.com:27017?authSource=admin
CLIENT_AUTH_MONGODB_URI=mongodb://special-user:special-password@special-host.com:27017/special_client_auth_db?authSource=admin
```

## Run

From `plata/scripts`:

```bash
npm install
npm run seed
```

From `plata` (after installing once in `scripts`):

```bash
cd scripts && npm install && npm run seed
```

The script is idempotent per service: if a service already has data (e.g. accounts or wallets), that part is skipped.