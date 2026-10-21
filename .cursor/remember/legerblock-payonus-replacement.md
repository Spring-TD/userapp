# LegerBlock as PayOnUs replacement (Plata + springApp)

**Read this before implementing any LegerBlock / PayOnUs dual-provider or cutover work.**

Docs index: https://docs.legerblock.com/llms.txt  
Overview: https://docs.legerblock.com/docs/legerblock-overview  
Base URL (from Getting Started): `https://block.fuspay.finance`

Spelling in docs varies (`LegerBlock` / `LedgerBlock`); treat as the same product. Prefer env/code id `legerblock`.

---

## Goal

Replace **PayOnUs** for NUBAN collections, funding webhooks, bank list / name enquiry, and (springApp) outbound payouts — while keeping **backward compatibility** for wallets that already have PayOnUs NUBANs.

**Do not** revoke or re-provision existing PayOnUs accounts. Dual-run until those accounts are inactive or explicitly remapped.

---

## What PayOnUs does today (must map 1:1)

| Capability | springApp | Plata | LegerBlock equivalent |
|------------|-----------|-------|------------------------|
| Merchant dynamic VA | Yes | Yes | `POST /api/v1/collection/subwallet` (`DYNAMIC_VIRTUAL_ACCOUNT`) |
| Retail fixed / reserved NUBAN | Yes (post–Fuspay KYC) | Yes (at user wallet create) | Static VA: `POST /api/v1/static/account` (+ assign/map funding source) |
| Inbound funding webhook | Yes | Yes | Collection webhooks + `x-ledgerblock-signature` |
| Bank list | Yes | No (stubs) | `GET /api/v1/payout/bank-list?currency=NGN` |
| Name enquiry / account verify | Yes | No | `POST /api/v1/payout/bank-list/verify` |
| Outbound bank payout | Yes | Partial / not fully wired | Initiate + confirm wallet→bank payout |
| Payout status webhook | Yes | No | Payout webhooks |
| OAuth access-token dance | Yes | Yes | Bearer **API key** + `x-merchant-ref` (no PayOnUs-style access-token flow) |

Only **`wallet-ms`** should call LegerBlock HTTP (same boundary as PayOnUs today).

---

## Auth & merchant setup

1. Create merchant → get **API key**, **`x-merchant-ref`**, default merchant wallet.
2. Submit `x-merchant-ref` for **approval** before live API use.
3. Every request: `Authorization: Bearer <api_key>` and usually `x-merchant-ref: <ref>`.
4. **IP whitelist** required before payouts.
5. Webhooks: HMAC-SHA512; header `x-ledgerblock-signature`; verify on **raw body**.

Env sketch (both trees’ `wallet-ms`):

```text
LEGERBLOCK_BASE_URL=https://block.fuspay.finance
LEGERBLOCK_API_KEY=...
LEGERBLOCK_MERCHANT_REF=...
LEGERBLOCK_WEBHOOK_SECRET=...
LEGERBLOCK_COLLECTION_NOTIFICATION_URL=https://…/api/v1/wallets/funding/callback/legerblock
LEGERBLOCK_PAYOUT_NOTIFICATION_URL=https://…/api/v1/wallets/payout/callback/legerblock
# Keep PayOnUs envs until dual-run ends
```

Docs note a **dedicated** bank-list API key in the Nigerian Bank List page; confirm with LegerBlock whether production uses the merchant key or that dedicated key before hardcoding.

---

## Recommended onboarding flow (retail user → NUBAN)

From Getting Started (ordered):

1. Create User → `user_ref` — `POST /api/v1/merchant/user`
2. Create Wallet (NGN) → `wallet_id` — `POST /api/v1/user/subwallet` (`chain: ""` for fiat)
3. Map KYC billing wallet (fees)
4. Perform / verify KYC (LegerBlock KYC APIs) — **or** decide how Fuspay KYC maps (see open questions)
5. Assign **static** NGN VA for persistent retail collections  
   - Prefer the wallet-assigned static flow: `POST /api/v1/static/account` with `user_ref`, `wallet_id`, `fund_type: STATIC_VIRTUAL_ACCOUNT`, `chain: FIAT_ACCOUNT`, `account_reference`, `user_kyc` (name, email, address, phone, **bvn**, dob)  
   - Alternate doc shape: create static account with `user_name` / `account_reference` / `user_kyc.nin` + `bvn` (KYC fee charged to merchant wallet)
6. Store returned `account_number`, bank info, `funding_source_id` on our wallet as `virtualNuban` + `nubanProvider: 'legerblock'`

**Merchant / one-off collections:** Dynamic VA via `POST /api/v1/collection/subwallet` with amount + `notification_url` (maps to PayOnUs dynamic merchant VA).

**PIN:** Wallet PIN setup required before confirmable payouts (`Authorize PIN` → `Finalize PIN`).

---

## Collections (inbound)

