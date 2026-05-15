# Mobile V2 User App

## What happens when someone opens the app

1. **`GET /api/v1/apps/resolve/{subdomain}`** (via **`/api/apps/resolve-subdomain/...`**) — returns **`data.appId`**, **`data.merchantId`**, optional **`data.pwaManifest`** (name, colors, icons for splash/theme), and optional **`data.pwaInstall`** (SW/manifest URLs for install).

`MobileV2TenantProvider` uses resolve only. Splash/onboarding merge **`pwaManifest`** into the UI; `MobileV2ThemedChrome` uses the same fields for shell colors.

## Env

Use your project `.env` (e.g. **`NEXT_PUBLIC_API_URL`** for the gateway that serves resolve + manifest, plus your server secrets). Tenant **`id` / `merchantId`** are stored in **sessionStorage** keys defined in `lib/mobileTenant/storageKeys.ts` (not env vars).

## Run

```bash
npm install && npm run dev
```

Open `http://localhost:3000` or `/mobile-v2` depending on your `app/page.tsx` setup.
