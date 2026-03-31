# Plata: Fly secrets for client-auth-ms-plata. Prefer private URL to service-auth (same org).
$ErrorActionPreference = 'Stop'
$app = if ($env:FLY_APP_NAME) { $env:FLY_APP_NAME } else { 'client-auth-ms-plata' }
$serviceAuthUrl = if ($env:SERVICE_AUTH_URL) { $env:SERVICE_AUTH_URL } else { 'http://service-auth-ms-plata.internal:3000' }

fly secrets set `
  SERVICE_AUTH_URL=$serviceAuthUrl `
  NOTIFICATIONS_SERVICE_URL=https://notifications-ms-plata.fly.dev `
  SERVICE_AUTH_HTTP_TIMEOUT_MS=90000 `
  -a $app

Write-Host "Done for $app (set SERVICE_AUTH_INTERNAL_TOKEN separately to match service-auth INTERNAL_SERVICE_TOKEN)" -ForegroundColor Green
