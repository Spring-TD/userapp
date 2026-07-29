$ErrorActionPreference = 'Stop'

$plataBase = 'https://account-ms-plata.fly.dev'
$springBase = 'https://account-ms.fly.dev'
$crbcHost = 'www.crbc.tryspring.io'

$plataMerchantEmail = 'titusdavid39+a@gmail.com'
$plataMerchantPassword = 'SecurePass123!'
$plataAppId = '6a474903434ecaeb53f9eaee'
$plataMerchantId = 'merchant_1773335565089_odwk5b0dg'

$springMerchantEmail = 'arikpostanley123+a@gmail.com'
$springMerchantPassword = 'SecurePass123!'
$crbcAppId = '69f330b2a795ac77103a6d77'
$crbcMerchantId = 'merchant_1774844182734_rm0g5u27l'

# Prefer titusdavid39+d@gmail.com: wallet + CRBC SETTLEMENT share merchant_1774844182734_rm0g5u27l.
# titusdavid39+crbc1@gmail.com has wallet under merchant_1774844182734_rm0g5u271 (typo) and apply fails.
$storefrontEmail = 'titusdavid39+d@gmail.com'
$storefrontPassword = 'SecurePass123!'
$storefrontUserId = '6a2fa2c55e076aafcf32316a'
$storefrontBase = 'https://crbc.tryspring.io'

function Invoke-Json {
  param(
    [string]$Method,
    [string]$Uri,
    [hashtable]$Headers = @{},
    $Body = $null
  )
  $params = @{
    Method = $Method
    Uri = $Uri
    Headers = $Headers
    ContentType = 'application/json'
  }
  if ($null -ne $Body) {
    $params.Body = ($Body | ConvertTo-Json -Depth 12)
  }
  return Invoke-RestMethod @params
}

Write-Host '=== E2E Commodity: Plata create -> CRBC toggle -> storefront apply ===' -ForegroundColor Cyan

Write-Host '[1] Plata merchant login...' -ForegroundColor Yellow
$plataLogin = Invoke-Json -Method Post -Uri "$plataBase/api/v1/auth/login" -Body @{
  email = $plataMerchantEmail
  password = $plataMerchantPassword
}
$plataToken = $plataLogin.accessToken
if (-not $plataToken) { throw 'Plata merchant login failed' }
Write-Host '    OK' -ForegroundColor Green

Write-Host '[2] Create COMMODITY product on CommodityTest app...' -ForegroundColor Yellow
$createBody = @{
  name = 'Commodity Test Product E2E'
  description = 'E2E commodity product for CRBC storefront apply test'
  type = 'COMMODITY'
  appId = $plataAppId
  isActive = $true
  status = 'complete'
  price = 23
  minimumQuantity = 1
  unitOfMeasure = 'unit'
  structure = @{
    yieldMethod = 'seasonally'
    offerYieldEnabled = $true
    offerYield = 5
    unitAmount = 23
    withdrawalFlexibility = 'yearly'
    minQuantityPurchase = 1
    maxAmount = 100000
    moratorium = @{ value = 6; unit = 'month' }
    commodityTermsAndCondition = 'Funds locked until moratorium ends'
  }
  about = @{
    duration = '6 months'
    commodityTypes = @(@{ name = 'Test Commodity'; description = 'E2E test commodity' })
  }
  feesAndCharges = @{
    fees = @(@{ name = 'Platform fee'; feeType = 'Percent'; value = '1%' })
  }
  commodityPrices = @(@{ price = 23; date = (Get-Date -Format 'yyyy-MM-dd'); source = 'e2e' })
}
$created = Invoke-Json -Method Post -Uri "$plataBase/api/v1/products" -Headers @{ Authorization = "Bearer $plataToken" } -Body $createBody
if (-not $created.success) { throw "Create product failed: $($created | ConvertTo-Json -Compress)" }
$upstreamProductId = $created.data.id
Write-Host "    Plata product id: $upstreamProductId" -ForegroundColor Green

# Ensure complete status
if ($created.data.status -ne 'complete') {
  $updated = Invoke-Json -Method Put -Uri "$plataBase/api/v1/products/$upstreamProductId" -Headers @{ Authorization = "Bearer $plataToken" } -Body @{ status = 'complete'; isActive = $true }
  if (-not $updated.success) { throw 'Failed to mark product complete' }
}

Write-Host '[3] Spring CRBC merchant login...' -ForegroundColor Yellow
try {
  $springLogin = Invoke-Json -Method Post -Uri "$springBase/api/v1/auth/login" -Body @{
    email = $springMerchantEmail
    password = $springMerchantPassword
  }
} catch {
  $springLogin = Invoke-Json -Method Post -Uri "$springBase/api/v1/auth/login" -Body @{
    email = 'titusdavid39+b@gmail.com'
    password = 'SecurePass123!'
  }
}
$springToken = $springLogin.accessToken
if (-not $springToken) { throw 'Spring merchant login failed' }
Write-Host '    OK' -ForegroundColor Green

Write-Host '[4] Turn on product on CRBC app...' -ForegroundColor Yellow
$toggle = Invoke-Json -Method Put -Uri "$springBase/api/v1/products/toggle/$crbcAppId/$upstreamProductId" -Headers @{ Authorization = "Bearer $springToken" } -Body @{ activate = $true }
if (-not $toggle.success) { throw "Toggle failed: $($toggle | ConvertTo-Json -Compress)" }
$localProductId = $toggle.data.id
Write-Host "    Local CRBC product id: $localProductId" -ForegroundColor Green

