# Implementation log (living)

**Read this before starting the next feature, fix, or E2E.**  
**Update this file in the same change set when you finish something** (append under “Changelog”; adjust “Current state” / “Open next”).

Purpose: keep a durable record of what shipped so later steps don’t re-break prior work or re-investigate settled facts.

---

## How to use

1. **Before implementing:** skim *Current state*, *Invariants*, and the latest *Changelog* entries related to your area.
2. **While implementing:** note IDs, env, and commit SHAs you touch.
3. **After shipping:** append a dated changelog entry (what / why / where / how to verify). Move done items out of *Open next*.
4. **Do not** put secrets (passwords, tokens, full Mongo URIs) here — names, IDs, and non-secret hostnames only.

Related remember files:

- `.cursor/remember/model.md` — Plata vs springApp auth model
- `.cursor/remember/legerblock-payonus-replacement.md` — NUBAN dual-provider notes

---

## Current state (high level)

| Area | Status |
|------|--------|
| Plata wallet-ms missing modules | Restored from real sources (no stubs); NUBAN via LegerBlock path wired |
| Plata LegerBlock NUBAN E2E | OK previously (static VA provisioned, provider `legerblock`) |
| CRBC INVESTMENT E2E (David Testimony ↔ John Dave / Plata) | Passed: product created, turned on, enroll + ₦5,000 deposit mirrored on Plata |
| Storefront OTP verify “invalid though fresh” | Fixed: BFF was dropping tenant scope on `/otp/*` |
| Login before email OTP | Fixed: retail `USER` cannot login until `email_verified` + `ACTIVE`; FE redirects to verify-otp |
| Forgot-password mobile UI | Partial: forgot + sent work; `new-password` page does **not** yet call `POST /password/reset` with OTP |
| Test tx audit | Scripted pull since 2026-10-19; report `.tmp_test_tx_report.json` (gitignored if applicable) |
| LegerBlock static NUBAN funding webhook | Spring + Plata merchant notification URLs registered; Uche ₦1000 reconciled on Spring |

---

## Invariants (do not regress)

1. **No stubs** for missing plata/springApp modules — recover real sources or install properly.
2. **OTPs and retail users are app-scoped** (`app_id`). Signup / verify / resend / forgot / reset / login must share the same tenant (`x-tenant-app-id` and/or `X-Forwarded-Host` → CRBC etc.).
3. **Next BFF auth routes** that call client-auth through account-ms must use `mergeStorefrontHeaders` / `forwardStorefrontHeaders` (see OTP fix). Registration already did; OTP verify/resend/generate must keep doing so.
4. **Retail login** requires `user_type === user` → `status === active` **and** `email_verified === true`. Pending/unverified → `code: EMAIL_NOT_VERIFIED`, OTP resent, no tokens.
5. **Fuspay KYC approval does not** flip client-auth `email_verified` / `phone_verified` / `status`. Those only change via verification OTP (or explicit admin/DB ops).
6. **PRIMARY wallet** is created at signup regardless of email verify; **NUBAN** is provisioned after Fuspay KYC webhook (not gated on email OTP).
7. **origin/main** is the working branch for this repo; commit + push when checking in (never commit `login.md` or secrets).
8. Wallet ledger has **no** `isTest` flag — find test activity by known users / `e2e-*` refs / date range.
9. **LegerBlock static VA funding** requires merchant `notification_url` → `…/funding/callback/legerblock` plus `LEGERBLOCK_COLLECTION_NOTIFICATION_URL` on wallet-ms (boot syncs it). Money can sit on LegerBlock with app balance 0 if this is missing.

---

## Known IDs & hosts (non-secret)

| What | Value |
|------|--------|
| CRBC app | `69f330b2a795ac77103a6d77` (subdomain `crbc`) |
| CRBC storefront merchant | `merchant_1774844182734_rm0g5u27l` |
| CRBC host | `https://crbc.tryspring.io` |
| Plata merchant (John Dave / “David Merchant”) | `merchant_1773335565089_odwk5b0dg` · Sample Test App `69efccf9a6f701fa458935e0` |
| David Testimony (CRBC user) | `6a2fa2c55e076aafcf32316a` · `titusdavid39+d@gmail.com` |
| David E2E Investment (Plata product) | upstream `6ad8671f55dd556373819677` · local CRBC `6ad8682135b7e1b376450ce8` |
| David E2E investment application | local `6ad868d135b7e1b376450d31` · Plata `6ad868e840030f82b0904795` |
| Spring product-ms toggle (no JWT) | `PUT /api/v1/products/toggle/{appId}/{upstreamProductId}` |
| Fly client-auth | `client-auth-ms` |
| Fly account gateway | `account-ms.fly.dev` / storefront same-origin `/api` |

---

## Changelog

### 2026-10-21 — Login unverified-email banner links to OTP

- **Why:** Users saw a static “email not verified” banner with no clear path to finish OTP.
- **What:** Banner copy includes a **Here** control that resends the verification OTP and navigates to `/mobile-v2/auth/verify-otp?from=login`. Stopped auto-redirect so the link is usable.
- **Where:** `app/mobile-v2/auth/login/page.tsx`, `AuthService.ts` (message string)
- **Verify:** Login as unverified user → banner → click Here → OTP email + verify screen

### 2026-10-21 — Plata LegerBlock merchant notification URL

