# PWA Publish Contract Status (Frontend ↔ Create App MS)

## Purpose

Single reference for **backend contract**, **what the Spring frontend implements today**, and **what is still open** (backend, frontend, or ops).

---

## Executive summary

| Area | Status |
|------|--------|
| Create App MS: template CRUD, uploads, runtime publish/status/artifacts | Implemented (per backend team) |
| Next.js API proxies for PWA runtime | **Done** — `app/api/apps/[id]/pwa/*` |
| App Builder: save template → runtime publish on “Publish” | **Done** when session has `pwaTemplateId` |
| Publish tab: status, warnings/errors, proxy links, last publish | **Done** |
| Legacy configuration publish path (no PWA template id) | **No** runtime `POST …/pwa/publish` — unchanged |
| App-level manifest file uploads (`/api/v1/apps/:id/manifests`) | **Not** integrated in App Builder UI |
| Hardening (preflight-only publish, blocker-based disable, backend URL display) | **Optional / partial** — see [Remaining work](#remaining-work-not-done-or-optional) |

---

## Frontend integration (implemented)

### Next.js proxies (same upstream base as other app routes)

All forward `Authorization` from the browser to Create App MS. Artifact routes stream the upstream body and preserve `Content-Type`, `Cache-Control`, and `ETag` when present.

| Next route | Upstream |
|------------|----------|
| `POST /api/apps/:appId/pwa/publish` | `POST /api/v1/apps/:appId/pwa/publish` |
| `GET /api/apps/:appId/pwa/status` | `GET /api/v1/apps/:appId/pwa/status` |
| `GET /api/apps/:appId/pwa/manifest.webmanifest` | `GET /api/v1/apps/:appId/pwa/manifest.webmanifest` (body streamed, headers preserved) |
| `GET /api/apps/:appId/pwa/sw.js` | `GET /api/v1/apps/:appId/pwa/sw.js` (same) |

Files: `app/api/apps/[id]/pwa/publish/route.ts`, `…/status/route.ts`, `…/manifest.webmanifest/route.ts`, `…/sw.js/route.ts`.

### Client API

- `lib/services/appService.ts`: `pwaPublishApi.publish()`, `pwaPublishApi.getStatus()`, types `PwaPublishPayload`, `PwaPublishStatusData`.
- Publish failures surface `422` `details[]` in thrown `Error` message (concatenated for toasts).

### App Builder context

- `contexts/AppBuilderContext.tsx`: `publishConfiguration()` — when `pwaTemplateId` is set:
  1. `PUT` full template `config` (unchanged).
  2. `POST …/pwa/publish` with `{ templateId, publishMode: "apply-and-publish" }` (replaces apply-only).
- Returns `{ success, versionId?, publish?, error? }` so the UI can show validation errors.

### Publish tab UI

- `components/app-builder/publish-tab.tsx`:
  - Loads `GET /pwa/status` on mount and when Refresh runs (with version history refresh).
  - After successful publish, refreshes PWA status; stores last `publish` payload for version / entry URL.
  - Shows readiness flags, warnings, errors, links to **same-origin** manifest + SW proxies (`/api/apps/.../pwa/...`).
  - If `pwaTemplateId` is missing: **banner** explaining runtime publish only runs for template-backed sessions.

### Upstream base URL

Proxies use `getApiUpstreamBase()` → `NEXT_PUBLIC_API_URL` (see `lib/server/apiUpstreamBase.ts`). **All** existing `/api/apps/...` routes to Create App MS share this. If PWA calls fail against the wrong host, set `NEXT_PUBLIC_API_URL` to the Create App MS base (see project README).

---

## Backend surface (reference)

### Template + options (unchanged)

- `GET|POST /api/v1/apps/:appId/pwa-templates`, `PUT|DELETE …/:templateId`, `PATCH …/apply`
- Asset uploads: logo, splash, onboarding screen image
- `GET /api/v1/pwa/color-options`, `GET /api/v1/pwa/font-options`
- App-level manifest **files** (separate from runtime generated manifest): `GET|POST /api/v1/apps/:id/manifests`, `PUT|DELETE …/:manifestIndex`

### Runtime publish (generated manifest + SW)

- `POST /api/v1/apps/:appId/pwa/publish`
- `GET /api/v1/apps/:appId/pwa/status`
- `GET /api/v1/apps/:appId/pwa/manifest.webmanifest`
- `GET /api/v1/apps/:appId/pwa/sw.js`

### Runtime behavior (Create App MS — documented)

- **`GET /pwa/status`** is safe **before** the first publish: returns readiness flags with **warnings** (for example including *No published PWA version yet*), not a hard error.
- **`GET …/pwa/manifest.webmanifest`** and **`GET …/pwa/sw.js`** return **`404`** with a **clear JSON error** when no published artifact exists yet.
- **Service worker** responses include `Content-Type: application/javascript`, **`ETag`**, and cache headers (`no-cache, must-revalidate` per backend) for predictable version checks.
- **Concurrent publishes** for the same `appId` are **last-write-wins**; publish **history** is retained in **`AppPwaPublish`** for audit and rollback workflows.

### Request / response contracts

See sections A–C below (keep in sync with Create App MS).

### A) `POST /api/v1/apps/:appId/pwa/publish`

Publishes from request `templateId` or from currently applied template.

```json
{
  "templateId": "optional-string",
  "publishMode": "apply-and-publish"
}
```

Success `data` payload shape (illustrative):

```json
{
  "publishId": "pwa_pub_123",
  "appId": "app_123",
  "templateId": "tpl_456",
  "version": "2026-04-07T10:33:12.121Z",
  "manifestUrl": "https://<host>/api/v1/apps/app_123/pwa/manifest.webmanifest",
  "serviceWorkerUrl": "https://<host>/api/v1/apps/app_123/pwa/sw.js",
  "pwaEntryUrl": "https://my-app.springtd.com/",
  "publishedAt": "2026-04-07T10:33:12.121Z"
}
```

### B) `GET /api/v1/apps/:appId/pwa/status`

```json
{
  "success": true,
  "data": {
    "isPublished": true,
    "appId": "app_123",
    "templateId": "tpl_456",
    "version": "2026-04-07T10:33:12.121Z",
    "manifestReady": true,
    "serviceWorkerReady": true,
    "iconsReady": true,
    "httpsReady": true,
    "customDomainReady": false,
    "warnings": [],
    "errors": []
  }
}
```

### C) Runtime artifacts

- `GET …/pwa/manifest.webmanifest` — generated Web App Manifest (not raw template JSON).
- `GET …/pwa/sw.js` — versioned service worker.

Minimum manifest keys: `name`, `short_name`, `start_url`, `scope`, `display`, `theme_color`, `background_color`, `icons` (include 192 and 512).

### Validation (`422`)

`{ "success": false, "error": "…", "details": ["…"] }` for publish validation failures.

---

## Mapping rules (template config → runtime manifest)

- `config.asset.siteDescription` → `manifest.description`
- `config.splash.primaryColor` / `secondaryColor` → `theme_color` / `background_color`
- `config.asset.logoUrl` (+ generated icons if any) → `manifest.icons[]`
- `app.name` → `manifest.name`; `app.alias` (or truncated) → `short_name`
- `config.dns.defaultAppUrl` or verified custom domain → `start_url`, `scope`, `pwaEntryUrl`

Missing fields: safe defaults + warnings on `pwa/status` where applicable.

---

## Data model (implemented on backend)

`AppPwaPublish` (separate from `AppPwaTemplate`): versioned publish state, `artifactUrls`, `manifest`, `serviceWorkerMeta`, `status`, `warnings`, `errors`, timestamps.

---

## Remaining work (not done or optional)

### Frontend

1. **Legacy publish path** — If `pwaTemplateId` is null, `publishConfiguration` still uses `appConfigurationApi.createConfiguration` + `updatePublishingStatus`. No call to `POST …/pwa/publish`. If product requires runtime PWA for those apps, either always load a PWA template in the builder or extend this branch to publish after template resolution.
2. **Dedicated `manifestUrl` / `serviceWorkerUrl` from API** — UI shows `pwaEntryUrl` from last publish and **proxy** links for manifest/SW. Optional: also show backend-returned URLs from `publish.data` as copyable text.
3. **Preflight-only UX** — Optional “Check readiness” that only calls `GET /pwa/status` (no publish).
4. **Disable Publish when status indicates blockers** — Today Publish is gated by `hasUnsavedChanges` + local `publishing`; optional: also use `pwa/status` `errors[]` to disable or warn.
5. **Double-submit** — Publish button uses local `publishing`; optional: also use context `isSaving` from `publishConfiguration` during the whole request.
6. **App-level manifest uploads** — Backend `GET|POST|PUT|DELETE …/apps/:id/manifests` is **not** wired in App Builder; add only if product needs user-uploaded manifest JSON alongside the generated runtime manifest.

### Backend / ops (staging verification)

Smoke-test against deployed Create App MS: `422` + `details[]`, ownership on publish/status/artifact routes, and that manifest/SW proxy behavior matches expectations (including `404` JSON before first publish). Operational: structured logging for `appId`, `templateId`, `publishId`, validation failures (service-side).

---

## Edge-case checklist (QA)

Use this for release sign-off.

| Check | Owner |
|-------|--------|
| Publish with template: `422` shows `details` in toast | Frontend |
| After success: status refresh + entry URL + proxy links work | Frontend |
| Wrong `NEXT_PUBLIC_API_URL` → clear failure | Ops / env |
| Backend `422`, ownership, pre-publish `404` on manifest/SW | Backend |

---

## Backend implementation notes (Create App MS repo)

Reference modules (names may vary slightly):

- `appPwaPublish` model, `pwaPublish` types, `appPwaPublishService`, `appPwaPublishController`
- `pwaManifestBuilder`, `pwaPublishValidation`, `pwaServiceWorkerBuilder`
- `getAppliedByAppId` on template model

---

## Document history

- **2026-04** — Frontend wiring: proxies (including `ETag` + cache on artifact routes), `pwaPublishApi`, context publish flow, Publish tab status + links. Spec aligned with Create App MS runtime behavior (status before publish, `404` manifest/SW, SW headers, `AppPwaPublish` history, last-write-wins).
