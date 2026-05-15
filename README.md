# Mobile V2 User App

## What happens when someone opens the app

1. **`GET /api/v1/apps/resolve/{subdomain}`** (via **`/api/apps/resolve-subdomain/...`**) — returns **`data.id`** (app id), **`data.merchantId`**, optional **`data.pwaInstall`** (URLs only, not the manifest body).
2. **`GET /api/v1/apps/{id}/pwa/manifest.webmanifest`** (proxied as **`/api/apps/{id}/pwa/manifest.webmanifest`** or **`/api/apps/{id}/pwa/manifest`**) — Web App Manifest JSON. **404** usually means there is no **published** PWA for that app yet; the UI keeps defaults.

`MobileV2TenantProvider` runs (1) then (2). Splash/onboarding merge manifest fields into the UI; `MobileV2ThemedChrome` uses the same manifest for shell colors.

## Env

Use your project `.env` (e.g. **`NEXT_PUBLIC_API_URL`** for the gateway that serves resolve + manifest, plus your server secrets). Tenant **`id` / `merchantId`** are stored in **sessionStorage** keys defined in `lib/mobileTenant/storageKeys.ts` (not env vars).

## Run

```bash
npm install && npm run dev
```

Open `http://localhost:3000` or `/mobile-v2` depending on your `app/page.tsx` setup.
