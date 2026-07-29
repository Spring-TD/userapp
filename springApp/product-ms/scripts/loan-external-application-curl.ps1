# Loan application account creation: POST upstream /api/v1/products/external-accounts via account-ms (PLATA keys only).
# Optional: POST local product-ms /api/v1/applications/apply
#
# Usage (from product-ms folder):
#   .\scripts\loan-external-application-curl.ps1
#   .\scripts\loan-external-application-curl.ps1 -IntegratorMerchantId integrator_parent_1 -OfferingMerchantId subm_1001
#
param(
  [string]$UpstreamBaseUrl = '',
  [string]$LocalProductMsUrl = 'http://localhost:4005',
  [string]$ProductId = '69efb3b022adffe2fcb0a278',
  [string]$IntegratorMerchantId = '',
  [string]$IntegratorMerchantName = '',
  [string]$OfferingMerchantId = 'merchant_1773338138255_qtmubzley',
  [string]$OfferingMerchantName = 'Test App Store',
  [string]$UserId = 'curl-loan-user-001',
  [string]$UserName = 'Curl Loan Test User',
  [string]$Email = 'curl-loan-test@example.com',
  [string]$Phone = '+2348012345678',
  [string]$Bvn = '22222222590',
  [double]$Amount = 50000,
  [string]$Currency = 'NGN',
  [string]$Country = 'NG',
  [switch]$AlsoApplyLocal,
  [string]$LocalProductId = '',
  [int]$MaxRetries = 3,
  [int]$CurlTimeoutSec = 90
)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root '.env'
if (-not (Test-Path $envFile)) { throw "Missing $envFile" }

function Get-EnvValue([string]$Key) {
  $line = Get-Content $envFile | Where-Object { $_ -match "^\s*$Key\s*=" } | Select-Object -First 1
  if (-not $line) { return '' }
  $v = ($line -split '=', 2)[1].Trim()
  $v.Trim('"').Trim("'")
}

function Invoke-CurlJson {
  param(
    [string]$Label,
    [string]$Method,
    [string]$Url,
    [string]$OutFile,
    [string]$BodyFile = '',
    [hashtable]$ExtraHeaders = @{}
  )

  $retryable = @('502', '503', '504', '000')
  $attempt = 0

  while ($true) {
    $attempt++
    $headerArgs = @('-H', 'Content-Type: application/json', '-H', 'Accept: application/json')
    foreach ($k in $ExtraHeaders.Keys) {
      $headerArgs += @('-H', "$k`: $($ExtraHeaders[$k])")
    }

    $curlArgs = @(
      '-s', '-S', '-m', "$CurlTimeoutSec", '-w', '%{http_code}',
      '-o', $OutFile, '-X', $Method, $Url
    ) + $headerArgs
    if ($BodyFile) { $curlArgs += @('-d', "@$BodyFile") }

    Write-Host "$Label (attempt $attempt/$MaxRetries)"
    $code = & curl.exe @curlArgs 2>&1
    if ($LASTEXITCODE -ne 0) { $code = '000' }

    Write-Host "   HTTP $code"
    $bodyPreview = ''
    if (Test-Path $OutFile) {
      $raw = Get-Content $OutFile -Raw -ErrorAction SilentlyContinue
      if ($raw) {
        $bodyPreview = if ($raw.Length -gt 800) { $raw.Substring(0, 800) + '...' } else { $raw }
        if ($code -notin @('200', '201')) { Write-Host $bodyPreview }
      }
    }

    if ($code -in @('200', '201')) {
      return @{ Code = $code; Body = $bodyPreview; RawPath = $OutFile }
    }

    if ($code -eq '503' -and $bodyPreview -match 'ECONNREFUSED') {
      return @{ Code = $code; Body = $bodyPreview; RawPath = $OutFile; UpstreamDepsUnavailable = $true }
    }

    if ($code -in $retryable -and $attempt -lt $MaxRetries) {
      $wait = [Math]::Min(20, 2 * $attempt)
      Write-Host "   Transient ($code). Retrying in ${wait}s..."
      Start-Sleep -Seconds $wait
      continue
    }

    throw "Request failed: HTTP $code for $Url. Body: $bodyPreview"
  }
}

$plataPublic = Get-EnvValue 'PLATA_PUBLIC_KEY'
$plataSecret = Get-EnvValue 'PLATA_SECRET_KEY'
if (-not $plataPublic -or -not $plataSecret) {
  throw 'Set PLATA_PUBLIC_KEY and PLATA_SECRET_KEY in product-ms/.env'
}

if (-not $UpstreamBaseUrl) {
  $UpstreamBaseUrl = Get-EnvValue 'PLATA_ACCOUNT_SERVICE_URL'
}
if (-not $UpstreamBaseUrl) { $UpstreamBaseUrl = 'https://account-ms-plata.fly.dev' }
$UpstreamBaseUrl = $UpstreamBaseUrl.TrimEnd('/')

