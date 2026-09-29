/**
 * Five separate integrator guides (Loan, Mortgage, Commodity, Savings, Investment).
 * Shared gateway routes are copied into each guide with that product's walkthrough.
 */
import merchantIntegrationSpec from './merchantIntegrationSpec';

type HttpOperation = {
  tags?: string[];
  summary?: string;
  description?: string;
  parameters?: Array<{ name?: string; required?: boolean; example?: string; description?: string }>;
  requestBody?: {
    content?: {
      'application/json'?: { example?: Record<string, unknown> };
    };
  };
  responses?: Record<string, unknown>;
};

type PathItem = Record<string, HttpOperation | undefined>;

export type IntegratorProductSlug = 'loan' | 'mortgage' | 'commodity' | 'savings' | 'investment';

const CATALOG_PATHS = ['/api/v1/products', '/api/v1/products/{id}'];
const APPLY_PATHS = ['/api/v1/products/external-accounts', '/api/v1/products/external-applications'];
const SUB_MERCHANT_PATHS = [
  '/api/v1/products/sub-merchant-activations',
  '/api/v1/products/sub-merchant-usage-events'
];
const SHARED_PATHS = [...CATALOG_PATHS, ...APPLY_PATHS, ...SUB_MERCHANT_PATHS];

const SCHEDULE_PREVIEW_PATH = '/api/v1/products/{id}/loan-schedule';
const STATUS_PATH = '/api/v1/products/external-applications/{applicationId}';
const OFFER_PATH = '/api/v1/products/external-applications/{applicationId}/offer';
const ACCOUNT_PATH = '/api/v1/products/external-applications/{applicationId}/account';
const REPAYMENT_SCHEDULE_PATH = '/api/v1/products/external-applications/{applicationId}/repayment-schedule';

const WALLET_READ_PATHS = [
  '/api/v1/wallets/merchant/{merchantId}/all',
  '/api/v1/wallets/merchant/{merchantId}/type/{walletType}',
  '/api/v1/wallets/treasury/{merchantId}/transactions',
  '/api/v1/wallets/billing/{merchantId}/transactions',
  '/api/v1/wallets/repayment/{merchantId}/transactions',
  '/api/v1/wallets/user/{userId}',
  '/api/v1/wallets/user/{userId}/transactions'
];

export const INTEGRATOR_PRODUCTS: Array<{
  slug: IntegratorProductSlug;
  title: string;
  type: 'LOAN' | 'MORTGAGE' | 'COMMODITY' | 'SAVINGS' | 'INVESTMENT';
  paths: string[];
}> = [
  {
    slug: 'loan',
    title: 'Loan',
    type: 'LOAN',
    paths: [
      ...CATALOG_PATHS,
      SCHEDULE_PREVIEW_PATH,
      ...APPLY_PATHS,
      STATUS_PATH,
      OFFER_PATH,
      ACCOUNT_PATH,
      REPAYMENT_SCHEDULE_PATH,
      ...SUB_MERCHANT_PATHS,
      ...WALLET_READ_PATHS
    ]
  },
  {
    slug: 'mortgage',
    title: 'Mortgage',
    type: 'MORTGAGE',
    paths: [
      ...CATALOG_PATHS,
      SCHEDULE_PREVIEW_PATH,
      ...APPLY_PATHS,
      STATUS_PATH,
      ACCOUNT_PATH,
      REPAYMENT_SCHEDULE_PATH,
      ...SUB_MERCHANT_PATHS,
      ...WALLET_READ_PATHS
    ]
  },
  {
    slug: 'commodity',
    title: 'Commodity',
    type: 'COMMODITY',
    paths: [
      ...SHARED_PATHS,
      STATUS_PATH,
      ACCOUNT_PATH,
      '/api/v1/wallets/commodity/principal-repayment',
      '/api/v1/wallets/commodity/maturity-withdrawal-request',
      '/api/v1/wallets/commodity/maturity-payout',
      ...WALLET_READ_PATHS
    ]
  },
  {
    slug: 'savings',
    title: 'Savings',
    type: 'SAVINGS',
    paths: [
      ...SHARED_PATHS,
      STATUS_PATH,
      ACCOUNT_PATH,
      '/api/v1/wallets/savings/principal-repayment',
      '/api/v1/wallets/savings/application-activity',
      '/api/v1/wallets/savings/maturity-withdrawal-request',
      '/api/v1/wallets/savings/maturity-payout',
      ...WALLET_READ_PATHS
    ]
  },
  {
    slug: 'investment',
    title: 'Investment',
    type: 'INVESTMENT',
    paths: [
      ...SHARED_PATHS,
      STATUS_PATH,
      ACCOUNT_PATH,
      '/api/v1/wallets/investment/principal-repayment',
      '/api/v1/wallets/investment/maturity-withdrawal-request',
      '/api/v1/wallets/investment/maturity-payout',
      ...WALLET_READ_PATHS
    ]
  }
];

