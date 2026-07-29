# External bank accounts & PRIMARY wallet payout — frontend guide

Guide for the **mobile storefront / PWA** to let retail users save their own external bank accounts and withdraw from their **PRIMARY** wallet only to those saved accounts.

All paths below are relative to the **API gateway** (**account-ms**). The storefront should call **same origin** on the tenant host (e.g. `https://www.{subdomain}.tryspring.io`); account-ms proxies `/api/v1/wallets/*` → **wallet-ms**.

## Auth

Every endpoint in this guide requires:

```http
Authorization: Bearer <accessToken>
Content-Type: application/json
```

`userId` in the path must match the logged-in user (`user.id` from login). The gateway forwards the JWT to wallet-ms.

## Prerequisites

Before add-account or payout works end-to-end:

1. User completed **Fuspay modular KYC** (`/api/v1/kyc/modular/…` via compliance-ms).
2. User has an active **PRIMARY** wallet with PayOnUs `virtualNuban` (`GET /api/v1/wallets/user/{userId}`).
3. User has set a **4-digit transaction PIN** (required for payout).

---

## End-to-end UX flow

```text
1. GET  /api/v1/wallets/banks
2. User picks bank (display name) + enters 10-digit account number
3. POST /api/v1/wallets/banks/name-enquiry   (optional preview — recommended)
4. POST /api/v1/wallets/user/{userId}/external-bank-accounts
5. GET  /api/v1/wallets/user/{userId}/external-bank-accounts   (list saved)
6. POST /api/v1/wallets/user/{userId}/payout   (to a saved account only)
```

---

## 1. Bank list (picker)

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/wallets/banks` |
| **Query** | `refresh=true` (optional, bypass cache) |

**Response `200`:**

```json
{
  "success": true,
  "cached": true,
  "count": 120,
  "data": [
    { "code": "058", "name": "GTBank" },
    { "code": "100004", "name": "OPay" }
  ]
}
```

**Frontend:** Show `data[].name` in the picker. When saving, send **`bankName`** = selected `name` (backend resolves `bankCode` from this list). You may also send `bankCode` directly if you keep `code` in state.

---

## 2. Name enquiry (preview — recommended)

Confirm account holder name before save. Same check wallet-ms runs on save.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/wallets/banks/name-enquiry` |

**Request:**

```json
{
  "accountNumber": "0123456789",
  "bankCode": "058",
  "currency": "NGN"
}
```

If the user only picked by name, resolve `bankCode` client-side from the bank list **or** call save with `bankName` only (save endpoint resolves code server-side).

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "accountName": "SMITH JANE ADE",
    "accountNumber": "0123456789",
    "bankCode": "058",
    "bankName": "GTBank"
  }
}
```

**Response `422`:** verification failed — show `error`.

Display `data.accountName` to the user. Use this value (or a close variant) as `accountName` when saving.

---

## 3. Add saved external bank account

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/wallets/user/{userId}/external-bank-accounts` |

**Request (recommended):**

