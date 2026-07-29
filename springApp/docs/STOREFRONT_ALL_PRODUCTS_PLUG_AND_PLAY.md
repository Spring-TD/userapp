# Storefront plug-and-play — all product types

End-to-end guide for the Spring retail storefront (e.g. `https://crbc.tryspring.io`) so a logged-in user can apply for **any** turned-on product and complete the flow successfully.

**Related docs:** [STOREFRONT_PRODUCT_APPLICATION.md](./STOREFRONT_PRODUCT_APPLICATION.md) (loan/mortgage deep dive), [STOREFRONT_PWA_INTEGRATION.md](../STOREFRONT_PWA_INTEGRATION.md) (screens + wallets).

---

## 0. Quick decision tree (use this first)

```text
Login → load product by LOCAL id → read product.type
  │
  ├─ LOAN / MORTGAGE  → multi-step applications flow (init → … → submit)
  ├─ SAVINGS          → POST /savings-accounts  then  POST …/deposits
  ├─ INVESTMENT       → POST /investment-accounts  then  POST …/deposits
  └─ COMMODITY        → POST /commodity-accounts/apply  (enroll + fund in one call)
```

**Never** call `POST /api/v1/applications/apply` or `/applications/init` for `SAVINGS`, `INVESTMENT`, or `COMMODITY` — the API returns `400` and tells you which endpoint to use.

| Type | Provision / apply | Fund | Resume / status |
|------|-------------------|------|-----------------|
| `LOAN` | `POST /applications/init` → … → `POST /applications/:id/submit` | Equity / charges after approval (see §5) | `GET /applications/:id` |
| `MORTGAGE` | Same as LOAN + mortgage selection on submit | Down payment / equity after approval (§5) | Same + pending-approved mortgage APIs |
| `SAVINGS` | `POST /savings-accounts` | `POST /savings-accounts/:id/deposits` | `GET …/deposit-details` |
| `INVESTMENT` | `POST /investment-accounts` | `POST /investment-accounts/:id/deposits` | `GET …/deposit-details` |
| `COMMODITY` | `POST /commodity-accounts/apply` | Included in apply (wallet debit) | `GET /commodity-accounts/:id?userId=` |

---

## 1. Base URL, auth, tenant

### Prefer same-origin on the tenant host

```text
https://{tenant}.tryspring.io
```

Gateway sets `x-tenant-app-id` / `x-tenant-merchant-id`. Prefer relative `/api/v1/…` calls.

### Fallback gateway (when local Next proxy lacks a path)

```text
https://account-ms.fly.dev
```

Proxied to Spring `product-ms` / `wallet-ms` / etc.:

| Prefix | Backend |
|--------|---------|
| `/api/v1/auth`, `/api/v1/user`, … | client-auth-ms |
| `/api/v1/products`, `/api/v1/applications` | product-ms |
| `/api/v1/savings-accounts` | product-ms |
| `/api/v1/investment-accounts` | product-ms |
| `/api/v1/commodity-accounts` | product-ms |
| `/api/v1/commodities/buy` | account-ms → commodity-accounts (legacy) |
| `/api/v1/wallets` | wallet-ms |
| `/api/v1/kyc` | compliance-ms |

### Headers on every authenticated call

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

### Login

`POST /api/v1/auth/login`

```json
{ "email": "user@example.com", "password": "…" }
```

Use:

| From login | Use as |
|------------|--------|
| `user.id` | `userId` everywhere |
| `user.app_id` | `appId` (fallback if tenant headers missing) |
| `user.user_merchant_id` | `merchantId` (offering / storefront merchant) |

---

## 2. Prerequisites (do these before apply / fund)

| Check | Why | How |
|-------|-----|-----|
| Profile phone | Loans/mortgages/savings/investment/commodity need a phone | Profile update or send `phone` on body |
| Fuspay modular KYC (BVN) | Server resolves BVN from compliance; apply fails without it | `POST /api/v1/kyc/modular/verification` → URL → poll status |
| PRIMARY wallet funded | Savings/investment deposits + commodity purchase debit PRIMARY | `GET /api/v1/wallets/user/{userId}` — show NUBAN / balance |
| Product turned on | `isActive === true` and local `id` | `GET /api/v1/products/app/{appId}` |