Write-Host '[5] Storefront user login (CRBC)...' -ForegroundColor Yellow
$storeLogin = Invoke-Json -Method Post -Uri "$storefrontBase/api/v1/auth/login" -Body @{
  email = $storefrontEmail
  password = $storefrontPassword
}
$storeToken = $storeLogin.accessToken
$resolvedUserId = $storeLogin.user.id
if (-not $storeToken) { throw 'Storefront login failed' }
Write-Host "    User id: $resolvedUserId" -ForegroundColor Green

Write-Host '[6] Wallet balance check...' -ForegroundColor Yellow
$wallet = Invoke-RestMethod -Uri "$storefrontBase/api/v1/wallets/user/$resolvedUserId" -Headers @{ Authorization = "Bearer $storeToken" }
$balanceBefore = [decimal]$wallet.data.wallet.mainBalance
Write-Host "    Balance before: $balanceBefore NGN" -ForegroundColor Green

$expectedBase = 23
$expectedCommission = [math]::Round($expectedBase * 0.01, 2)
$expectedTotal = [math]::Round($expectedBase + $expectedCommission, 2)

if ($balanceBefore -lt $expectedTotal) {
  $topUp = [math]::Ceiling(($expectedTotal - $balanceBefore + 100) * 100) / 100
  Write-Host "    Topping up wallet by $topUp NGN..." -ForegroundColor Yellow
  Invoke-Json -Method Put -Uri "$storefrontBase/api/v1/wallets/user/$resolvedUserId/balance" -Headers @{ Authorization = "Bearer $storeToken" } -Body @{
    amount = $topUp
    description = 'E2E commodity CRBC test top-up'
  } | Out-Null
  $wallet = Invoke-RestMethod -Uri "$storefrontBase/api/v1/wallets/user/$resolvedUserId" -Headers @{ Authorization = "Bearer $storeToken" }
  $balanceBefore = [decimal]$wallet.data.wallet.mainBalance
  Write-Host "    Balance after top-up: $balanceBefore NGN" -ForegroundColor Green
}

Write-Host '[7] Commodity account apply (enroll + fund)...' -ForegroundColor Yellow
$applyBody = @{
  userId = $resolvedUserId
  productId = $localProductId
  currency = 'NGN'
  quantity = 1
  email = $storefrontEmail
  applicantName = 'David Testimony'
  phone = '+2348166175258'
  appId = $crbcAppId
  merchantId = $crbcMerchantId
}
# commodity-accounts is proxied on account-ms, not crbc.tryspring.io PWA host
$apply = Invoke-Json -Method Post -Uri "$springBase/api/v1/commodity-accounts/apply" -Headers @{ Authorization = "Bearer $storeToken"; Host = $crbcHost } -Body $applyBody
if (-not $apply.success) { throw "Apply failed: $($apply | ConvertTo-Json -Compress)" }
$account = $apply.data.account
$applicationId = $apply.data.applicationId
Write-Host "    Application id: $applicationId" -ForegroundColor Green
Write-Host "    Principal: $($account.principal) | Total paid: $($account.purchase.totalAmount)" -ForegroundColor Green
Write-Host "    Holding status: $($account.holdingStatus) | Maturity: $($account.maturityAt)" -ForegroundColor Green

Write-Host '[8] Verify wallet debit...' -ForegroundColor Yellow
$walletAfter = Invoke-RestMethod -Uri "$springBase/api/v1/wallets/user/$resolvedUserId" -Headers @{ Authorization = "Bearer $storeToken"; Host = $crbcHost }
$balanceAfter = [decimal]$walletAfter.data.wallet.mainBalance
$debited = [math]::Round($balanceBefore - $balanceAfter, 2)
Write-Host "    Debited: $debited NGN (expected $expectedTotal)" -ForegroundColor $(if ($debited -eq $expectedTotal) { 'Green' } else { 'Yellow' })

Write-Host '[9] Fetch commodity account...' -ForegroundColor Yellow
$holding = Invoke-RestMethod -Uri "$springBase/api/v1/commodity-accounts/$applicationId`?userId=$resolvedUserId" -Headers @{ Authorization = "Bearer $storeToken"; Host = $crbcHost }
if (-not $holding.success) { throw 'Failed to fetch commodity account' }
Write-Host "    Status: $($holding.data.status) | Principal: $($holding.data.principal)" -ForegroundColor Green

Write-Host ''
Write-Host '=== E2E SUMMARY ===' -ForegroundColor Cyan
@{
  plataProductId = $upstreamProductId
  crbcLocalProductId = $localProductId
  applicationId = $applicationId
  userId = $resolvedUserId
  principal = $account.principal
  totalPaid = $account.purchase.totalAmount
  walletDebited = $debited
  holdingStatus = $account.holdingStatus
  maturityAt = $account.maturityAt
  creatorMerchantId = $plataMerchantId
} | ConvertTo-Json -Depth 4

if ($debited -ne $expectedTotal) {
  Write-Host 'WARN: debit amount differed from expected commission-inclusive total' -ForegroundColor Yellow
}

Write-Host '=== E2E PASSED ===' -ForegroundColor Green
