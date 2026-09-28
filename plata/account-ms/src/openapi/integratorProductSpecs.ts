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
      ...SUB_MERCHANT_PATHS
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
      ...SUB_MERCHANT_PATHS
    ]
  },
  {
    slug: 'commodity',
    title: 'Commodity',
    type: 'COMMODITY',
    paths: [
      ...SHARED_PATHS,
      '/api/v1/wallets/commodity/principal-repayment',
      '/api/v1/wallets/commodity/maturity-withdrawal-request',
      '/api/v1/wallets/commodity/maturity-payout'
    ]
  },
  {
    slug: 'savings',
    title: 'Savings',
    type: 'SAVINGS',
    paths: [
      ...SHARED_PATHS,
      '/api/v1/wallets/savings/principal-repayment',
      '/api/v1/wallets/savings/application-activity',
      '/api/v1/wallets/savings/maturity-withdrawal-request',
      '/api/v1/wallets/savings/maturity-payout'
    ]
  },
  {
    slug: 'investment',
    title: 'Investment',
    type: 'INVESTMENT',
    paths: [
      ...SHARED_PATHS,
      '/api/v1/wallets/investment/principal-repayment',
      '/api/v1/wallets/investment/maturity-withdrawal-request',
      '/api/v1/wallets/investment/maturity-payout'
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

Property finance only. This is not the loan guide. There is no principal-repayment or maturity payout here.

Auth on every call: \`PLATA_PUBLIC_KEY\` and \`PLATA_SECRET_KEY\`.

## 1. Fetch mortgage products

\`GET /api/v1/products?type=MORTGAGE\` — do not send \`appId\`.

Read property terms, not a cash-loan amount range. Keep:

- \`id\` — later \`productId\`
- \`structure.mortgageAmount\` or equivalent amount
- \`structure.equityRequirement\` and \`structure.equityContribution\` (down payment, flat or percent)
- tenure / repayment structure

If equity is required, the applicant must pay that down payment before the merchant can approve. Build that into what you show the buyer.

## 2. Offer the mortgage to buyers

Store the catalog \`id\` and show the property product with the down-payment rule. When a sub-merchant lists or delists it, \`POST /api/v1/products/sub-merchant-activations\` with that \`productId\`.

## 3. Send each mortgage application to Plata

\`POST /api/v1/products/external-applications\` is the same URL as loans, but the snapshot is a property file:

| Field | Mortgage meaning |
|-------|----------------|
| \`productId\` | Catalog mortgage \`id\` |
| \`application.contractSnapshot.mortgageAmount\` | Facility amount, naira |
| \`application.contractSnapshot.propertyValue\` | Property value, naira |
| \`application.contractSnapshot.equityContribution\` | Down payment the buyer must pay |
| \`loanWorkflowCallbackUrl\` | Approval / status webhook |

Do not put a cash-loan \`principal\` in place of the mortgage and equity fields.

Optional: \`POST /api/v1/products/external-accounts\` for the buyer's NUBAN before you submit. Plata then POSTs workflow updates to your callback. Equity collection itself is not a gateway call on this page.

Before applying you can show the buyer their repayments with \`POST /api/v1/products/{id}/loan-schedule\` (send \`amount\` and \`propertyValue\`). \`GET /api/v1/products/{id}\` returns one mortgage product in full.

## 4. Track the mortgage

\`{applicationId}\` is the Plata id from the submit response or your own \`localApplicationId\`.

- **Status:** \`GET /api/v1/products/external-applications/{applicationId}\`. \`downPayment\` shows how much equity is still owed. After approval, \`stage\` follows the mortgage steps (inspection, contract, down payment) and \`nextAction\` is \`continue_mortgage_workflow\` until disbursement.
- **Mortgage account:** \`GET .../external-applications/{applicationId}/account\` — facility amount, amount disbursed, outstanding balance, next instalment, days overdue.
- **Repayment schedule:** \`GET .../external-applications/{applicationId}/repayment-schedule\` — every instalment, available after disbursement.

The cash-loan offer accept/decline call is not on this guide. Mortgage offers, inspections, and contract signing run through the lender's mortgage workflow.
`.trim(),
  commodity: `
# Commodity

Unit purchase (goods), not a loan and not a savings plan. No loan-workflow callback is required.

Auth on every call: \`PLATA_PUBLIC_KEY\` and \`PLATA_SECRET_KEY\`.

## 1. Fetch commodity products

\`GET /api/v1/products?type=COMMODITY\` — do not send \`appId\`.

Keep \`id\`, unit price (\`structure.unitAmount\`), min quantity, yield if any, and withdrawal flexibility. Show price per unit to the buyer. That \`id\` is \`productId\`.

## 2. Put the commodity on sale

Store the catalog \`id\` and let users buy units in your app. When a sub-merchant starts or stops selling it, \`POST /api/v1/products/sub-merchant-activations\`.

## 3. Send the purchase enrollment to Plata

\`POST /api/v1/products/external-applications\` records the purchase, not a credit application.

| Field | Commodity meaning |
|-------|----------------|
| \`productId\` | Catalog commodity \`id\` |
| \`application.contractSnapshot.quantity\` | Units bought |
| \`application.contractSnapshot.unitAmount\` | Price per unit, naira |
| \`application.contractSnapshot.amount\` | quantity × unit price |
| \`application.localApplicationId\` | Your purchase / account id |

Omit \`loanWorkflowCallbackUrl\`. Do not send \`principal\` as if this were a loan.

## 4. When the buyer pays

\`POST /api/v1/wallets/commodity/principal-repayment\` credits the product-creator **Repayment** wallet. Required: \`creatorMerchantId\`, \`creatorAppId\`, \`amount\`, \`referenceId\`. Category \`COMMODITY_DEPOSIT\`.

## 5. At maturity

1. \`POST /api/v1/wallets/commodity/maturity-withdrawal-request\` asks the FI to approve. No money moves.
2. After approval, \`POST /api/v1/wallets/commodity/maturity-payout\` debits creator **Treasury**. You credit the buyer on your platform.

Old URL \`/commodity/principal-settlement\` still works. Prefer \`principal-repayment\`.
`.trim(),
  savings: `
# Savings

Flex and target/lock savings. Not a loan application and not an investment unit purchase.

Auth on every call: \`PLATA_PUBLIC_KEY\` and \`PLATA_SECRET_KEY\`.

## 1. Fetch savings products

\`GET /api/v1/products?type=SAVINGS\` — do not send \`appId\`.

Keep \`id\` and the plan rules you must show the customer:

- \`structure.interestRate\` and interest method (often daily)
- \`structure.withdrawalFlexibility\` — anytime (flex) or locked until maturity (target/lock)
- target amount / savings goal and monthly contribution when the product is a target lock
- early-withdrawal fee if the product charges one

That \`id\` is \`productId\`.

## 2. Open the plan in your app

Store the catalog \`id\` and let a user start a flex plan or a target lock. Report sub-merchant on/off with \`POST /api/v1/products/sub-merchant-activations\`.

## 3. Enroll the saver on Plata

\`POST /api/v1/products/external-applications\` opens the plan. The balance starts at zero. This is not an approval workflow.

| Field | Savings meaning |
|-------|----------------|
| \`productId\` | Catalog savings \`id\` |
| \`application.localApplicationId\` | Your savings account id |
| \`application.contractSnapshot.savingsBalance\` | \`0\` on first enroll |
| \`application.contractSnapshot.currentBalance\` | \`0\` on first enroll |
| \`application.contractSnapshot.targetAmount\` | Target lock only |
| \`application.contractSnapshot.monthlyContribution\` | Target lock only |

Do not send \`loanWorkflowCallbackUrl\`. Do not send a loan \`principal\`.

## 4. Each deposit or top-up

\`POST /api/v1/wallets/savings/principal-repayment\` credits creator **Repayment**. Use a new \`referenceId\` per deposit. Category \`SAVINGS_DEPOSIT\`.

## 5. Activity feed

\`POST /api/v1/wallets/savings/application-activity\` with the application id returns deposits, top-ups, and withdrawals. This read exists only on the savings guide.

## 6. Withdrawal at maturity

1. \`POST /api/v1/wallets/savings/maturity-withdrawal-request\` — FI approval queue, no debit.
2. After approval, \`POST /api/v1/wallets/savings/maturity-payout\` debits creator **Treasury**. You credit the saver on your platform.

Locked plans stay locked until maturity unless the product allows a forceful early exit on your side. This gateway does not quote that fee.
`.trim(),
  investment: `
# Investment

Unit investment. Not a loan, not a mortgage down payment, and not a savings target lock.

Auth on every call: \`PLATA_PUBLIC_KEY\` and \`PLATA_SECRET_KEY\`.

## 1. Fetch investment products

\`GET /api/v1/products?type=INVESTMENT\` — do not send \`appId\`.

Keep \`id\`, \`structure.returnsOnInvestment\` or yield, \`structure.unitAmount\`, min quantity, and lock / withdrawal flexibility. Show return and unit price, not a loan rate. That \`id\` is \`productId\`.

## 2. Offer units to investors

Store the catalog \`id\` and let users buy units in your app. When a sub-merchant enables or disables the offering, \`POST /api/v1/products/sub-merchant-activations\`.

## 3. Send the investment enrollment to Plata

\`POST /api/v1/products/external-applications\` records the holding.

| Field | Investment meaning |
|-------|----------------|
| \`productId\` | Catalog investment \`id\` |
| \`application.contractSnapshot.quantity\` | Units purchased |
| \`application.contractSnapshot.unitAmount\` | Price per unit, naira |
| \`application.contractSnapshot.amount\` | Total subscription, naira |
| \`application.contractSnapshot.expectedInterest\` | Projected return if you have calculated it |
| \`application.localApplicationId\` | Your investment account id |

Do not send loan \`principal\`, property equity, or a savings target. Omit \`loanWorkflowCallbackUrl\`.

## 4. When the investor pays

\`POST /api/v1/wallets/investment/principal-repayment\` credits creator **Repayment**. Category \`INVESTMENT_DEPOSIT\`. Required: \`creatorMerchantId\`, \`creatorAppId\`, \`amount\`, \`referenceId\`.

There is no savings activity-feed route on this page.

## 5. Liquidation / maturity

1. \`POST /api/v1/wallets/investment/maturity-withdrawal-request\` queues FI approval. No debit yet.
2. After approval, \`POST /api/v1/wallets/investment/maturity-payout\` debits creator **Treasury**. You credit the investor on your platform.
`.trim()
};

function guide(slug: IntegratorProductSlug): string {
  return GUIDES[slug];
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
    summary: 'Fetch property mortgage products',
    description:
      'type=MORTGAGE only. Read mortgage amount, equityRequirement, and equityContribution (down payment). Save id as productId. Do not treat this as a cash loan.'
  },
  commodity: {
    summary: 'Fetch commodity unit products',
    description:
      'type=COMMODITY only. Read unit price and minimum quantity. Save id as productId. This is a purchase catalog, not a credit product.'
  },
  savings: {
    summary: 'Fetch flex and target-lock savings products',
    description:
      'type=SAVINGS only. Read interest rate, withdrawalFlexibility (anytime vs locked), and any savings goal. Save id as productId.'
  },
  investment: {
    summary: 'Fetch unit investment products',
    description:
      'type=INVESTMENT only. Read unit price, return/yield, and minimum quantity. Save id as productId. Do not use the savings or loan catalog.'
  }
};