**Product IDs:** always use the **local Spring** product `id` from the storefront catalog — not Plata catalog IDs shown in merchant dashboards.

```http
GET /api/v1/products/app/{appId}
GET /api/v1/products/{productId}
```

Branch UI on `data.type` / `data.structure` / `data.requirements` / `data.feesAndCharges` (customer-facing fees only).

---

## 3. Shared helpers

### Platform field options (dropdowns)

```http
GET /api/v1/products/options/platform-application-fields
GET /api/v1/products/options/repayment-source
GET /api/v1/products/options/marital-status
GET /api/v1/products/options/loan-reason
```

### Platform fields object (PEP / income / etc.)

Required on **final loan/mortgage submit** and on **investment provision** (forwarded to Plata). For **SAVINGS**, no platform fields are required. For **COMMODITY**, only `isPoliticallyExposedPerson` is required — do not collect `monthlyIncome`, `repaymentSource`, or `maritalStatus`.

```ts
type PlatformFields = {
  isPoliticallyExposedPerson?: boolean; // required except SAVINGS
  // Not for SAVINGS / COMMODITY:
  monthlyIncome?: number;               // ≥ 0; required for LOAN/MORTGAGE/INVESTMENT
  repaymentSource?: string;             // salary | business | … | other
  repaymentSourceOther?: string;       // if other
  maritalStatus?: string;               // single | married | … | other
  maritalStatusOther?: string;
  // LOAN / MORTGAGE only:
  loanReason?: string;
  loanReasonOther?: string;
  repayingWithSpouse?: boolean;
  spouseFullName?: string;
  spouseEmail?: string;
  spousePhone?: string;
  spouseOccupation?: string;
  spouseCountry?: string; // ISO-2
};
```

### Document upload (requirements)

```http
POST /api/v1/applications/upload
Content-Type: multipart/form-data
```

Field name: `file`. Optional form field: `userId`. Use returned `url` in `requirementSubmissions[].fileUrl`.

### Idempotency

| Flow | Behavior |
|------|----------|
| Loan/mortgage init | Same user/product/merchant/app pending init → `200` + existing `id` |
| Savings / investment create | Existing account → `200` + same `applicationId` |
| Deposits | Pass stable `referenceId`; retries return `duplicate: true` |
| Commodity apply | New enrollment each successful call (debit once per success) |

---

## 4. Router snippet (TypeScript)

```ts
type ProductType = 'LOAN' | 'MORTGAGE' | 'SAVINGS' | 'INVESTMENT' | 'COMMODITY';

async function startProductFlow(product: { id: string; type: ProductType }, ctx: ApplyContext) {
  switch (product.type) {
    case 'LOAN':
    case 'MORTGAGE':
      return startLendingFlow(product, ctx);      // §5
    case 'SAVINGS':
      return startSavingsFlow(product, ctx);      // §6
    case 'INVESTMENT':
      return startInvestmentFlow(product, ctx);   // §7
    case 'COMMODITY':
      return startCommodityFlow(product, ctx);    // §8
    default:
      throw new Error(`Unsupported product type: ${product.type}`);
  }
}
```

---

## 5. LOAN / MORTGAGE (multi-step)

### Screen flow

```text
Product detail
  → Init (creates draft + bank account / NUBAN when provisioned)
  → Platform questions (PEP, income, marital, repayment, loan reason, spouse?)
  → Product requirements (uploads / forms from requirementsSnapshot)
  → Guarantor(s) if requirements.security.guarantor === true
  → Spouse KYC link if repayingWithSpouse (optional early)
  → Terms + submit
  → Track loanWorkflowStatus
  → Post-approval (offer / contract / equity-down-payment) when prompted
```

### 5.1 Init

`POST /api/v1/applications/init`

```json
{
  "userId": "…",
  "productId": "…",
  "merchantId": "…",
  "appId": "…",
  "amount": 100000,
  "currency": "NGN",
  "email": "user@example.com",
  "applicantName": "Jane Doe",
  "phone": "+2348012345678",
  "bvn": "22123456789",
  "country": "NG"
}
```

