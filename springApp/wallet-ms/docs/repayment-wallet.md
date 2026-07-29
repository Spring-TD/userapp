# Repayment Wallet (SPRING)

> Formerly called the **Settlement Wallet**. Renamed to mirror Backend-platter/Plata's
> `BILLING` / `TREASURY` / `REPAYMENT` naming. Spring does **not** have a Treasury wallet yet,
> and — unlike Plata — Spring keeps a separate **KYC** merchant wallet for KYC link fees.
> All `/settlement/*` routes and `Settlement`-named methods still work as deprecated aliases.

Phase 1 implements the **wallet infrastructure** for the Repayment Wallet diagram: fund wallet (collect in) and payout to bank.

Commission **calculation** (merchant vs OFI splits per product) is phase 2 — product/billing services call `repayment/collect` (legacy alias: `settlement/collect`) with the computed merchant amount.

## Merchant wallet roles (per app)

| Type | Role |
|------|------|
| **BILLING** | Platform fees (monthly per-customer, KYC link) |
| **KYC** | KYC link fee pool (Spring-only; distinct from Repayment) |
| **REPAYMENT** | Merchant commission + customer collections (repayments, deposits, equity). Legacy Mongo: `SETTLEMENT`, or (older still) `KYC`. |

Created via `create-app-ms` → `POST /api/v1/wallets/merchant/all`.

### Legacy lookup / migration

- `merchantWalletTypesForLookup(REPAYMENT)` queries `[REPAYMENT, SETTLEMENT, KYC]` so pre-rename apps are found either way.
- `getMerchantWalletByType` **lazily rewrites** a stored `SETTLEMENT` doc to `REPAYMENT` on read.
- A stored `KYC` doc is **not** rewritten automatically — Spring has a real KYC (link-fee) wallet type, so a stored `KYC` value could legitimately be either the true KYC wallet or a very old settlement wallet. Only the unambiguous `SETTLEMENT` value is auto-migrated.

## Fund wallet — `collectToRepayment`

**Internal:** `POST /api/v1/internal/wallets/repayment/collect` (legacy alias: `/settlement/collect`)
**Auth:** `X-Internal-Token` = shared `JWT_SECRET`

| Mode | `debitUserWallet` | Behavior |
|------|-------------------|----------|
| External (PayOnUs, bank, billing callback) | `false` | Credit Repayment only |
| In-app | `true` | Debit user PRIMARY wallet → credit Repayment |

Idempotent on `referenceId` + `source`. Response includes both `repaymentWallet`/`repaymentTransaction` (primary) and `settlementWallet`/`settlementTransaction` (deprecated, same values) for backward compatibility.

### Collection categories (phase 1 taxonomy)

Maps to the SPRING commission diagram:

| Diagram type | Category constant |
|--------------|-------------------|
| Commodity charges | `COMMODITY_CHARGE` |
| Loan charges / repayments | `LOAN_CHARGE`, `LOAN_REPAYMENT` |
| Mortgage charges / equity | `MORTGAGE_CHARGE`, `MORTGAGE_EQUITY` |
| Account maintenance | `ACCOUNT_MAINTENANCE` |
| Investment charges | `INVESTMENT_CHARGE`, `INVESTMENT_DEPOSIT` |
| Transaction charges | `TRANSACTION_CHARGE` |
| Other services (airtime, data) | `OTHER_SERVICE_CHARGE` |
| Savings / interest | `SAVINGS_DEPOSIT`, `INTEREST_PAYMENT` |

### Example — external collection

```json
POST /api/v1/internal/wallets/repayment/collect
{
  "merchantId": "merchant-uuid",
  "appId": "app-uuid",
  "amount": 1000,
  "referenceId": "commodity-sale-abc123",
  "source": "product-ms",
  "category": "COMMODITY_CHARGE",
  "productId": "prod-1",
  "productType": "COMMODITY",
  "debitUserWallet": false
}
```

### Example — in-app collection

```json
{
  "merchantId": "merchant-uuid",
  "appId": "app-uuid",
  "userId": "user-uuid",
  "amount": 500,
  "referenceId": "savings-dep-xyz",
  "category": "SAVINGS_DEPOSIT",
  "debitUserWallet": true
}
```

### Commodity purchase — split repayment

**Internal:** `POST /api/v1/internal/wallets/commodity/purchase`
**Auth:** `X-Internal-Token`

Debits user PRIMARY once for `baseAmount + commissionAmount`, credits:
- storefront merchant REPAYMENT → `COMMODITY_CHARGE` (commission)
- integrator REPAYMENT → `COMMODITY_DEPOSIT` (principal hold until Plata creator is credited)