```json
{
  "bankName": "GTBank",
  "accountNumber": "0123456789",
  "accountName": "Jane Smith",
  "currency": "NGN",
  "label": "My salary account"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `bankName` | One of `bankName` / `bankCode` | Label from bank picker (`GET /banks`) |
| `bankCode` | One of `bankName` / `bankCode` | Alternative if you store `code` from picker |
| `accountNumber` | Yes | Exactly **10 digits** |
| `accountName` | Optional but recommended | From name enquiry; must **closely match** PayOnUs |
| `currency` | Optional | Default `NGN` |
| `label` | Optional | User nickname, max 80 chars |

**What the backend does:**

1. Resolves `bankCode` + canonical `bankName` from PayOnUs bank list.
2. PayOnUs **name enquiry** → authoritative account holder name.
3. If `accountName` sent → must closely match PayOnUs name (reordering / extra middle names OK).
4. PayOnUs name must match user's **KYC legal name**.
5. Persists **PayOnUs-resolved** `accountName`, `bankCode`, `bankName` (not raw frontend strings if they differ).

**Response `201`:**

```json
{
  "success": true,
  "message": "Bank account saved successfully",
  "data": {
    "account": {
      "id": "674a1b2c3d4e5f6789012345",
      "userId": "user-uuid",
      "accountNumber": "0123456789",
      "bankCode": "058",
      "bankName": "GTBank",
      "accountName": "SMITH JANE ADE",
      "label": "My salary account",
      "currency": "NGN",
      "isDefault": true,
      "status": "active",
      "verifiedAt": "2026-07-09T06:00:00.000Z",
      "createdAt": "2026-07-09T06:00:00.000Z",
      "updatedAt": "2026-07-09T06:00:00.000Z"
    }
  }
}
```

**Error responses:**

| HTTP | When |
|------|------|
| `400` | Validation (bad account number, missing bank, etc.) |
| `409` | Account already saved (max **5** per user) |
| `422` | Bank not in list, name enquiry failed, submitted name ≠ PayOnUs, or name ≠ KYC |

Example `422`:

```json
{
  "success": false,
  "error": "Bank account name does not match your verified KYC identity. You can only save accounts registered in your name."
}
```

---

## 4. List saved accounts

| | |
|---|---|
| **Method** | `GET` |
| **Path** | `/api/v1/wallets/user/{userId}/external-bank-accounts` |

**Response `200`:**

```json
{
  "success": true,
  "data": {
    "accounts": [
      {
        "id": "674a1b2c3d4e5f6789012345",
        "accountNumber": "0123456789",
        "bankCode": "058",
        "bankName": "GTBank",
        "accountName": "SMITH JANE ADE",
        "label": "My salary account",
        "currency": "NGN",
        "isDefault": true,
        "status": "active",
        "verifiedAt": "2026-07-09T06:00:00.000Z",
        "createdAt": "2026-07-09T06:00:00.000Z",
        "updatedAt": "2026-07-09T06:00:00.000Z"
      }
    ]
  }
}
```

Default account is listed first (`isDefault: true`).

---

## 5. Remove saved account

| | |
|---|---|
| **Method** | `DELETE` |
| **Path** | `/api/v1/wallets/user/{userId}/external-bank-accounts/{accountId}` |

**Response `200`:**

```json
{
  "success": true,
  "message": "Bank account removed"
}
```

If the removed account was default, the oldest remaining account becomes default.

---

## 6. Set default account

| | |
|---|---|
| **Method** | `PATCH` |
| **Path** | `/api/v1/wallets/user/{userId}/external-bank-accounts/{accountId}/default` |

**Response `200`:**

```json
{
  "success": true,
  "message": "Default bank account updated",
  "data": {
    "account": { "...": "..." }
  }
}
```

---

## 7. Payout to saved account (PRIMARY wallet → bank)

Withdrawals only go to **saved** accounts. Raw bank details on payout are **not** accepted.

| | |
|---|---|
| **Method** | `POST` |
| **Path** | `/api/v1/wallets/user/{userId}/payout` |

**Request:**

```json
{
  "savedBankAccountId": "674a1b2c3d4e5f6789012345",
  "amount": 5000,
  "currency": "NGN",
  "narration": "Withdrawal",
  "pin": "1234"
}
```

| Field | Required | Notes |
|-------|----------|--------|
| `savedBankAccountId` | Yes | `id` from list/add response |
| `amount` | Yes | Positive number |
| `pin` | Yes* | 4-digit transaction PIN |
| `currency` | Optional | Must match wallet |
| `narration` | Optional | Transfer description |
| `reference` | Optional | Idempotency reference |

\*If user has no PIN yet, see [Transaction PIN](#transaction-pin) below.

**Response `200`:**

```json
{
  "success": true,
  "message": "Payout processed successfully",
  "data": {
    "wallet": { "...": "PRIMARY wallet after debit" },
    "transaction": { "...": "DEBIT transaction" },
    "payoutReference": "payout-...",
    "providerReference": "payonus-ref",
    "providerStatus": "PENDING",
    "savedBankAccountId": "674a1b2c3d4e5f6789012345"
  }
}
```

**PIN errors:**

| HTTP | `code` | Action |
|------|--------|--------|
| `409` | `TRANSACTION_PIN_REQUIRED` | Prompt user to create PIN |
| `400` | `TRANSACTION_PIN_MISSING` | Include `pin` in body |
| `401` | `INVALID_TRANSACTION_PIN` | Retry (`attemptsRemaining` in body) |
| `423` | `TRANSACTION_PIN_LOCKED` | Wait until `lockedUntil` |

---

## Transaction PIN

| Method | Path | Body |
|--------|------|------|
| `GET` | `/api/v1/wallets/user/{userId}/transaction-pin/status` | — |
| `POST` | `/api/v1/wallets/user/{userId}/transaction-pin` | `{ "pin": "1234" }` |
| `PUT` | `/api/v1/wallets/user/{userId}/transaction-pin` | `{ "currentPin": "1234", "newPin": "5678" }` |

**Status response:**

```json
{
  "success": true,
  "data": {
    "hasTransactionPin": true,
    "locked": false,
    "lockedUntil": null
  }
}
```

Prompt PIN setup after KYC when `hasTransactionPin === false`.

---

## Gateway & environments

| Environment | API base (storefront) | Proxied to |
|-------------|----------------------|------------|
| Tenant PWA | `https://www.{subdomain}.tryspring.io` | account-ms → wallet-ms |
| Gateway (direct) | `https://account-ms.fly.dev` | wallet-ms |

Path prefix is always `/api/v1/wallets/…`. No extra headers needed on the storefront when using same-origin tenant requests.

---

## TypeScript shapes (frontend)

```ts
interface BankPickerItem {
  code: string;
  name: string;
}

interface SavedExternalBankAccount {
  id: string;
  accountNumber: string;
  bankCode: string;
  bankName?: string;
  accountName: string;
  label?: string;
  currency: string;
  isDefault: boolean;
  status: 'active' | 'deleted';
  verifiedAt: string;
  createdAt: string;
  updatedAt: string;
}

interface AddExternalBankAccountRequest {
  bankName?: string;
  bankCode?: string;
  accountNumber: string;
  accountName?: string;
  currency?: string;
  label?: string;
}

interface PayoutRequest {
  savedBankAccountId: string;
  amount: number;
  pin: string;
  currency?: string;
  narration?: string;
  reference?: string;
}
```

---

## Rules summary

- **Save:** `bankName` from picker + `accountNumber` + optional `accountName` (from name enquiry).
- **Stored name:** Always PayOnUs-resolved `accountName` after KYC ownership check.
- **Payout:** Only `savedBankAccountId` — not free-form bank details.
- **Limit:** Max 5 saved accounts per user.
- **KYC required** before first save.