const GUIDES: Record<IntegratorProductSlug, string> = {
  loan: `
# Loan

This guide walks you through offering **cash loans** on your own platform. Mortgage, commodity, savings, and investment each have their own guide.

**How to authenticate:** send \`PLATA_PUBLIC_KEY\` and \`PLATA_SECRET_KEY\` on every request. Listing and reading a product (step 1) also work without keys if you prefer.

**Who does what:** you build the customer experience; Plata holds the products, applications, offer letters, and repayment schedules. Lender staff approve and disburse in the Plata dashboard — you watch progress with status calls and webhooks.

## The journey at a glance

| Step | Goal | API |
|------|------|-----|
| 1 | Show available loans | \`GET /api/v1/products?type=LOAN\` · \`GET /api/v1/products/{id}\` |
| 2 | Preview what they will repay *(optional)* | \`POST /api/v1/products/{id}/loan-schedule\` |
| 3 | Submit the application | \`POST /api/v1/products/external-applications\` |
| 4 | Check where it stands | \`GET /api/v1/products/external-applications/{applicationId}\` |
| 5 | Let them accept or decline the offer | \`GET\` then \`POST .../offer\` |
| 6 | Show the live loan account | \`GET .../account\` |
| 7 | Show the repayment schedule | \`GET .../repayment-schedule\` |

After you apply, keep either Plata’s \`data.application.id\` or your own \`localApplicationId\` — both work as \`{applicationId}\`. You can only see applications created with **your** keys.

---

## 1. Get loan products

Start by loading the loan catalog so you can display products in your app.

Call \`GET /api/v1/products?type=LOAN\`. Leave \`appId\` out of this request.

From each product, save:

- \`id\` — you will send this later as \`productId\`
- Interest rate and method (\`structure.interestRate\`, \`structure.interestMethod\`)
- Tenure and the min / max loan amount

Need one product in full? Use \`GET /api/v1/products/{id}\`.

You host the storefront — Plata does not. If a sub-merchant turns a loan on or off in your network, tell Plata with \`POST /api/v1/products/sub-merchant-activations\` (\`productId\` + \`status\`: \`active\` or \`deactivated\`). Skip this if you do not use sub-merchants.

## 2. Preview repayments *(optional)*

Before someone applies, you can show a calculator-style breakdown.

Call \`POST /api/v1/products/{id}/loan-schedule\` with the amount and duration they are considering. Plata returns each instalment and the total to repay. Nothing is saved — it is only a preview.

## 3. Apply for a loan

When the customer is ready, submit once with \`POST /api/v1/products/external-applications\`.

| What to send | Why it matters |
|--------------|----------------|
| \`productId\` | Which loan they chose (from step 1) |
| \`user.bvn\` | Required — 11 digits |
| \`application.localApplicationId\` | Your own id, so you can look the application up later |
| \`application.contractSnapshot.principal\` | Amount requested (naira) |
| \`application.monthlyIncome\` / \`repaymentSource\` | Helps underwriting — send when you have them |
| \`loanWorkflowCallbackUrl\` | Plata will POST status updates here |
| \`guarantorKycCallbackUrl\` | Only if this loan needs a guarantor |

Leave equity and property fields out — those belong on the **mortgage** guide.

Want a Plata bank account (NUBAN) for the borrower first? Call \`POST /api/v1/products/external-accounts\` before you apply. It is optional if apply already provisions what you need.

## 4. Get loan status

Poll anytime with \`GET /api/v1/products/external-applications/{applicationId}\`.

The response tells you two useful things:

- **\`stage\`** — where the application is now, for example \`submitted\` → \`under_review\` → \`offer_pending\` → \`offer_accepted\` → \`disbursed\` (or \`declined\`)
- **\`nextAction\`** — what should happen next, for example \`wait_for_review\`, \`wait_for_offer_letter\`, \`accept_or_decline_offer\`, \`wait_for_disbursement\`, or \`repay\`
- **\`downPayment\`** — whether any down payment is still outstanding

You do not have to poll only. If you set \`loanWorkflowCallbackUrl\`, Plata also POSTs \`loan_application.submitted\` and \`loan_workflow_status.updated\` when something changes. When signature verification is configured, check the \`X-Plata-Signature\` header.

## 5. Accept the loan offer

When \`nextAction\` is \`accept_or_decline_offer\`, the lender has sent an offer letter and the borrower needs to decide.

1. \`GET .../external-applications/{applicationId}/offer\` — open \`offerLetter.pdfUrl\` for the customer.
2. \`POST .../external-applications/{applicationId}/offer\` with either \`{ "action": "accept", "acceptedTerms": true }\` or \`{ "action": "decline" }\`.

**Down payment:** if the product requires one, settle it before accept. The borrower can transfer with reference \`equity-payment:{applicationId}\`, or you collect payment yourself and include \`downPayment: { amount, providerReference }\` in the accept body. Accepting without it returns **402**.

Accepting does **not** move money. After acceptance, the lender disburses into the borrower’s wallet; then \`stage\` becomes \`disbursed\`.

## 6. Get loan account details

Call \`GET .../external-applications/{applicationId}/account\` to show the live facility.

Until money is sent, you will see \`accountStatus: not_disbursed\`. After disbursement you get the amount lent, what the borrower received after fees, the wallet credited, amount paid so far, outstanding balance, next instalment, days overdue, and maturity date. Status moves between \`active\`, \`overdue\`, \`paid_off\`, and \`closed\`.

## 7. Get loan repayment details

Call \`GET .../external-applications/{applicationId}/repayment-schedule\` once the loan is disbursed.

You get every instalment: due date, amount, principal vs interest, remaining balance, and status (\`pending\`, \`paid\`, \`overdue\`). The row with \`isNext: true\` is the one coming up. Call this before disbursement and you get **409** — the schedule is created when the loan is funded.
`.trim(),
  mortgage: `
# Mortgage

This guide is for **property finance** only. Cash loans, commodity, savings, and investment each have their own page.

**How to authenticate:** send \`PLATA_PUBLIC_KEY\` and \`PLATA_SECRET_KEY\` on every request.

**What is different from cash loans:** buyers usually owe a down payment (equity) before approval can finish. There is no cash-loan offer accept/decline call here — mortgage offers, inspections, and contracts run in the lender’s mortgage workflow on Plata. There is also no principal-repayment or maturity-payout route on this guide.

## The journey at a glance

| Step | Goal | API |
|------|------|-----|
| 1 | Show available mortgages | \`GET /api/v1/products?type=MORTGAGE\` · \`GET /api/v1/products/{id}\` |
| 2 | Preview repayments *(optional)* | \`POST /api/v1/products/{id}/loan-schedule\` |
| 3 | Submit the application | \`POST /api/v1/products/external-applications\` |
| 4 | Check status | \`GET .../external-applications/{applicationId}\` |
| 5 | Show the mortgage account | \`GET .../account\` |
| 6 | Show the repayment schedule | \`GET .../repayment-schedule\` |

Keep either Plata’s application \`id\` or your own \`localApplicationId\` as \`{applicationId}\`. You only see applications created with **your** keys.

---

## 1. Get mortgage products

Load the property catalog for your storefront.

Call \`GET /api/v1/products?type=MORTGAGE\`. Leave \`appId\` out.

From each product, save:

- \`id\` — later \`productId\`
- Facility size (\`structure.mortgageAmount\` or equivalent)
- Down-payment rule (\`structure.equityRequirement\` and \`structure.equityContribution\` — flat amount or percent)
- Tenure / how repayments are structured

If equity is required, tell the buyer up front: that down payment must be paid before the lender can approve. \`GET /api/v1/products/{id}\` returns one mortgage in full.

You host the buying experience. If a sub-merchant lists or delists this mortgage, tell Plata with \`POST /api/v1/products/sub-merchant-activations\`. Skip that if you do not use sub-merchants.

## 2. Preview repayments *(optional)*

Show the buyer what monthly life looks like before they apply.

Call \`POST /api/v1/products/{id}/loan-schedule\` with \`amount\` (facility) and \`propertyValue\`. Plata returns each instalment and the total to repay, with the down payment taken into account. Nothing is saved.

## 3. Apply for a mortgage

Submit once with \`POST /api/v1/products/external-applications\` (same URL as loans, different snapshot).

| What to send | Why it matters |
|--------------|----------------|
| \`productId\` | Which mortgage they chose |
| \`application.contractSnapshot.mortgageAmount\` | Facility amount (naira) |
| \`application.contractSnapshot.propertyValue\` | Property value (naira) |
| \`application.contractSnapshot.equityContribution\` | Down payment the buyer must pay |
| \`loanWorkflowCallbackUrl\` | Where Plata POSTs approval / status updates |

Do **not** send a cash-loan \`principal\` instead of these property fields.

Optional first: \`POST /api/v1/products/external-accounts\` creates the buyer’s Plata NUBAN. Collecting equity itself is not a special gateway call on this page — use your payment flow (or the equity payment reference documented for lending) and then track \`downPayment\` on status.

## 4. Track the mortgage

Poll \`GET /api/v1/products/external-applications/{applicationId}\` anytime.

- **\`downPayment\`** — how much equity is still owed
- **\`stage\` / \`nextAction\`** — after approval, mortgage steps (inspection, contract, down payment, and so on). Until money is disbursed you will often see \`nextAction: continue_mortgage_workflow\`

Webhooks on \`loanWorkflowCallbackUrl\` still fire for status changes; verify \`X-Plata-Signature\` when configured.

## 5. Get mortgage account details

Call \`GET .../external-applications/{applicationId}/account\` for the live facility: amount approved, amount disbursed, outstanding balance, next instalment, and days overdue. Before disbursement the account shows as not yet funded.

## 6. Get mortgage repayment details

Call \`GET .../external-applications/{applicationId}/repayment-schedule\` after disbursement for every instalment. Before that you get **409** — the schedule is created when the mortgage is funded.
`.trim(),
  commodity: `
# Commodity

This guide is for **buying goods in units** (for example bags of rice). It is not a loan, mortgage, savings plan, or investment note.

**How to authenticate:** send \`PLATA_PUBLIC_KEY\` and \`PLATA_SECRET_KEY\` on every request.

**Shape of the journey:** list products → enroll the purchase on Plata → credit the creator when the buyer pays → at maturity, ask the FI to approve a withdrawal, then run the treasury payout. You do **not** need a \`loanWorkflowCallbackUrl\`.

## The journey at a glance

| Step | Goal | API |
|------|------|-----|
| 1 | Show commodities for sale | \`GET /api/v1/products?type=COMMODITY\` |
| 2 | Record the purchase on Plata | \`POST /api/v1/products/external-applications\` |
| 3 | Check status | \`GET .../external-applications/{applicationId}\` |
| 4 | Show the commodity account | \`GET .../external-applications/{applicationId}/account\` |
| 5 | When the buyer pays | \`POST /api/v1/wallets/commodity/principal-repayment\` |
| 6 | Ask to withdraw at maturity | \`POST /api/v1/wallets/commodity/maturity-withdrawal-request\` |
| 7 | After FI approval, pay out | \`POST /api/v1/wallets/commodity/maturity-payout\` |

Keep either Plata’s application \`id\` or your own \`localApplicationId\` as \`{applicationId}\`.

---

## 1. Get commodity products

Call \`GET /api/v1/products?type=COMMODITY\`. Leave \`appId\` out.

Save \`id\` (your later \`productId\`), unit price (\`structure.unitAmount\`), minimum quantity, and any yield or withdrawal rules you show the buyer. \`GET /api/v1/products/{id}\` returns one product in full.

You sell in your own app. If a sub-merchant starts or stops offering this commodity, call \`POST /api/v1/products/sub-merchant-activations\`. Skip that if you have no sub-merchants.

## 2. Record the purchase

When someone buys units, tell Plata with \`POST /api/v1/products/external-applications\`. This records the holding — it is not a credit application. Plata also provisions the customer user + wallet under the product creator.

| What to send | Why it matters |
|--------------|----------------|
| \`productId\` | Which commodity they bought |
| \`application.contractSnapshot.quantity\` | How many units |
| \`application.contractSnapshot.unitAmount\` | Price per unit (naira) |
| \`application.contractSnapshot.amount\` | Usually quantity × unit price |
| \`application.localApplicationId\` | Your purchase / account id |

Omit \`loanWorkflowCallbackUrl\`. Do not send a loan \`principal\`.

Optional: \`POST /api/v1/products/external-accounts\` if the buyer needs a Plata NUBAN first.

## 3. Get commodity status

Poll \`GET /api/v1/products/external-applications/{applicationId}\` anytime.

- **\`stage\`** — \`enrolled\` → \`active\` → \`withdrawal_pending\` → \`withdrawn\` (or cancelled)
- **\`nextAction\`** — \`deposit\`, \`request_maturity_withdrawal\`, \`wait_for_withdrawal_approval\`, or \`none\`

## 4. Get commodity account details

Call \`GET .../external-applications/{applicationId}/account\` for the holding summary: \`balance\`, \`quantity\`, \`unitAmount\`, \`amount\`, \`holdingStatus\`, \`maturityAt\`, and any \`pendingWithdrawal\`. \`accountStatus\` is \`enrolled\`, \`active\`, \`withdrawal_pending\`, or \`withdrawn\`.

## 5. When the buyer pays

Call \`POST /api/v1/wallets/commodity/principal-repayment\` to credit the **product creator’s Repayment** wallet.

Send \`creatorMerchantId\`, \`creatorAppId\`, \`amount\`, and a unique \`referenceId\`. Plata stores this as category \`COMMODITY_DEPOSIT\`.

(The older path \`/commodity/principal-settlement\` still works; prefer \`principal-repayment\`.)

## 6. At maturity — ask, then pay out

1. \`POST /api/v1/wallets/commodity/maturity-withdrawal-request\` — asks the FI to approve. **No money moves yet.**
2. After approval, \`POST /api/v1/wallets/commodity/maturity-payout\` — debits the creator **Treasury**. You then credit the buyer on your own platform.
`.trim(),
  savings: `
# Savings

This guide covers **flex** savings and **target / lock** plans. It is not a loan application and not an investment unit purchase.

**How to authenticate:** send \`PLATA_PUBLIC_KEY\` and \`PLATA_SECRET_KEY\` on every request.

**Shape of the journey:** list plans → open the account on Plata at zero balance → check status / account → credit each deposit → show activity → at maturity, request withdrawal and then treasury payout. No loan-workflow callback is required.

## The journey at a glance

| Step | Goal | API |
|------|------|-----|
| 1 | Show savings products | \`GET /api/v1/products?type=SAVINGS\` |
| 2 | Open the plan on Plata | \`POST /api/v1/products/external-applications\` |
| 3 | Check status | \`GET .../external-applications/{applicationId}\` |
| 4 | Show the savings account | \`GET .../external-applications/{applicationId}/account\` |
| 5 | Each deposit or top-up | \`POST /api/v1/wallets/savings/principal-repayment\` |
| 6 | Activity feed | \`POST /api/v1/wallets/savings/application-activity\` |
| 7 | Ask to withdraw at maturity | \`POST /api/v1/wallets/savings/maturity-withdrawal-request\` |
| 8 | After FI approval, pay out | \`POST /api/v1/wallets/savings/maturity-payout\` |

---

## 1. Get savings products

Call \`GET /api/v1/products?type=SAVINGS\`. Leave \`appId\` out.

Save \`id\` (later \`productId\`) and the rules you must show the customer:

- Interest rate and method (often daily)
- \`structure.withdrawalFlexibility\` — anytime (**flex**) or locked until maturity (**target / lock**)
- Target amount and monthly contribution when it is a target lock
- Early-withdrawal fee if the product charges one

\`GET /api/v1/products/{id}\` returns one plan in full. Sub-merchant on/off reporting uses \`POST /api/v1/products/sub-merchant-activations\` only if you need it.

## 2. Open the plan

Call \`POST /api/v1/products/external-applications\` to enroll the saver. The Plata balance starts at **zero**. This is not an approval workflow. Plata also provisions the customer user + wallet.

| What to send | Why it matters |
|--------------|----------------|
| \`productId\` | Which savings product they chose |
| \`application.localApplicationId\` | Your savings account id |
| \`application.contractSnapshot.savingsBalance\` | \`0\` on first enroll |
| \`application.contractSnapshot.currentBalance\` | \`0\` on first enroll |
| \`application.contractSnapshot.targetAmount\` | Target-lock plans only |
| \`application.contractSnapshot.monthlyContribution\` | Target-lock plans only |

Do not send \`loanWorkflowCallbackUrl\` or a loan \`principal\`.

## 3. Get savings status

Poll \`GET /api/v1/products/external-applications/{applicationId}\`. \`stage\` / \`nextAction\` tell you whether to take a deposit, wait on a withdrawal approval, or treat the plan as closed.

## 4. Get savings account details

Call \`GET .../external-applications/{applicationId}/account\` for \`balance\`, target fields, \`maturityAt\`, \`holdingStatus\`, and \`pendingWithdrawal\` when a withdrawal is queued.

## 5. Each deposit or top-up

When money comes in, call \`POST /api/v1/wallets/savings/principal-repayment\`. That credits the creator **Repayment** wallet. Use a **new** \`referenceId\` every time. Category \`SAVINGS_DEPOSIT\`.

## 6. Show the activity feed

Call \`POST /api/v1/wallets/savings/application-activity\` with the application id to list deposits, top-ups, and withdrawals. This read exists on the **savings** guide only.

## 7. Withdrawal at maturity

1. \`POST /api/v1/wallets/savings/maturity-withdrawal-request\` — queues FI approval; no debit yet.
2. After approval, \`POST /api/v1/wallets/savings/maturity-payout\` — debits creator **Treasury**. You credit the saver on your platform.

Locked plans stay locked until maturity unless **your** product rules allow an early exit. This gateway does not calculate that fee for you.
`.trim(),
  investment: `
# Investment

This guide is for **unit investments** (notes / holdings sold in units). It is not a cash loan, mortgage down payment, or savings target lock.

**How to authenticate:** send \`PLATA_PUBLIC_KEY\` and \`PLATA_SECRET_KEY\` on every request.

**Shape of the journey:** list offerings → record the subscription → check status / account → credit the creator when the investor pays → at maturity or liquidation, request FI approval, then treasury payout. No loan-workflow callback is required. There is no savings-style activity-feed route here.

## The journey at a glance

| Step | Goal | API |
|------|------|-----|
| 1 | Show investment products | \`GET /api/v1/products?type=INVESTMENT\` |
| 2 | Record the subscription | \`POST /api/v1/products/external-applications\` |
| 3 | Check status | \`GET .../external-applications/{applicationId}\` |
| 4 | Show the investment account | \`GET .../external-applications/{applicationId}/account\` |
| 5 | When the investor pays | \`POST /api/v1/wallets/investment/principal-repayment\` |
| 6 | Ask to liquidate / withdraw | \`POST /api/v1/wallets/investment/maturity-withdrawal-request\` |
| 7 | After FI approval, pay out | \`POST /api/v1/wallets/investment/maturity-payout\` |

---

## 1. Get investment products

Call \`GET /api/v1/products?type=INVESTMENT\`. Leave \`appId\` out.

Save \`id\` (later \`productId\`), expected return (\`structure.returnsOnInvestment\` or yield), unit price (\`structure.unitAmount\`), minimum quantity, and lock / withdrawal rules. Show return and unit price — not a loan interest rate.

\`GET /api/v1/products/{id}\` returns one offering in full. Use \`POST /api/v1/products/sub-merchant-activations\` only if sub-merchants turn the offering on or off.

## 2. Record the subscription

Call \`POST /api/v1/products/external-applications\` when someone buys units. Plata provisions the customer user + wallet under the product creator.

| What to send | Why it matters |
|--------------|----------------|
| \`productId\` | Which investment they chose |
| \`application.contractSnapshot.quantity\` | Units purchased |
| \`application.contractSnapshot.unitAmount\` | Price per unit (naira) |
| \`application.contractSnapshot.amount\` | Total subscription (naira) |
| \`application.contractSnapshot.expectedInterest\` | Projected return, if you calculated it |
| \`application.localApplicationId\` | Your investment account id |

Do not send loan \`principal\`, mortgage equity, or a savings target. Omit \`loanWorkflowCallbackUrl\`.

## 3. Get investment status

Poll \`GET /api/v1/products/external-applications/{applicationId}\` for \`stage\` and \`nextAction\` (\`deposit\`, \`request_maturity_withdrawal\`, \`wait_for_withdrawal_approval\`, …).

## 4. Get investment account details

Call \`GET .../external-applications/{applicationId}/account\` for \`balance\`, \`quantity\`, \`unitAmount\`, \`expectedInterest\`, \`maturityAt\`, \`holdingStatus\`, and \`pendingWithdrawal\`.

## 5. When the investor pays

Call \`POST /api/v1/wallets/investment/principal-repayment\` to credit the creator **Repayment** wallet. Category \`INVESTMENT_DEPOSIT\`. Required: \`creatorMerchantId\`, \`creatorAppId\`, \`amount\`, and a unique \`referenceId\`.

## 6. Liquidation / maturity

1. \`POST /api/v1/wallets/investment/maturity-withdrawal-request\` — asks the FI to approve. **No debit yet.**
2. After approval, \`POST /api/v1/wallets/investment/maturity-payout\` — debits creator **Treasury**. You credit the investor on your platform.
`.trim()
};