const APPLICATION_COPY: Record<IntegratorProductSlug, { summary: string; description: string }> = {
  loan: {
    summary: 'Submit a loan application',
    description:
      'One request per borrower. Use the loan catalog `id` as `productId`, put the amount in `application.contractSnapshot.principal`, and set `loanWorkflowCallbackUrl` so Plata can notify you when the application moves. Include `monthlyIncome` and `repaymentSource` when you have them.'
  },
  mortgage: {
    summary: 'Send a mortgage application to Plata',
    description:
      'One call per buyer. productId is the MORTGAGE catalog id. Send mortgageAmount, propertyValue, and equityContribution in contractSnapshot. Do not send a cash-loan principal instead. Set loanWorkflowCallbackUrl for approval updates.'
  },
  commodity: {
    summary: 'Send a commodity purchase enrollment to Plata',
    description:
      'Records units bought, not a credit application. productId is the COMMODITY catalog id. Send quantity, unitAmount, and amount. Omit loanWorkflowCallbackUrl.'
  },
  savings: {
    summary: 'Enroll a saver and open the plan on Plata',
    description:
      'Opens the plan at zero balance. productId is the SAVINGS catalog id. Send localApplicationId plus savingsBalance 0. For a target lock, also send targetAmount and monthlyContribution. Do not send a loan principal or loanWorkflowCallbackUrl.'
  },
  investment: {
    summary: 'Send an investment unit subscription to Plata',
    description:
      'Records units subscribed. productId is the INVESTMENT catalog id. Send quantity, unitAmount, amount, and expectedInterest if you calculated it. Omit loan and mortgage fields.'
  }
};

