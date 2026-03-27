# PowerShell script to configure account-ms gateway environment variables on Fly.io
# This configures the API gateway to route to the correct microservice URLs

Write-Host "Configuring account-ms API Gateway URLs on Fly.io..." -ForegroundColor Green

# Set all microservice URLs as secrets (use -a account-ms-plata for Plata deployment)
fly secrets set `
  CREATE_APP_SERVICE_URL=https://create-app-ms-plata.fly.dev `
  BILLING_SERVICE_URL=https://billing-ms-plata.fly.dev `
  WALLET_SERVICE_URL=https://wallet-ms-plata.fly.dev `
  PRODUCT_SERVICE_URL=https://product-ms-plata.fly.dev `
  PAYMENT_SERVICE_URL=https://payment-ms-plata.fly.dev `
  COMPLIANCE_SERVICE_URL=https://compliance-ms.fly.dev `
  CLIENT_AUTH_SERVICE_URL=https://client-auth-ms-plata.fly.dev `
  SERVICE_AUTH_URL=https://service-auth-ms-plata.fly.dev `
  -a account-ms-plata

Write-Host ""
Write-Host "Gateway URLs configured successfully!" -ForegroundColor Green
Write-Host "The account-ms app will restart automatically." -ForegroundColor Yellow
Write-Host ""
Write-Host "Wait about 30 seconds, then test with:" -ForegroundColor Cyan
Write-Host "curl https://account-ms-plata.fly.dev/api/v1/registration/merchant" -ForegroundColor White
