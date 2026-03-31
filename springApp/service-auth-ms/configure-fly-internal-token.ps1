# Set INTERNAL_SERVICE_TOKEN on Fly so client-auth-ms bootstrap (X-Internal-Token) is accepted.
# Must match SERVICE_AUTH_INTERNAL_TOKEN on client-auth-ms (see client-auth-ms/configure-fly-env.ps1).

$ErrorActionPreference = 'Stop'
$app = if ($env:FLY_APP_NAME) { $env:FLY_APP_NAME } else { 'service-auth-ms' }
$token = if ($env:INTERNAL_SERVICE_TOKEN) { $env:INTERNAL_SERVICE_TOKEN } else { 'Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb43' }

Write-Host "Setting INTERNAL_SERVICE_TOKEN on $app (same as client-auth SERVICE_AUTH_INTERNAL_TOKEN)..." -ForegroundColor Green
fly secrets set INTERNAL_SERVICE_TOKEN=$token -a $app
Write-Host "Done." -ForegroundColor Green