const WALLET_READS_GUIDE = `
## Wallet details and history (API keys)

These reads work with your merchant API keys on every product guide. \`{merchantId}\` **must** be your own merchant id (the one on the key). User wallets must belong to your merchant. Merchant wallets are **app-scoped** — always pass \`appId\`.

| Goal | Call |
|------|------|
| Merchant wallets (Treasury, Billing, Repayment) | \`GET /api/v1/wallets/merchant/{merchantId}/all?appId=…\` |
| One merchant wallet by type | \`GET /api/v1/wallets/merchant/{merchantId}/type/{walletType}?appId=…\` (\`TREASURY\`, \`BILLING\`, or \`REPAYMENT\`) |
| Treasury history | \`GET /api/v1/wallets/treasury/{merchantId}/transactions?appId=…\` |
| Billing history | \`GET /api/v1/wallets/billing/{merchantId}/transactions?appId=…\` |
| Repayment history | \`GET /api/v1/wallets/repayment/{merchantId}/transactions?appId=…\` |
| Customer wallet | \`GET /api/v1/wallets/user/{userId}\` |
| Customer wallet history | \`GET /api/v1/wallets/user/{userId}/transactions\` |

Required on merchant wallet routes: \`appId\`. Optional history filters: \`startDate\`, \`endDate\`, \`type\`, \`limit\`, \`skip\`.
`.trim();

