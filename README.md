# Mobile V2 User App

This repository is now focused on the **Mobile V2 user experience** (`/mobile-v2`) and its authentication + profile flows.

## Main App Route

- Start route: `/mobile-v2`
- Local entry URL: `http://localhost:3000/mobile-v2`

## Current Scope

- Mobile onboarding and splash
- Mobile V2 auth:
  - signup
  - login
  - OTP verification
  - forgot/reset password UI flow
- Mobile V2 home, accounts, transactions, products, and profile screens
- Redux-based state management for auth/mobile auth
- Next.js API proxy routes under `app/api` for backend gateway communication

## Tech Stack

- Next.js 15 (App Router)
- React 19
- TypeScript
- Tailwind CSS
- Redux Toolkit

## Project Structure (Mobile V2 Relevant)

- `app/mobile-v2` - Mobile V2 pages and route segments
- `store` - Redux slices and store setup
- `app/api` - Next.js route handlers/proxy endpoints
- `lib` - API helpers, validation, shared utilities
- `components` - shared UI building blocks

## Environment Variables

Set these in `.env`:

- `NEXT_PUBLIC_API_URL` - client auth gateway base URL
- `NEXT_PUBLIC_USER_MERCHANT_ID` - merchant id used as hidden signup field for mobile-v2 user registration

Example:

```env
NEXT_PUBLIC_API_URL=https://client-auth-ms.fly.dev/
NEXT_PUBLIC_USER_MERCHANT_ID=<merchant-id>
```

## Run Locally

```bash
npm install
npm run dev
```

Then open:

- `http://localhost:3000/mobile-v2`

## Notes

- Mobile signup submits backend-compatible fields:
  - `user_merchant_id`
  - `first_name`
  - `last_name`
  - `email`
  - `phone`
  - `country`
  - `password`
- OTP and password endpoints are proxied through `app/api` routes for consistent error handling and browser-safe requests.
