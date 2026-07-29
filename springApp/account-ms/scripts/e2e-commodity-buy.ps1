$ErrorActionPreference = 'Stop'
$base = 'https://account-ms.fly.dev'
$userId = '6a2fa2c55e076aafcf32316a'
$productId = '6a0c37609373bdcd2d9b55f0'
$expectedBase = 23
$expectedCommission = [math]::Round($expectedBase * 0.01, 2)
$expectedTotal = [math]::Round($expectedBase + $expectedCommission, 2)

Write-Host "=== E2E Commodity Buy ===" -ForegroundColor Cyan

$login = Invoke-RestMethod -Method Post -Uri "$base/api/v1/auth/login" `
  -Headers @{ Host = 'www.crbc.tryspring.io' } `
  -ContentType 'application/json' `
  -Body (@{ email = 'titusdavid39+d@gmail.com'; password = 'SecurePass123!' } | ConvertTo-Json)
if (-not $login.success -and -not $login.accessToken) {
  if ($login.accessToken) { } else { throw "Login failed: $($login | ConvertTo-Json -Compress)" }
}
$token = $login.accessToken
Write-Host "[1] Login OK" -ForegroundColor Green

$walletBefore = Invoke-RestMethod -Uri "$base/api/v1/wallets/user/$userId" `
  -Headers @{ Authorization = "Bearer $token" }
$balanceBefore = [decimal]$walletBefore.data.wallet.balance
Write-Host "[2] Wallet balance before: $balanceBefore NGN"

if ($balanceBefore -lt $expectedTotal) {
  $topUp = [math]::Ceiling(($expectedTotal - $balanceBefore + 100) * 100) / 100
  Write-Host "[2b] Topping up wallet by $topUp NGN for test"
  Invoke-RestMethod -Method Put -Uri "$base/api/v1/wallets/user/$userId/balance" `
    -Headers @{ Authorization = "Bearer $token" } `
    -ContentType 'application/json' `
    -Body (@{ amount = $topUp; description = 'E2E commodity buy test top-up' } | ConvertTo-Json) | Out-Null
  $walletBefore = Invoke-RestMethod -Uri "$base/api/v1/wallets/user/$userId" `
    -Headers @{ Authorization = "Bearer $token" }
  $balanceBefore = [decimal]$walletBefore.data.wallet.balance
  Write-Host "[2c] Wallet balance after top-up: $balanceBefore NGN"
}

$integrator = Invoke-RestMethod -Uri 'https://account-ms-plata.fly.dev/api/v1/gateway/integrator-context' `
  -Headers @{
    PLATA_PUBLIC_KEY = 'pk_live_ZTlPZv10zv461JV7szYCPv2t'
    PLATA_SECRET_KEY = 'sk_live_GQHkmywZzjD7E0nrtOby8Hvb6MeSU7VOIWsCtduWRkIZmQZO'
  }
if (-not $integrator.success) { throw "Integrator context failed: $($integrator.error)" }
Write-Host "[3] Integrator merchant: $($integrator.data.merchantId)" -ForegroundColor Green

$buyBody = @{
  userId = $userId
  productId = $productId
  currency = 'NGN'
  email = 'titusdavid39+d@gmail.com'
} | ConvertTo-Json

try {
  $buy = Invoke-RestMethod -Method Post -Uri "$base/api/v1/commodities/buy" `
    -ContentType 'application/json' -Body $buyBody
} catch {
  $resp = $_.ErrorDetails.Message
  throw "Commodity buy failed: $resp"
}

if (-not $buy.success) { throw "Buy response not successful: $($buy | ConvertTo-Json -Depth 6)" }
Write-Host "[4] Commodity buy OK" -ForegroundColor Green
Write-Host ($buy | ConvertTo-Json -Depth 6)

$purchase = $buy.data.purchase
if ([decimal]$purchase.basePrice -ne $expectedBase) {
  throw "Expected basePrice $expectedBase got $($purchase.basePrice)"
}
if ([decimal]$purchase.totalAmount -ne $expectedTotal) {
  throw "Expected totalAmount $expectedTotal got $($purchase.totalAmount)"
}
if ($purchase.creatorMerchantId -ne 'merchant_1779177470485_8h72h70d3') {
  throw "Unexpected creatorMerchantId: $($purchase.creatorMerchantId)"
}

$walletAfter = Invoke-RestMethod -Uri "$base/api/v1/wallets/user/$userId" `
  -Headers @{ Authorization = "Bearer $token" }
$balanceAfter = [decimal]$walletAfter.data.wallet.balance
$debited = [math]::Round($balanceBefore - $balanceAfter, 2)
Write-Host "[5] Wallet debited: $debited NGN (expected $expectedTotal)" -ForegroundColor $(if ($debited -eq $expectedTotal) { 'Green' } else { 'Red' })
if ($debited -ne $expectedTotal) { throw "Debit mismatch" }

Write-Host "=== E2E PASSED ===" -ForegroundColor Green