### Static / persistent NUBAN (closest to PayOnUs fixed retail VA)

- Customer transfers to assigned account number.
- LegerBlock posts collection webhook → we credit our ledger by `account_number` (and/or `wallet_id` / `tx_ref`).

### Dynamic VA (closest to PayOnUs dynamic)

- Create per payment; return `pay_data.account_number` / bank to payer.
- Webhook on `notification_url` when paid.

### Collection webhook payload (credit our wallet-ms)

```json
{
  "account_number": "…",
  "wallet_id": "LBNGNG…",
  "tx_ref": "…",
  "amount": 100,
  "payment_status": "SUCCESSFUL",
  "payment_channel": "BANK_TRANSFER",
  "sender": { "accountNumber": "…", "bankCode": "…", "bankName": "…", "name": "…" }
}
```

Handler rules (same as PayOnUs funding):

1. Verify `x-ledgerblock-signature` (HMAC-SHA512, raw body).
2. Idempotent on `tx_ref`.
3. Resolve wallet by NUBAN / mapped `wallet_id`.
4. Credit only when `payment_status === SUCCESSFUL` and amount sane.
5. Return 2xx.

Keep **PayOnUs** `POST …/funding/callback` live for old NUBANs; add **LegerBlock** path (or branch inside funding controller by signature/provider).

---

## Payouts (springApp; later Plata if needed)

Flow:

1. Bank list → pick `bank_code`
2. Verify account → `POST /api/v1/payout/bank-list/verify` `{ bank_code, account_number }` → `account_name`
3. Initiate → `POST /api/v1/payout/wallet-bank`  
   `{ user_ref, currency, wallet_type: "SUB_WALLET", txn_merchant_ref, amount, account_no, bank_code, notification_url }`  
   → `payment_ref`, `auth_token`, status `AWAITING_CONFIRMATION`
4. Confirm → `POST /api/v1/payout/wallet-bank/confirm`  
   `{ user_ref, auth_token, wallet_pin }` → `PENDING`
5. Payout webhook updates final status (`pending` / `processing` / `successful` / `failed`)

Map to existing springApp routes:

- `GET /api/v1/wallets/banks` → LegerBlock bank list  
- `POST /api/v1/wallets/banks/name-enquiry` → verify endpoint  
- `POST …/payout` → initiate + confirm (PIN model differs from PayOnUs; may need product decision)  
- `POST …/payout/callback` → LegerBlock payout webhook  

**PIN gap:** LegerBlock requires wallet PIN confirmation. PayOnUs payout today may not use the same two-step PIN. Implementation must either:

- drive LegerBlock PIN from our existing user PIN / create LegerBlock PIN at provision time, or  
- use a server-side PIN vault for merchant-initiated payouts (confirm with LegerBlock if merchant PIN / alternative auth exists).

---

## Backward compatibility design (mandatory)

1. Add `nubanProvider: 'payonus' | 'legerblock'` on wallet (default/infer `payonus` when legacy `payonusNuban*` present).
2. Keep storing/reading `virtualNuban` (+ legacy `payonusNuban*` aliases) so product-ms / UI do not break.
3. **Provision:** new wallets → LegerBlock; existing active PayOnUs → leave alone.
4. **Funding webhooks:** both providers active; lookup by account number.
5. **Payouts:** route by `nubanProvider` (or force LegerBlock only for new wallets).
6. Never delete PayOnUs credentials until zero live PayOnUs NUBANs (or explicit remapping campaign).

Plata already has BankOne opt-in paths in some wallet NUBAN code — treat LegerBlock as another provider behind the same abstraction, not a second parallel one-off.

---

## Suggested `wallet-ms` abstraction

```text
NubanProvider
  provisionMerchantVa(...)
  provisionUserFixedVa(...)
  handleFundingWebhook(req)
  listBanks()
  nameEnquiry(bankCode, accountNumber)
  initiatePayout(...) / confirmPayout(...)   // springApp
  handlePayoutWebhook(req)
```

Implementations: `PayonusNubanProvider`, `LegerblockNubanProvider`.  
Select by env default + per-wallet `nubanProvider`.

Touch both:

- `springApp/wallet-ms`
- `plata/wallet-ms`

Compliance / client-auth only trigger provision; they should not call LegerBlock directly (same as PayOnUs).

---

## Mapping our entities → LegerBlock

| Our concept | LegerBlock |
|-------------|------------|
| Spring/Plata `userId` | `user_ref` (create once; store on user or wallet metadata) |
| Our merchant wallet / user wallet ledger | Separate: we still keep **our** balances; LegerBlock holds rails VA + their `wallet_id` |
| PayOnUs fixed VA | Static VA + funding source on LB `wallet_id` |
| PayOnUs dynamic VA | Dynamic collection subwallet |
| PayOnUs funding callback | Collection webhook |
| PayOnUs payout + status callback | Initiate/confirm + payout webhook |
| BVN for VA | `user_kyc.bvn` (+ often NIN/DOB/address on static assign) |