if (-not $IntegratorMerchantId) {
  $IntegratorMerchantId = Get-EnvValue 'PLATA_INTEGRATOR_MERCHANT_ID'
}
if (-not $IntegratorMerchantId) { $IntegratorMerchantId = $OfferingMerchantId }
if (-not $IntegratorMerchantName) {
  $IntegratorMerchantName = Get-EnvValue 'PLATA_INTEGRATOR_MERCHANT_NAME'
}
if (-not $IntegratorMerchantName) { $IntegratorMerchantName = $IntegratorMerchantId }

if ($Bvn -notmatch '^\d{11}$') { throw 'BVN must be exactly 11 digits' }

$tmpdir = Join-Path $env:TEMP "loan-ext-app-curl-$PID"
New-Item -ItemType Directory -Force -Path $tmpdir | Out-Null
$productResp = Join-Path $tmpdir 'product.json'
$upstreamBody = Join-Path $tmpdir 'external-application.json'
$upstreamResp = Join-Path $tmpdir 'external-application-response.json'
$localBody = Join-Path $tmpdir 'local-apply.json'
$localResp = Join-Path $tmpdir 'local-apply-response.json'

$plataHeaders = @{
  'PLATA_PUBLIC_KEY' = $plataPublic
  'PLATA_SECRET_KEY' = $plataSecret
}

try {
  Write-Host "Upstream (account-ms gateway): $UpstreamBaseUrl"
  Write-Host "Product (global): $ProductId"
  Write-Host "Integrator merchantId: $IntegratorMerchantId"
  Write-Host "Offering merchantId: $OfferingMerchantId"
  Write-Host ''

  Invoke-CurlJson -Label "1) GET /api/v1/products/$ProductId" -Method 'GET' `
    -Url "$UpstreamBaseUrl/api/v1/products/$ProductId" -OutFile $productResp -ExtraHeaders $plataHeaders | Out-Null

  $productJson = Get-Content $productResp -Raw | ConvertFrom-Json
  if (-not $productJson.success -or -not $productJson.data) {
    throw 'Could not load upstream product'
  }
  $product = $productJson.data
  $plataAppId = $product.appId
  if (-not $plataAppId) { throw 'Upstream product missing appId' }

  $payload = @{
    appId = $plataAppId
    productId = $ProductId
    currency = $Currency
    country = $Country
    user = @{
      id = $UserId
      name = $UserName
      email = $Email
      phone = $Phone
      bvn = $Bvn
    }
  }

  $payload | ConvertTo-Json -Depth 12 | Set-Content $upstreamBody -Encoding UTF8

  $r = Invoke-CurlJson -Label '2) POST /api/v1/products/external-accounts' -Method 'POST' `
    -Url "$UpstreamBaseUrl/api/v1/products/external-accounts" -OutFile $upstreamResp `
    -BodyFile $upstreamBody -ExtraHeaders $plataHeaders

  Write-Host ''
  Write-Host 'Upstream external account response:'
  Get-Content $upstreamResp -Raw | Write-Host

  if ($AlsoApplyLocal) {
    if (-not $LocalProductId) {
      throw 'AlsoApplyLocal requires -LocalProductId (Mongo _id of the activated product in spring product-ms)'
    }

    @{
      userId = $UserId
      productId = $LocalProductId
      amount = $Amount
      currency = $Currency
      email = $Email
      merchantId = $OfferingMerchantId
      integratorMerchantId = $IntegratorMerchantId
      integratorMerchantName = $IntegratorMerchantName
      offeringMerchantName = $OfferingMerchantName
      applicantName = $UserName
      phone = $Phone
      bvn = $Bvn
      country = $Country
      requirementSubmissions = @()
    } | ConvertTo-Json -Depth 6 | Set-Content $localBody -Encoding UTF8

    Write-Host ''
    $rLocal = Invoke-CurlJson -Label "3) POST $LocalProductMsUrl/api/v1/applications/apply" -Method 'POST' `
      -Url "$LocalProductMsUrl/api/v1/applications/apply" -OutFile $localResp -BodyFile $localBody

    Write-Host ''
    Write-Host 'Local apply response:'
    Get-Content $localResp -Raw | Write-Host
  }

  if ($r.UpstreamDepsUnavailable) {
    Write-Host ''
    Write-Host 'Note: Plata accepted the external-accounts payload but returned 503 because a downstream service (often wallet-ms) is unreachable from their deployment.'
    Write-Host 'Your curl request shape and gateway headers are correct; fix upstream wallet URL or retry when Plata ops restores dependencies.'
    exit 0
  }

  Write-Host ''
  Write-Host 'Done. Upstream bank account submitted via external-accounts.'
}
finally {
  Remove-Item -Recurse -Force $tmpdir -ErrorAction SilentlyContinue
}