const MORTGAGE_COPY: Record<string, { summary: string; description?: string }> = {
  [SCHEDULE_PREVIEW_PATH]: {
    summary: 'Preview mortgage repayments before applying',
    description:
      'Send `amount` (facility) and `propertyValue`. Returns every instalment and the total to repay, with the down payment taken off. Nothing is saved. Public read: API keys are not required.'
  },
  [STATUS_PATH]: { summary: 'Get mortgage application status' },
  [ACCOUNT_PATH]: { summary: 'Get mortgage account details' },
  [REPAYMENT_SCHEDULE_PATH]: { summary: 'Get mortgage repayment schedule' }
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
        operation.summary =
          product.slug === 'commodity'
            ? 'Report that a seller turned this commodity on or off'
            : product.slug === 'mortgage'
              ? 'Report that a sub-merchant listed or delisted this mortgage'
              : product.slug === 'savings'
                ? 'Report that a sub-merchant turned this savings plan on or off'
                : product.slug === 'investment'
                  ? 'Report that a sub-merchant turned this investment on or off'
                  : 'Tell Plata a sub-merchant turned this loan on or off';
        operation.description =
          product.slug === 'loan'
            ? 'Optional. Only needed if sellers in your network activate or deactivate a loan. Send the catalog `productId` and `status` (`active` or `deactivated`). This does not create or host the product for you.'
            : `productId must be a ${product.type} catalog id from this guide. status is active or deactivated. This does not host the product.`;
      }
      const mortgageCopy = product.slug === 'mortgage' ? MORTGAGE_COPY[path] : undefined;
      if (mortgageCopy) {
        operation.summary = mortgageCopy.summary;
        if (mortgageCopy.description) operation.description = mortgageCopy.description;
      }
    }
    paths[path] = item;
  }
  numberSummaries(paths);

  return {
    openapi: '3.0.0',
    info: {
      title: `Plata Merchant Integration Documentation — ${product.title}`,
      version: '1.6.1',
      description: guide(product.slug)
    },
    servers: source.servers,
    tags: [
      {
        name: product.title,
        description:
          product.slug === 'loan'
            ? 'Cash loans only — follow the numbered steps in the description above. Other products are separate guides under /docs.'
            : `Only ${product.title}. Other products are separate guides under /docs.`
      }
    ],
    paths,
    components: source.components,
    security: source.security
  };
}