| Field | Required |
|-------|----------|
| `userId`, `productId`, `merchantId`, `amount`, `currency`, `email`, `applicantName` | Yes |
| `phone`, `bvn`, `country`, `appId`, platform fields | Recommended |

**Do not** send `requirementSubmissions` on init.

**Store:** `data.id` → `applicationId`. Show `data.productWallet.upstreamAccount` when present.

**Idempotent:** `200` if a pending init already exists.

### 5.2 Save draft progress

`PATCH /api/v1/applications/{applicationId}/progress`

```json
{
  "userId": "…",
  "currentStep": "platform_fields",
  "currentTab": "pep_and_reason",
  "isPoliticallyExposedPerson": false,
  "monthlyIncome": 350000,
  "repaymentSource": "salary",
  "maritalStatus": "single",
  "loanReason": "business",
  "repayingWithSpouse": false
}
```

Or nest under `metadata.platformFields`. Top-level keys win.

### 5.3 Requirements

1. Read `requirementsSnapshot` / product `requirements.otherRequirements`.
2. Upload files → attach:

`PATCH /api/v1/applications/{id}/requirements` (or progress with `requirementDrafts` / submit payloads — see application guide)

Match by `requirementId`, `requirementType`, or `label`.

### 5.4 Guarantor (when required)

`POST /api/v1/applications/{applicationId}/guarantors`

```json
{
  "userId": "…",
  "fullName": "…",
  "email": "…",
  "phone": "…",
  "occupation": "…",
  "relationship": "…"
}
```

Show `data.guarantor.kyc.verificationUrl` to the guarantor. Final submit needs guarantor KYC when security requires it.

### 5.5 Spouse KYC (optional early)

`POST /api/v1/applications/{applicationId}/spouse-kyc`

```json
{
  "userId": "…",
  "fullName": "…",
  "email": "…",
  "phone": "…",
  "occupation": "…",
  "country": "NG"
}
```

### 5.6 Final submit

`POST /api/v1/applications/{applicationId}/submit`

**Loan:**

```json
{
  "userId": "…",
  "acceptedTerms": true
}
```

**Mortgage:** include `mortgageSelection` (property, unitPrice, quantity, dates, totals — product-driven).

Ensure platform fields are already on the application (progress) or send them on submit. Plata rejects incomplete PEP/income/marital/repayment/loanReason/spouse sets.

**Success:** `status: PENDING`, `loanWorkflowStatus` e.g. `under_review` / `account_requested`.

### 5.7 One-shot apply (compact clients)

`POST /api/v1/applications/apply` — same core fields as init **plus** `requirementSubmissions[]` and platform fields. Prefer init + progress on mobile for resumability and bank-account UX.

### 5.8 Resume / list

| Method | Path |
|--------|------|
| `GET` | `/api/v1/applications/{id}` |
| `GET` | `/api/v1/applications/user/{userId}?appId=&productType=&status=` |
| `GET` | `/api/v1/applications/user/{userId}/products/{productId}/init-status` |

### 5.9 Post-approval

Poll application / notify user when workflow advances.

**Mortgage pending-approved**

| Step | Path |
|------|------|
| List | `GET /applications/user/{userId}/pending-approved-mortgages` |
| Detail | `GET /applications/{id}/pending-approved-mortgage?userId=` |
| Offer | `POST …/pending-approved-mortgage/offer` `{ "userId", "decision": "accept"|"decline" }` |
| Appointment / inspection / contract | `…/appointment`, `…/inspection/start`, `…/inspection/complete`, `…/contract/sign`, `…/contract/upload-signed` |
| Down payment | `POST …/pending-approved-mortgage/down-payment` |

Down-payment / equity bank transfer uses `merchantReference` shaped like `equity-payment:{upstreamApplicationId}` (from step detail). Wallet path credits repayment collection when configured.

**Loan pending-approved**

| Step | Path |
|------|------|
| List | `GET /applications/user/{userId}/pending-approved-loans` |
| Detail / offer / contract | `…/pending-approved-loan`, `…/offer`, `…/contract/upload-signed` |

Disbursement (Treasury → user wallet) is **server-driven on merchant approval** when equity gates pass — there is no storefront “disburse” button.

