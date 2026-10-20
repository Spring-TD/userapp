/**
 * Plata merchant dashboard (frontend) API — OpenAPI 3.0 served at /frontendplata only.
 * Separate from the integrator / merchant integration guide at /docs.
 */
import { applicationsKycNotifyPaths } from './frontendPlataApplicationsKycPaths';
import { appsProductsPaths } from './frontendPlataAppsProductsPaths';
import { authTeamPaths } from './frontendPlataAuthTeamPaths';
import { frontendPlataComponentSchemas } from './frontendPlataSchemas';
import { treasuryPaths } from './frontendPlataTreasuryPaths';

const FRONTEND_PLATA_GUIDE = `
# Plata Frontend API (E2E dashboard)

Merchant **dashboard** JWT APIs for the Plata FI console — auth/RBAC, apps, products, loan workflow, treasury, KYC, keys, and notifications.

**Production gateway:** \`https://account-ms-plata.fly.dev\`

| Surface | URL |
|---------|-----|
| This guide (Swagger UI) | \`/frontendplata\` |
| Integrator API keys guide | \`/docs\` |

---

## Authentication

1. \`POST /api/v1/auth/login\` → \`accessToken\`
2. All dashboard calls: \`Authorization: Bearer <accessToken>\`

Do **not** send \`PLATA_PUBLIC_KEY\` / \`PLATA_SECRET_KEY\` on these routes. Keys are for merchant backends via \`/docs\`.

---

## E2E console flow

| Step | What | Start here |
|------|------|------------|
| 1 | Login + RBAC bootstrap | \`POST /auth/login\` → \`GET /auth/me\` |
| 2 | Create / select app | \`GET|POST /apps\` (provisions Billing / Treasury / Repayment) |
| 3 | Business KYC | \`/kyc/business/*\` (first submit may charge Billing) |
| 4 | Build products | \`/products\` wizard + \`PUT /products/{id}\` tabs |
| 5 | Loan/mortgage queue | \`GET …/applications/…/loan-workflow\` → \`PATCH\` status |
| 6 | Treasury console | \`/frontend-plata/treasury/*\` (fund, approve/reject payouts) |
| 7 | Repayment bank payout | \`POST /wallets/repayment/payout\` |
| 8 | Team + API keys | \`/team/*\`, \`/roles/*\`, \`/keys\` |
| 9 | Inbox | \`GET /notifications/user/{userId}\` |

---

## RBAC

| Need | Endpoint |
|------|----------|
| Login session | \`POST /api/v1/auth/login\` → \`permissions[]\`, \`isOwner\`, \`roleName\` |
| Reload | \`GET /api/v1/auth/me\` |
| Permission catalog (Create Role UI) | \`GET /api/v1/roles/permissions\` → \`catalog\` |

Owner: \`isOwner === true\`. Staff: gate UI with \`permissions.includes(…)\`. See \`plata/client-auth-ms/docs/frontend-staff-roles.md\`.

Roles/team are **merchant-scoped** (not \`appId\`). Treasury/products lists usually need \`appId\`.

---

## Money model

| Wallet | Role |
|--------|------|
| **Treasury** | Lend out / approve maturity payouts |
| **Repayment** | Collect deposits, equity, loan repayments; bank payout |
| **Billing** | Platform fees (monthly, business KYC) |

Amounts are **NGN naira** (major units) unless noted.

---

## Response shapes (critical)

| Endpoint | Shape |
|----------|--------|
| \`GET /products?appId=\` | \`data.items\` + \`data.pagination\` |
| \`GET /apps\` | \`data\` = array, \`pagination\` sibling |
| \`GET /apps/{id}/transactions\` | \`data\` = array, \`pagination\` sibling |
| Loan-workflow lists | \`data\` = array, \`meta: { total, limit, skip }\` |
| Treasury queues / wallet txns | \`data.items\` + \`data.pagination\` |
| Notifications inbox | \`limit\` + \`offset\` |
| Product overview by type | \`data.savingsAccounts\` / \`investmentAccounts\` / \`commodityAccounts\` (or loan/mortgage) + \`portfolioAccountsMeta\`; filter \`?portfolioStatus=active\\|inactive\\|all\` |

---

## Savings / investment / commodity account tables

\`GET /api/v1/products/app/{appId}/product-overview/by-type/SAVINGS\` (same for \`INVESTMENT\`, \`COMMODITY\`):

| Goal | Query |
|------|--------|
| Open / approved holdings | \`portfolioStatus=active\` |
| Withdrawn / closed | \`portfolioStatus=inactive\` |
| Everything | omit or \`portfolioStatus=all\` |

Row shapes: \`SavingsPortfolioAccountRow\`, \`InvestmentPortfolioAccountRow\`, \`CommodityPortfolioAccountRow\` in Schemas. Pending maturity cash-outs to approve are under Treasury withdrawals/settlements, not this filter alone.

---

## Loan workflow body

\`PATCH …/loan-workflow\` uses \`loanWorkflowStatus\`: \`requested\` | \`under_review\` | \`approved\` | \`declined\` | \`blacklisted\` (not \`action\`). Equity unpaid → **409**. Approve auto-disburses from Treasury when gates pass.

---

## Treasury console

1. Overview — balances + pending total  
2. Funding instructions — NUBAN for Treasury/Billing  
3. Withdrawals — Approve Selected / Reject  
4. Settlements — Matured investments / commodities / savings; manual or automatic mode  
5. **History** — after decide: \`GET …/treasury/withdrawals/history\` and \`GET …/treasury/settlements/{type}/history\` (\`status=approved|rejected|all\`)

Pending savings withdrawals notify the merchant owner (\`treasury-withdrawal-pending-merchant\`) when enqueued — not a separate HTTP route.
`.trim();

const frontendPlataSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Plata Frontend API',
    version: '2.3.0',
    description: FRONTEND_PLATA_GUIDE
  },
  servers: [
    {
      url: 'https://account-ms-plata.fly.dev',
      description: 'Plata production gateway'
    }
  ],
  tags: [
    { name: 'Auth & Session', description: 'Login, session, profile, password, registration' },
    { name: 'Team & RBAC', description: 'Roles, invitations, staff lifecycle, activity log' },
    { name: 'API Keys', description: 'Merchant programmatic keys (settings UI)' },
    { name: 'Apps', description: 'Create-app: apps, wallets, transactions, analytics' },
    { name: 'Products — Catalog', description: 'List / overview / by-app product tables' },
    { name: 'Products — Builder', description: 'Wizard, configure tabs, uploads, loan schedule' },
    { name: 'Products — Options', description: 'Dropdown option catalogs for product forms' },
    { name: 'Applications — Loan Workflow', description: 'Merchant underwriting queue and actions' },
    { name: 'Treasury — Overview', description: 'Console overview balances' },
    { name: 'Treasury — Wallets', description: 'Ledger + NUBAN funding instructions' },
    { name: 'Treasury — Withdrawals', description: 'Pending withdrawal approve / reject' },
    { name: 'Treasury — Settlements', description: 'Matured settlement queues and mode' },
    { name: 'Wallets — Merchant', description: 'Merchant wallet lookups' },
    { name: 'Wallets — Payout', description: 'Repayment bank payout' },
    { name: 'KYC — Business', description: 'Business KYC onboarding' },
    { name: 'Notifications', description: 'In-app inbox and web push' }
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Access token from POST /api/v1/auth/login'
      }
    },
    schemas: frontendPlataComponentSchemas
  },
  paths: {
    ...authTeamPaths,
    ...appsProductsPaths,
    ...applicationsKycNotifyPaths,
    ...treasuryPaths
  }
};

export default frontendPlataSpec;