`account-ms` then calls Plata via **account-ms-plata gateway** (`PLATA_PUBLIC_KEY` / `PLATA_SECRET_KEY`):
`POST /api/v1/wallets/commodity/principal-repayment` (legacy alias: `principal-settlement`) → credits product creator REPAYMENT (`COMMODITY_DEPOSIT`).
Integrator merchant id for the Spring principal hold comes from `GET /api/v1/gateway/integrator-context` (same keys).

Example: base ₦100 + 1% commission → user debited ₦101; ₦1 to storefront REPAYMENT; ₦100 to Plata creator REPAYMENT.

### Investment apply — split repayment

**Internal:** `POST /api/v1/internal/wallets/investment/purchase`
**Auth:** `X-Internal-Token`

Debits user PRIMARY once for full **principal** (not principal + commission). Credits:
- storefront merchant REPAYMENT → `INVESTMENT_CHARGE` (merchant % of principal, e.g. 1% of ₦1,000 → ₦10)
- integrator REPAYMENT → `INVESTMENT_DEPOSIT` (principal − commission, e.g. ₦990 hold until Plata creator is credited)

`product-ms` on `POST /api/v1/investment-accounts/:applicationId/deposits` calls Plata via **account-ms-plata gateway**:
`POST /api/v1/wallets/investment/principal-settlement` → credits product creator REPAYMENT (`INVESTMENT_DEPOSIT`).

Example: ₦1,000 invest @ 1% merchant fee → user debited ₦1,000; ₦10 to spring merchant REPAYMENT; ₦990 to Plata creator REPAYMENT. (Product ROI % is separate from this repayment split.)

Compensation: `POST /api/v1/internal/wallets/investment/purchase/reverse` if Plata credit fails.

Provision first with `POST /api/v1/investment-accounts` (idempotent per user/product/app/merchant).

### Plata gateway auth (Spring ↔ Plata)

Use `PLATA_PUBLIC_KEY`, `PLATA_SECRET_KEY`, `PLATA_ACCOUNT_SERVICE_URL` on Spring `product-ms`. Principal settlement calls go through `https://account-ms-plata.fly.dev` (gateway verifies keys and forwards `X-Gateway-Verified` / `X-Merchant-Id` to wallet-ms-plata).

When Plata `GET /api/v1/gateway/integrator-context` is unavailable, set:
- `PLATA_INTEGRATOR_MERCHANT_ID` — Spring merchant whose REPAYMENT holds principal pending Plata credit
- `PLATA_INTEGRATOR_APP_ID` — app-scoped REPAYMENT for that hold (defaults to the offering app id)

Do **not** call wallet-ms-plata with internal tokens for creator principal credit.

### E2E verified (Jun 2026)

Production buy on CRBC Fortress Commodity (₦23 base, 1% commission):

- User debited **₦23.23** from PRIMARY
- Storefront merchant `merchant_1774844182734_rm0g5u27l` credited **₦0.23** (`COMMODITY_CHARGE`) on app-scoped NGN repayment wallet (stored as legacy type `KYC`)
- Plata creator `merchant_1779177470485_8h72h70d3` credited **₦23** principal via gateway
- Commodity user account balance **₦23**

Script: `springApp/account-ms/scripts/e2e-commodity-buy.ps1`. Test credentials: `logins.md`.

### Repayment lookup notes

- `getRepaymentWallet` (formerly `getSettlementWallet`, kept as deprecated alias) accepts legacy `KYC` wallets as REPAYMENT (pre-rename apps) — but does **not** lazily rewrite them, since Spring's real KYC wallet uses the same stored value.
- `TREASURY` is **not** REPAYMENT — wrong type caused commission to land on USD treasury before fix.
- Integrator principal hold uses merchant id from `GET /api/v1/gateway/integrator-context` (often service-auth id, not `merchant_*`).

## Payout to bank — `repayment/payout`

**Merchant JWT:** `POST /api/v1/wallets/repayment/payout` (legacy alias: `/settlement/payout`)

Requires active Repayment `virtualNuban` (PayOnUs). Debits Repayment balance and initiates PayOnUs bank transfer.

```json
{
  "appId": "app-uuid",
  "accountNumber": "0123456789",
  "bankCode": "044",
  "accountName": "Merchant Operations",
  "amount": 50000,
  "currency": "NGN",
  "narration": "Repayment withdrawal"
}
```

## PayOnUs inbound default

When a funding callback lacks `merchantWalletType`, `payonusWebhook.ts` defaults to **REPAYMENT** (`PAYONUS_DEFAULT_MERCHANT_WALLET_TYPE`).