---

## 6. SAVINGS (provision → fund)

### 6.1 Provision

`POST /api/v1/savings-accounts`

```json
{
  "userId": "…",
  "productId": "…",
  "currency": "NGN",
  "email": "user@example.com",
  "applicantName": "Jane Doe",
  "phone": "+2348012345678",
  "bvn": "22123456789",
  "merchantId": "…",
  "appId": "…"
}
```

**Response:** `201` / `200` with `data.applicationId` and `data.account` (balance usually `0`). NUBAN may appear on `account.productWallet` when provisioned (`provisionStatus` can be `failed` — account still usable for wallet deposits). SAVINGS does **not** require platform fields (PEP / income / marital / repayment source).

### 6.2 Deposit details

`GET /api/v1/savings-accounts/{applicationId}/deposit-details?userId={userId}`

Returns `minAmount`, `maxAmount`, `balance`, `centralWalletAvailable`, and bank-transfer reference when applicable.

### 6.3 Fund from PRIMARY wallet

`POST /api/v1/savings-accounts/{applicationId}/deposits`

```json
{
  "userId": "…",
  "amount": 5000,
  "currency": "NGN",
  "referenceId": "savings-dep-optional-idempotency-key"
}
```

- Debits user **PRIMARY** under the offering merchant.
- Credits Plata product-creator repayment (via gateway).
- Retry same `referenceId` → `duplicate: true`.

**Bank transfer alternative:** fund PayOnUs NUBAN with `merchantReference` = `savings-deposit:{upstreamApplicationId}` from deposit-details.

### UI checklist

1. Show min deposit from product structure / deposit-details.
2. Ensure PRIMARY balance ≥ amount (`GET /wallets/user/{userId}`).
3. On success, refresh deposit-details + wallet.

---

## 7. INVESTMENT (provision → fund)

Mirrors savings. **Do not** use `/applications/apply`.

### 7.1 Provision

`POST /api/v1/investment-accounts`

```json
{
  "userId": "…",
  "productId": "…",
  "currency": "NGN",
  "email": "user@example.com",
  "applicantName": "Jane Doe",
  "phone": "+2348012345678",
  "bvn": "22123456789",
  "merchantId": "…",
  "appId": "…",
  "isPoliticallyExposedPerson": false,
  "monthlyIncome": 500000,
  "repaymentSource": "salary",
  "maritalStatus": "single"
}
```

`currency` is **required**. Include platform fields for Plata enrollment.

**Response:** `data.applicationId`, `data.account` (`accountType: "investment"`).

### 7.2 Deposit details

`GET /api/v1/investment-accounts/{applicationId}/deposit-details?userId={userId}`

Respect `minAmount` / `maxAmount` from product `structure.investmentAmount`.

### 7.3 Fund from PRIMARY wallet

`POST /api/v1/investment-accounts/{applicationId}/deposits`

```json
{
  "userId": "…",
  "amount": 1000,
  "currency": "NGN",
  "referenceId": "invest-dep-optional-idempotency-key"
}
```

Settlement (server-side): debit full principal once → merchant commission to storefront REPAYMENT → creator principal via Plata gateway. Frontend only needs wallet balance + success/duplicate handling.

### UI checklist

Same as savings. After deposit: `balance` on account / deposit-details increases; PRIMARY decreases by `amount`.

---

## 8. COMMODITY (enroll + fund in one call)

### 8.1 Apply

`POST /api/v1/commodity-accounts/apply`  
(legacy alias: `POST /api/v1/commodities/buy`)

```json
{
  "userId": "…",
  "productId": "…",
  "currency": "NGN",
  "quantity": 1,
  "email": "user@example.com",
  "applicantName": "Jane Doe",
  "phone": "+2348012345678",
  "bvn": "22123456789",
  "merchantId": "…",
  "appId": "…",
  "isPoliticallyExposedPerson": false,
  "requirementSubmissions": []
}
```

