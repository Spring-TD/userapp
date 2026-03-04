# Database seed script

Seeds all MongoDB databases used by SpringTD microservices with sample data.

## Prerequisites

- Node.js 18+
- MongoDB running (local or Docker)

## Setup

From the `springApp` folder:

```bash
npm install
```

## Usage

**Seed all databases (skips collections that already have data):**

```bash
npm run seed
```

**Dry run (no writes):**

```bash
npm run seed:dry
```

## Environment variables

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_BASE_URI` | MongoDB server URI without database name (e.g. `mongodb://admin:adminpassword@localhost:27017`) | `mongodb://admin:adminpassword@localhost:27017` |
| `MONGODB_URI` | Same as above; used if `MONGO_BASE_URI` is not set. Any path after the host is ignored. | — |
| `SEED_PASSWORD` | Password for all seeded user accounts | `SeedPassword123!` |
| `DRY_RUN` | Set to `1` or `true` to only log what would be seeded | — |

## With Docker Compose

If MongoDB is running via `docker-compose.yml` and you run the script from the host:

```bash
MONGO_BASE_URI=mongodb://admin:adminpassword@localhost:27017 npm run seed
```

## Databases and collections seeded

- **service_auth_db**: `roles`, `useraccounts` (merchant, admin, user)
- **client_auth_db**: `roles`, `useraccounts`
- **account_db**: `accounts`, `applications`
- **compliance_db**: `kycprofiles`
- **billing_db**: `subscriptions`
- **payment_db**: `merchantrecords`
- **wallet_ms**: `wallets`, `transactions`
- **product_ms**: `merchantproductconfigurations`
- **create_app_db**: `apps`, `appconfigurations`

Collections that already contain documents are skipped. To re-seed, drop the relevant collections or database first.