function guide(slug: IntegratorProductSlug): string {
  return `${GUIDES[slug]}\n\n${WALLET_READS_GUIDE}`.trim();
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function integratorProductBySlug(slug: string) {
  return INTEGRATOR_PRODUCTS.find((item) => item.slug === slug);
}

const CATALOG_EXAMPLES: Record<IntegratorProductSlug, Record<string, unknown>> = {
  loan: {
    id: '674a1b2c3d4e5f6789012345',
    name: 'Salary loan',
    type: 'LOAN',
    status: 'active',
    structure: { interestRate: 12, interestMethod: 'reducing', loanAmount: { min: 50000, max: 2000000 } }
  },
  mortgage: {
    id: '674a1b2c3d4e5f6789012346',
    name: 'Home mortgage',
    type: 'MORTGAGE',
    status: 'active',
    structure: { mortgageAmount: 25000000, equityRequirement: 'percentage', equityContribution: 20 }
  },
  commodity: {
    id: '674a1b2c3d4e5f6789012347',
    name: 'Rice unit',
    type: 'COMMODITY',
    status: 'active',
    structure: { unitAmount: 45000, minQuantityPurchase: 1 }
  },
  savings: {
    id: '674a1b2c3d4e5f6789012348',
    name: 'Down payment lock',
    type: 'SAVINGS',
    status: 'active',
    structure: { interestRate: 10, withdrawalFlexibility: 'locked', savingsGoal: 10000000 }
  },
  investment: {
    id: '674a1b2c3d4e5f6789012349',
    name: 'Unit note',
    type: 'INVESTMENT',
    status: 'active',
    structure: { unitAmount: 100000, returnsOnInvestment: 18, minQuantityPurchase: 1 }
  }
};

const APPLICATION_EXAMPLES: Record<IntegratorProductSlug, Record<string, unknown>> = {
  loan: {
    appId: 'app_creator',
    productId: '674a1b2c3d4e5f6789012345',
    offeringMerchantId: 'merchant_offering',
    user: { id: 'user_7788', name: 'Jane Doe', email: 'jane@example.com', phone: '+2348099991111', bvn: '22123456789' },
    application: {
      localApplicationId: 'loan-app-1001',
      status: 'submitted',
      monthlyIncome: 250000,
      repaymentSource: 'salary',
      contractSnapshot: { principal: 500000, currency: 'NGN', productType: 'LOAN' }
    },
    loanWorkflowCallbackUrl: 'https://merchant.example.com/webhooks/plata/loan-workflow'
  },
  mortgage: {
    appId: 'app_creator',
    productId: '674a1b2c3d4e5f6789012346',
    offeringMerchantId: 'merchant_offering',
    user: { id: 'user_9901', name: 'Ada Okonkwo', email: 'ada@example.com', phone: '+2348011122233', bvn: '22345678901' },
    application: {
      localApplicationId: 'mortgage-app-2002',
      status: 'submitted',
      contractSnapshot: {
        mortgageAmount: 25000000,
        propertyValue: 32000000,
        equityContribution: 6400000,
        currency: 'NGN',
        productType: 'MORTGAGE'
      }
    },
    loanWorkflowCallbackUrl: 'https://merchant.example.com/webhooks/plata/mortgage-workflow'
  },
  commodity: {
    appId: 'app_creator',
    productId: '674a1b2c3d4e5f6789012347',
    offeringMerchantId: 'merchant_offering',
    user: { id: 'user_4410', name: 'Chidi Nwosu', email: 'chidi@example.com', phone: '+2348022233344', bvn: '22456789012' },
    application: {
      localApplicationId: 'commodity-buy-3003',
      status: 'submitted',
      contractSnapshot: { quantity: 4, unitAmount: 45000, amount: 180000, currency: 'NGN', productType: 'COMMODITY' }
    }
  },
  savings: {
    appId: 'app_creator',
    productId: '674a1b2c3d4e5f6789012348',
    offeringMerchantId: 'merchant_offering',
    user: { id: 'user_2201', name: 'Fatima Bello', email: 'fatima@example.com', phone: '+2348033344455', bvn: '22567890123' },
    application: {
      localApplicationId: 'savings-plan-4004',
      status: 'submitted',
      contractSnapshot: {
        savingsBalance: 0,
        currentBalance: 0,
        targetAmount: 10000000,
        monthlyContribution: 500000,
        currency: 'NGN',
        productType: 'SAVINGS'
      }
    }
  },
  investment: {
    appId: 'app_creator',
    productId: '674a1b2c3d4e5f6789012349',
    offeringMerchantId: 'merchant_offering',
    user: { id: 'user_1188', name: 'Tunde Bakare', email: 'tunde@example.com', phone: '+2348044455566', bvn: '22678901234' },
    application: {
      localApplicationId: 'investment-sub-5005',
      status: 'submitted',
      contractSnapshot: {
        quantity: 10,
        unitAmount: 100000,
        amount: 1000000,
        expectedInterest: 180000,
        currency: 'NGN',
        productType: 'INVESTMENT'
      }
    }
  }
};

const CATALOG_COPY: Record<IntegratorProductSlug, { summary: string; description: string }> = {
  loan: {
    summary: 'List cash loan products',
    description:
      'Returns published cash loans only (`type=LOAN`). Save each product `id` — you will need it as `productId` when someone applies. Do not send `appId`. Ignore other product types; they have their own guides.'
  },
  mortgage: {
    summary: 'List mortgage products',
    description:
      'Returns published property mortgages only (`type=MORTGAGE`). Read facility size, equity / down-payment rules, and tenure. Save `id` as `productId`. Do not treat these rows as cash loans.'
  },
  commodity: {
    summary: 'List commodity products',
    description:
      'Returns goods sold in units (`type=COMMODITY`). Read unit price and minimum quantity. Save `id` as `productId`. This is a purchase catalog, not credit.'
  },
  savings: {
    summary: 'List savings products',
    description:
      'Returns flex and target/lock plans (`type=SAVINGS`). Read interest, withdrawal flexibility, and any savings goal. Save `id` as `productId`.'
  },
  investment: {
    summary: 'List investment products',
    description:
      'Returns unit investments (`type=INVESTMENT`). Read unit price, return/yield, and minimum quantity. Save `id` as `productId`. Do not use the savings or loan catalog here.'
  }
};

const APPLICATION_COPY: Record<IntegratorProductSlug, { summary: string; description: string }> = {
  loan: {
    summary: 'Submit a loan application',
    description:
      'One request per borrower. Use the loan catalog `id` as `productId`, put the amount in `application.contractSnapshot.principal`, and set `loanWorkflowCallbackUrl` so Plata can notify you when the application moves. Include `monthlyIncome` and `repaymentSource` when you have them.'
  },
  mortgage: {
    summary: 'Submit a mortgage application',
    description:
      'One request per buyer. Use the mortgage catalog `id` as `productId`. Send `mortgageAmount`, `propertyValue`, and `equityContribution` in the contract snapshot — not a cash-loan principal. Set `loanWorkflowCallbackUrl` for status updates.'
  },
  commodity: {
    summary: 'Record a commodity purchase',
    description:
      'Records units bought, not a credit application. Send quantity, unit price, and total amount. Omit `loanWorkflowCallbackUrl`.'
  },
  savings: {
    summary: 'Open a savings plan',
    description:
      'Opens the plan at zero balance. Send your `localApplicationId` plus savings balances of 0. For a target lock, also send target amount and monthly contribution. Do not send a loan principal or loan-workflow callback.'
  },
  investment: {
    summary: 'Record an investment subscription',
    description:
      'Records units subscribed. Send quantity, unit price, total amount, and expected return if you calculated it. Omit loan, mortgage, and savings-target fields.'
  }
};

const MORTGAGE_COPY: Record<string, { summary: string; description?: string }> = {
  [SCHEDULE_PREVIEW_PATH]: {
    summary: 'Preview mortgage repayments before applying',
    description:
      'Send the facility `amount` and `propertyValue`. Returns each instalment and the total to repay, with the down payment taken into account. Nothing is saved. Public read — API keys are not required.'
  },
  [STATUS_PATH]: {
    summary: 'Get mortgage application status',
    description:
      'See stage, next action, and how much down payment (equity) is still owed. Use the Plata application id or your localApplicationId.'
  },
  [ACCOUNT_PATH]: {
    summary: 'Get mortgage account details',
    description: 'Facility amount, amount disbursed, outstanding balance, next instalment, and overdue info after funding.'
  },
  [REPAYMENT_SCHEDULE_PATH]: {
    summary: 'Get mortgage repayment schedule',
    description: 'Every instalment after disbursement. Returns 409 if the mortgage is not funded yet.'
  }
};

const DEPOSIT_STATUS_ACCOUNT_COPY: Record<
  IntegratorProductSlug,
  Partial<Record<string, { summary: string; description?: string }>>
> = {
  loan: {},
  mortgage: {},
  commodity: {
    [STATUS_PATH]: {
      summary: 'Get commodity application status',
      description: 'See stage (`enrolled` / `active` / `withdrawal_pending`) and nextAction (`deposit`, `request_maturity_withdrawal`, …).'
    },
    [ACCOUNT_PATH]: {
      summary: 'Get commodity account details',
      description: 'Holding balance, quantity, unit price, maturity, holdingStatus, and any pending withdrawal.'
    }
  },
  savings: {
    [STATUS_PATH]: {
      summary: 'Get savings application status',
      description: 'See whether the plan is enrolled, active, waiting on a withdrawal, or closed.'
    },
    [ACCOUNT_PATH]: {
      summary: 'Get savings account details',
      description: 'Current balance, target fields, maturity, holdingStatus, and pendingWithdrawal when queued.'
    }
  },
  investment: {
    [STATUS_PATH]: {
      summary: 'Get investment application status',
      description: 'See stage and nextAction for funding or maturity withdrawal.'
    },
    [ACCOUNT_PATH]: {
      summary: 'Get investment account details',
      description: 'Units held, balance, expected interest, maturity, and pending liquidation/withdrawal.'
    }
  }
};

function numberSummaries(paths: Record<string, PathItem>): void {
  let step = 0;
  for (const item of Object.values(paths)) {
    for (const operation of Object.values(item)) {
      if (!operation?.summary) continue;
      step += 1;
      operation.summary = `${step}. ${operation.summary.replace(/^\d+\.\s*/, '')}`;
    }
  }
}

export function buildIntegratorProductSpec(slug: string) {
  const product = integratorProductBySlug(slug);
  if (!product) return null;

  const source = merchantIntegrationSpec as {
    paths: Record<string, PathItem>;
    components: unknown;
    servers: unknown;
    security: unknown;
  };
  const paths: Record<string, PathItem> = {};

  for (const path of product.paths) {
    const item = clone(source.paths[path]);
    if (!item) continue;
    for (const operation of Object.values(item)) {
      if (!operation) continue;
      operation.tags = [product.title];
      if (path === '/api/v1/products' && operation.parameters) {
        operation.summary = CATALOG_COPY[product.slug].summary;
        operation.description = CATALOG_COPY[product.slug].description;
        for (const parameter of operation.parameters) {
          if (parameter.name === 'type') {
            parameter.required = true;
            parameter.example = product.type;
            parameter.description = `Must be \`${product.type}\` on this guide.`;
          }
        }
        operation.responses = {
          ...(operation.responses || {}),
          '200': {
            description: `Published ${product.type} products. Keep data[].id.`,
            content: {
              'application/json': {
                example: { success: true, data: [CATALOG_EXAMPLES[product.slug]] }
              }
            }
          }
        };
      }
      if (path === '/api/v1/products/external-applications') {
        operation.summary = APPLICATION_COPY[product.slug].summary;
        operation.description = APPLICATION_COPY[product.slug].description;
        const json = operation.requestBody?.content?.['application/json'];
        if (json) json.example = APPLICATION_EXAMPLES[product.slug];
      }
      if (path === '/api/v1/products/sub-merchant-activations') {
        const activationCopy: Record<IntegratorProductSlug, { summary: string; description: string }> = {
          loan: {
            summary: 'Tell Plata a sub-merchant turned this loan on or off',
            description:
              'Optional. Only needed if sellers in your network activate or deactivate a loan. Send the catalog `productId` and `status` (`active` or `deactivated`). This does not create or host the product for you.'
          },
          mortgage: {
            summary: 'Tell Plata a sub-merchant listed or delisted this mortgage',
            description:
              'Optional. Use when a seller in your network lists or delists this mortgage. Send catalog `productId` and `status` (`active` or `deactivated`).'
          },
          commodity: {
            summary: 'Tell Plata a sub-merchant started or stopped selling this commodity',
            description:
              'Optional. Use when a seller turns this commodity on or off. Send catalog `productId` and `status` (`active` or `deactivated`).'
          },
          savings: {
            summary: 'Tell Plata a sub-merchant turned this savings plan on or off',
            description:
              'Optional. Use when a seller activates or deactivates this savings plan. Send catalog `productId` and `status` (`active` or `deactivated`).'
          },
          investment: {
            summary: 'Tell Plata a sub-merchant turned this investment on or off',
            description:
              'Optional. Use when a seller enables or disables this investment offering. Send catalog `productId` and `status` (`active` or `deactivated`).'
          }
        };
        operation.summary = activationCopy[product.slug].summary;
        operation.description = activationCopy[product.slug].description;
      }
      const mortgageCopy = product.slug === 'mortgage' ? MORTGAGE_COPY[path] : undefined;
      if (mortgageCopy) {
        operation.summary = mortgageCopy.summary;
        if (mortgageCopy.description) operation.description = mortgageCopy.description;
      }
      const depositCopy = DEPOSIT_STATUS_ACCOUNT_COPY[product.slug]?.[path];
      if (depositCopy) {
        operation.summary = depositCopy.summary;
        if (depositCopy.description) operation.description = depositCopy.description;
      }
    }
    paths[path] = item;
  }
  numberSummaries(paths);

  return {
    openapi: '3.0.0',
    info: {
      title: `Plata Merchant Integration Documentation — ${product.title}`,
      version: '1.8.0',
      description: guide(product.slug)
    },
    servers: source.servers,
    tags: [
      {
        name: product.title,
        description: `Follow the numbered walkthrough in the description above. Other products are separate guides under /docs.`
      }
    ],
    paths,
    components: source.components,
    security: source.security
  };
}