For COMMODITY, only **PEP** (`isPoliticallyExposedPerson`) is required among platform fields — do not send `monthlyIncome`, `repaymentSource`, or `maritalStatus`. Nested `platformFields` / `metadata.platformFields` are also accepted; top-level keys win.
- Server computes total from unit price × `quantity` (and any commission).
- Debits PRIMARY immediately; funds lock until maturity.
- Ensure balance covers **total** before calling.

**Success `201`:** `data.applicationId`, `data.account` with `holdingStatus: "LOCKED"`, principal, expected interest, `maturityAt`.

### 8.2 Status

`GET /api/v1/commodity-accounts/{applicationId}?userId={userId}`

### 8.3 Withdraw at maturity

`POST /api/v1/commodity-accounts/{applicationId}/withdraw`

```json
{ "userId": "…" }
```

Only when holding is matured / eligible; pays principal + interest back to user wallet.

---

## 9. Wallets & dashboard

| Call | Purpose |
|------|---------|
| `GET /api/v1/wallets/user/{userId}` | PRIMARY balance + NUBAN |
| `GET /api/v1/wallets/user/{userId}/product-type-summary` | Totals by `LOAN` / `MORTGAGE` / `SAVINGS` / `INVESTMENT` / `COMMODITY` (PRODUCT wallets only) |

---

## 10. Error handling cheat sheet

| HTTP | Typical cause | UX |
|------|---------------|----|
| `400` | Wrong endpoint for product type; missing platform fields; validation | Show `error` text; route to correct flow |
| `400` | BVN / phone missing | Send user to KYC / profile |
| `402` / insufficient funds message | PRIMARY too low | Show top-up NUBAN |
| `403` | Product not active | Hide product / refresh catalog |
| `404` | Bad local product id | Refresh catalog; never use Plata-only ids |
| `409` | Equity unpaid on approve (merchant side) | User must complete equity/down-payment |
| `502` | Upstream Plata / gateway / settlement | Retry; keep same `referenceId` for deposits |

Always surface `response.error` (string) to the user.

---

## 11. End-to-end smoke matrix (QA)

Use a storefront user with KYC + funded PRIMARY (example CRBC: see `logins.md`).

| # | Type | Steps | Pass criteria |
|---|------|-------|----------------|
| 1 | LOAN | init → progress (platform) → requirements → guarantor if needed → submit | `PENDING` + workflow status; bank account if provisioned |
| 2 | MORTGAGE | same + `mortgageSelection` on submit | Same; later pending-approved steps when offered |
| 3 | SAVINGS | create → deposit  (min+) | Balance ↑; PRIMARY ↓; duplicate deposit OK |
| 4 | INVESTMENT | create (platform fields) → deposit | Balance ↑; PRIMARY ↓; duplicate OK |
| 5 | COMMODITY | apply with quantity | Account `LOCKED`; PRIMARY ↓ by total |

---

## 12. Frontend integration checklist

- [ ] Branch on `product.type` before any apply API
- [ ] Use **local** `product.id` + login `userId` / `merchantId` / `appId`
- [ ] Complete modular KYC so BVN exists
- [ ] Loan/mortgage: init → progress → requirements → guarantors → submit (never skip platform fields)
- [ ] Savings/investment: two-step create then deposit with `referenceId`
- [ ] Commodity: one-shot apply with enough PRIMARY balance
- [ ] Proxy all paths on the tenant host **or** call `https://account-ms.fly.dev` for savings/investment/commodity-accounts
- [ ] Poll applications / deposit-details / commodity account after mutations
- [ ] Handle idempotent `200` + `duplicate: true` without double-charging UX

---

## 13. Minimal fetch helpers

```ts
const API = ''; // same-origin, or 'https://account-ms.fly.dev'

async function api<T>(
  path: string,
  token: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...(init?.headers || {})
    }
  });
  const body = await res.json();
  if (!res.ok || body.success === false) {
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return body as T;
}

// Examples:
// await api('/api/v1/investment-accounts', token, { method: 'POST', body: JSON.stringify(payload) });
// await api(`/api/v1/investment-accounts/${id}/deposits`, token, { method: 'POST', body: JSON.stringify(dep) });
```

---

*Source of truth: Spring `product-ms` routes + `account-ms` proxies. Last validated against live CRBC investment deposit E2E (provision + wallet fund + idempotent retry).*