Important: LegerBlock is a **Wallet-as-a-Service + rails** layer. We can either:

- **A (recommended for minimal blast radius):** keep our internal ledger; use LB only for VA + payout rails (like PayOnUs today), or  
- **B:** also move balances into LB wallets (much larger change; not required to replace PayOnUs).

Prefer **A** unless product explicitly wants B.

---

## Open questions before coding

1. Production vs sandbox base URL besides `https://block.fuspay.finance`.
2. Exact HMAC-SHA512 string-to-sign / secret for `x-ledgerblock-signature` (confirm with [webhook algorithm doc](https://docs.legerblock.com/docs/webhook-algorithm-hmac-sha512.md) + LegerBlock support).
3. Bank-list dedicated API key vs merchant API key in production.
4. How Fuspay KYC interacts with LegerBlock KYC fees / tiers (duplicate KYC?).
5. Whether NIN is mandatory for NGN static VA in production.
6. Payout PIN: map our PIN or merchant-operated confirmation path.
7. One LegerBlock merchant for all Plata FIs vs per-FI merchants.
8. Whether Plata must get payouts in phase 1 or only VA + funding first.

---

## Implementation phases (suggested)

1. **Docs + env + provider interface** (this file).
2. **LegerBlock client** in both wallet-ms trees (auth, create user/wallet, static VA).
3. **Dual funding webhooks** + `nubanProvider` persistence.
4. **Flip new provision** to LegerBlock (feature flag).
5. **Bank list + name enquiry** swap/adapter.
6. **Payout initiate/confirm + webhook** (springApp first).
7. Deprecate PayOnUs provision; keep PayOnUs funding until drain.

---

## Key doc links

| Topic | URL |
|-------|-----|
| Overview | https://docs.legerblock.com/docs/legerblock-overview |
| Getting started | https://docs.legerblock.com/docs/getting-started-1 |
| Auth | https://docs.legerblock.com/docs/authentication |
| Create user | https://docs.legerblock.com/docs/create-user |
| Create wallet | https://docs.legerblock.com/docs/create-wallet |
| Static accounts (wallet assign) | https://docs.legerblock.com/docs/static-accounts |
| Static accounts (NIN/BVN) | https://docs.legerblock.com/docs/create-static-accounts-ngn-usd-gbp-eur |
| Dynamic VA | https://docs.legerblock.com/docs/dynamic-virtual-accounts |
| Collection webhooks | https://docs.legerblock.com/docs/collection-webhooks |
| Webhook HMAC | https://docs.legerblock.com/docs/webhook-algorithm-hmac-sha512 |
| Bank list | https://docs.legerblock.com/docs/nigerian-bank-list |
| Account verify | https://docs.legerblock.com/docs/nigeria-bank-account-verification |
| Initiate bank payout | https://docs.legerblock.com/docs/initiate-wallet-to-bank-payout |
| Confirm bank payout | https://docs.legerblock.com/docs/confirm-wallet-to-bank-payout |
| Payout webhooks | https://docs.legerblock.com/docs/payout-webhooks |
| Full index | https://docs.legerblock.com/llms.txt |

---

## Implementation status (code)

Scaffolded dual-run in both `springApp/wallet-ms` and `plata/wallet-ms`:

- Config: `LEGERBLOCK_*`, `NUBAN_PROVIDER_DEFAULT` (default remains `payonus`)
- Client: create user → wallet → static VA; bank list; name enquiry; initiate+confirm payout (springApp)
- Router: `provisionVirtualNubanForWallet` (never overwrites active NUBAN)
- Webhooks: `POST .../funding/callback/legerblock` (+ springApp `.../payout/callback/legerblock`)
- Wallet fields: `nubanProvider`, `legerblockUserRef`, `legerblockWalletId` (account still on `payonusNuban*` columns for lookup)

**Cutover:** set credentials, whitelist IPs, then `NUBAN_PROVIDER_DEFAULT=legerblock` + `LEGERBLOCK_NUBAN_ENABLED=true`.

### Live API notes (2026-10-21)

- Persistent NGN VA is **`PUT /api/v1/user/subwallet-fund-source`** (not `POST /api/v1/static/account`, which can return `null`).
- `user_kyc.name` (not `user_name`) is required on that map endpoint.
- Test BVN `00000000000` collides across customers → use unique BVNs when `LEGERBLOCK_VA_USE_TEST_PLACEHOLDERS=true`.
- Dynamic VA (`POST /api/v1/collection/subwallet`) works for one-off collections.
- springApp user wallets provision NUBAN via `POST /api/v1/internal/wallets/user/:userId/provision-nuban` (post-KYC), not at wallet create.

## Last updated

2026-10-21 — live NUBAN create verified on Spring wallet-ms + both LegerBlock merchant keys; static map endpoint corrected.