- **Why:** Same static-VA funding gap as Spring — plata `wallet-ms-plata` lacked `LEGERBLOCK_COLLECTION_NOTIFICATION_URL` / boot sync.
- **What:** Ported `syncLegerblockMerchantNotificationUrl`; registered merchant webhook → `https://wallet-ms-plata.fly.dev/api/v1/wallets/funding/callback/legerblock`; set Fly secrets.
- **Where:** `plata/wallet-ms` (`legerblockNubanClient.ts`, `index.ts`, `.env.example`); Fly `wallet-ms-plata`
- **Verify:** LegerBlock merchant `notificationurl` points at plata funding callback; new static deposits credit plata wallets

### 2026-10-21 — Uche NUBAN ₦1000 not reflecting (LegerBlock webhook)

- **Why:** ₦1000 hit LegerBlock static VA `6011907559` (SAFE HAVEN MFB) at ~11:12Z; app wallet stayed 0 because merchant collection `notification_url` was never set (`LEGERBLOCK_COLLECTION_NOTIFICATION_URL` missing on Fly).
- **What:** Registered merchant webhook → `https://wallet-ms.fly.dev/api/v1/wallets/funding/callback/legerblock`; set Fly secrets; replayed collection webhook (`ONUS-FNUB-7508288347889-21102026-121210`); credited PRIMARY wallet to ₦1000. Boot now calls `syncLegerblockMerchantNotificationUrl`.
- **Where:** `springApp/wallet-ms` (`legerblockNubanClient.ts`, `index.ts`, `.env.example`); Fly `wallet-ms` secrets
- **IDs:** user `6ad88fa633377d2b0ab8e02d` · wallet `6ad88fa78c0dcccfc2c8efd9` · LB wallet `LBWNGN57BF265CB8844143953D83E830AA978700848`
- **Verify:** app main balance ₦1000; LegerBlock available_balance 1000; future deposits should auto-credit via webhook

### 2026-10-21 — Retail login blocked until email OTP

- **Why:** Users with pending/unverified email could still log in; merchant UI showed pending while they used the app.
- **What:** `AuthService.login` for `USER` requires `ACTIVE` + `email_verified`; on failure resends verification OTP and returns `EMAIL_NOT_VERIFIED` / `requiresEmailVerification`. Mobile login redirects to `/mobile-v2/auth/verify-otp?email=…&from=login`.
- **Where:** `springApp/client-auth-ms/src/services/AuthService.ts`, `store/authSlice.ts`, `app/mobile-v2/auth/login/page.tsx`, `app/mobile-v2/auth/verify-otp/page.tsx`
- **Commit:** `278ecbaa` · **Deployed:** `client-auth-ms` (Fly)

### 2026-10-21 — OTP verify false “invalid/expired”

- **Why:** Signup stored OTP with `app_id`; Next `Auth.verifyEmailOtp` / resend / generate posted **without** tenant / `X-Forwarded-Host`, so verify searched the no-app bucket.
- **What:** BFF OTP handlers use `mergeStorefrontHeaders`; OTPController falls back to `resolveTenantFromRequest`.
- **Where:** `app/api/auth/[...path]/route.ts`, `springApp/client-auth-ms/src/controllers/otpController.ts`
- **Commit:** `3bbe99ac` · **Deployed:** `client-auth-ms`

### 2026-10-21 — INVESTMENT E2E (CRBC ↔ Plata John Dave)

- Created complete INVESTMENT **David E2E Investment** on Plata Sample Test App; turned on for CRBC; David Testimony provisioned + deposited ₦5,000 (`e2e-inv-david-20261021082550`); Plata application balance 5000 ACTIVE.
- John Dave previously had **zero** INVESTMENT products (mortgages only).

### 2026-10-21 — Account / verification investigations

- Pending users (e.g. `kcnjoku197@`, `talktoavischarles@`, `ahaiweuche@`): `status=pending`, `email_verified=false` because storefront email OTP not completed; KYC may still be approved independently.
- `titusdavid973@`: unlocked + activated after lock + OTP scope mismatch left account pending despite verified OTP row.
- Test tx pull (since 2026-10-19): only David Testimony had `e2e-*` activity; full JSON `.tmp_test_tx_report.json`.

### Earlier (same epic) — Plata wallet / LegerBlock

- Restored missing plata wallet-ms modules from transcripts/dist (no stubs).
- Wired LegerBlock virtual NUBAN provisioning; dual-run with PayOnUs; commits include `0f7871d3`, `64a750a5`.

---

## Open next (candidates)

- [ ] Finish mobile forgot-password: collect OTP + `POST /api/v1/password/reset` on `/mobile-v2/auth/new-password` (and tenant headers).
- [ ] Optionally sync Fuspay KYC email/phone success → client-auth `email_verified` / `phone_verified` (product decision; today they are separate).
- [ ] Confirm storefront (Vercel/userapp) deploy includes OTP BFF + login-gate FE commits.
- [ ] Continue LegerBlock cutover per `legerblock-payonus-replacement.md` as needed.
- [ ] Optionally add LegerBlock→wallet reconcile job for missed webhooks (poll collection-query).

---

## Template for new changelog entries

```markdown
### YYYY-MM-DD — Short title

- **Why:** …
- **What:** …
- **Where:** paths…
- **Commit:** `sha` · **Deployed:** service(s) or n/a
- **Verify:** how to re-test
```
