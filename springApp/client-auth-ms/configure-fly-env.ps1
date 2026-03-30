# PowerShell: Fly secrets for client-auth-ms (merchant API key bootstrap -> service-auth-ms).
#
# Default SERVICE_AUTH_URL uses Fly private networking: http://<service-auth-app>.internal:<port>
# (NOT *.fly.internal — that hostname is invalid.) Override for Plata: $env:SERVICE_AUTH_URL='http://service-auth-ms-plata.internal:3000'
#
# If a Fly secret already set SERVICE_AUTH_URL to https://... and bootstrap times out, run:
#   fly secrets unset SERVICE_AUTH_URL -a client-auth-ms
# then redeploy so fly.toml [env] applies, or set the internal URL explicitly below.

$ErrorActionPreference = 'Stop'

$app = if ($env:FLY_APP_NAME) { $env:FLY_APP_NAME } else { 'client-auth-ms' }
$serviceAuthUrl = if ($env:SERVICE_AUTH_URL) { $env:SERVICE_AUTH_URL } else { 'http://service-auth-ms.internal:3000' }
$notificationsUrl = if ($env:NOTIFICATIONS_SERVICE_URL) { $env:NOTIFICATIONS_SERVICE_URL } else { 'https://notifications-ms.fly.dev' }
$internalToken = if ($env:SERVICE_AUTH_INTERNAL_TOKEN) { $env:SERVICE_AUTH_INTERNAL_TOKEN } else { 'Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb43' }

Write-Host "Setting Fly secrets for app '$app'..." -ForegroundColor Green
Write-Host "  SERVICE_AUTH_URL=$serviceAuthUrl"
Write-Host "  NOTIFICATIONS_SERVICE_URL=$notificationsUrl"
Write-Host "  SERVICE_AUTH_HTTP_TIMEOUT_MS=90000"
Write-Host "  SERVICE_AUTH_INTERNAL_TOKEN=(hidden; must match service-auth-ms INTERNAL_SERVICE_TOKEN)"

fly secrets set `
  SERVICE_AUTH_URL=$serviceAuthUrl `
  NOTIFICATIONS_SERVICE_URL=$notificationsUrl `
  SERVICE_AUTH_HTTP_TIMEOUT_MS=90000 `
  SERVICE_AUTH_INTERNAL_TOKEN=$internalToken `
  -a $app

Write-Host "Done. Ensure service-auth-ms has: fly secrets set INTERNAL_SERVICE_TOKEN=<same value> -a service-auth-ms" -ForegroundColor Yellow
Write-Host "Then redeploy client-auth-ms; test: POST https://account-ms.fly.dev/api/v1/registration/merchant" -ForegroundColor Cyan