## Phase 2 (implemented — product flow wiring)

| # | Charge type | Caller | Category | Trigger |
|---|-------------|--------|----------|---------|
| 1 | Commodity | `account-ms` | `COMMODITY_CHARGE` + `COMMODITY_DEPOSIT` | `POST /api/v1/commodities/buy` — user debited total; commission → storefront REPAYMENT; principal → Plata creator REPAYMENT |
| 2 | Loan | `product-ms` | `LOAN_CHARGE` | No equity: first transfer from loan product wallet → PRIMARY (`transfer-to-primary`); charge withheld atomically from transfer. Equity loans: Plata `approved` webhook (credit REPAYMENT only). |
| 3 | Mortgage | `product-ms` | `MORTGAGE_CHARGE` + `MORTGAGE_EQUITY` | With equity: on `approved` webhook — Spring **principal × merchant%**; creator **equity − fee** via Plata. No equity: atomic on `transfer-to-primary`. |
| 4 | Account maintenance | `billing-ms` | `ACCOUNT_MAINTENANCE` | Monthly scheduler (debits user wallet → Repayment) |
| 5 | Investment | `product-ms` | `INVESTMENT_CHARGE` | `POST /api/v1/investment-accounts/:id/deposits` |
| 6 | Transaction | `payment-ms` | `TRANSACTION_CHARGE` | Record fund/debit with TRANSFER, PAYOUT, etc. |
| 7 | Other services | `payment-ms` | `OTHER_SERVICE_CHARGE` | Record fund/debit with AIRTIME, UTILITY, BILL_PAYMENT |

Merchant commission rate: `springTDFee` / `serviceFee` on merchant product config, else `DEFAULT_MERCHANT_COMMISSION_RATE_PERCENT` (default 1).

Account maintenance: `ACCOUNT_MAINTENANCE_FEE_NGN` (default **₦100**), scheduler `ACCOUNT_MAINTENANCE_INTERVAL`, day `ACCOUNT_MAINTENANCE_BILLING_DAY`.

Payment fees: `feeBreakdown.merchant_commission` (if &gt; 0), else `DEFAULT_TRANSACTION_CHARGE_FIXED_NGN` (default **₦50**), else `DEFAULT_TRANSACTION_CHARGE_PERCENT`. Debits user PRIMARY wallet then credits merchant REPAYMENT (`debitUserWallet: true`).

### No-equity loan charge (transfer trigger)

```
POST /api/v1/wallets/user/:userId/product-applications/:applicationId/transfer-to-primary (wallet-ms)
  → resolve charge via product-ms (principal × merchant %)
  → atomic: loan product wallet −amount; PRIMARY +(amount − charge); REPAYMENT +charge
  → PRIMARY ledger: transfer credit then LOAN_CHARGE debit (net = amount − charge)
```

- **No equity:** charge is **not** collected on Plata `approved`; idempotent `referenceId` = `settlement:loan:transfer:{applicationId}` (legacy reference prefix retained for existing idempotency records); first transfer must be **≥ charge amount**; charge is withheld from the transfer so PRIMARY never goes insufficient.
- **With equity (on `approved` webhook):** Spring storefront REPAYMENT **+principal × merchant%** (`LOAN_CHARGE` / `MORTGAGE_CHARGE`); Backend-platter creator REPAYMENT **+equity − fee** via Plata gateway (`LOAN_EQUITY` / `MORTGAGE_EQUITY`). Example: ₦50M principal, ₦20M equity, 1% → Spring **₦500k**, creator **₦19.5M**.

## Phase 3 (deferred)

- Wire billing-ms loan repayments → `repayment/collect`
- Treasury wallet for loan disbursement (separate from Repayment in Backend-platter)

## Key files

- `src/types/settlementCollection.ts` — categories and input type (`REPAYMENT_COLLECTION_SOURCE`; `SETTLEMENT_COLLECTION_SOURCE` deprecated alias)
- `src/services/walletService.ts` — `collectToRepayment`, `collectCommodityPurchase`, `payoutRepaymentWalletToBank` (deprecated: `collectToSettlement`, `payoutSettlementWalletToBank`)
- `src/utils/merchantWalletType.ts` — legacy `SETTLEMENT`/`KYC` → REPAYMENT lookup
- `src/controllers/internalWalletController.ts` — internal collect + commodity purchase handlers
- `src/controllers/walletController.ts` — merchant payout handler
- `springApp/account-ms/src/services/commodityPurchaseService.ts` — buy orchestration
- `springApp/account-ms/src/services/plataGatewayClient.ts` — Plata gateway client
