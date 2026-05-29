# PayOnUs: OAuth token + fixed virtual account (reads PAYONUS_* from wallet-ms/.env)
# Usage (from wallet-ms folder):


#.\scripts\payonus-fixed-account-curl.ps1 -Bvn "22222222591" -Email "tester-user-22591@wallet.local" -Reference "curl-test-user-22591"

param(
  [string]$Reference = "curl-test-user-$(Get-Date -Format 'yyyyMMddHHmmss')",
  [string]$Bvn = "22222222590",
  [string]$Email = "2test-user-001@wallet.local",
  [string]$CustomerName = "2nd Test User",
  [int]$MaxRetries = 5,
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
        $bodyPreview = if ($raw.Length -gt 500) { $raw.Substring(0, 500) + '...' } else { $raw }
        if ($code -notin @('200', '201', '422')) { Write-Host $bodyPreview }
      }
    }

    if ($code -in @('200', '201', '422')) {
      return @{ Code = $code; Body = $bodyPreview }
    }

    if ($code -in $retryable -and $attempt -lt $MaxRetries) {
      $wait = [Math]::Min(30, 2 * $attempt)
      Write-Host "   Transient error ($code). PayOnUs may be slow or down. Retrying in ${wait}s..."
      Start-Sleep -Seconds $wait
      continue
    }

    if ($code -eq '504') {
      throw @"
PayOnUs returned 504 Gateway Time-out on $Url.
This is usually temporary (PayOnUs/nginx overloaded or slow), not wrong credentials.
- Wait 1–2 minutes and run the script again.
- Check PayOnUs status / your network / VPN.
- If it persists, contact PayOnUs support.
"@
    }

    throw "Request failed: HTTP $code for $Url. Body: $bodyPreview"
  }
}

$baseUrl = Get-EnvValue 'PAYONUS_BASE_URL'
if (-not $baseUrl) { $baseUrl = 'https://core.payonus.com' }
$clientId = Get-EnvValue 'PAYONUS_CLIENT_ID'
$clientSecret = Get-EnvValue 'PAYONUS_CLIENT_SECRET'
$businessId = Get-EnvValue 'PAYONUS_VA_BUSINESS_ID'
$dob = Get-EnvValue 'PAYONUS_VA_DOB'
if (-not $dob) { $dob = '1990-01-01' }

if (-not $clientId -or -not $clientSecret) { throw 'Set PAYONUS_CLIENT_ID and PAYONUS_CLIENT_SECRET in .env' }
if (-not $businessId) { throw 'Set PAYONUS_VA_BUSINESS_ID in .env' }

if (-not $Bvn) {
  $Bvn = Read-Host 'Enter BVN'
}
$Bvn = $Bvn.Trim()
if ($Bvn -notmatch '^\d{11}$') {
  throw 'BVN must be exactly 11 digits'
}

$tmpdir = Join-Path $env:TEMP "payonus-curl-$PID"
New-Item -ItemType Directory -Force -Path $tmpdir | Out-Null
$tokenBody = Join-Path $tmpdir 'token.json'
$vaBody = Join-Path $tmpdir 'va.json'
$tokenResp = Join-Path $tmpdir 'token-response.json'
$vaResp = Join-Path $tmpdir 'va-response.json'

try {
  @{
    apiClientId = $clientId
    apiClientSecret = $clientSecret
  } | ConvertTo-Json | Set-Content $tokenBody -Encoding UTF8

  @{
    customer = @{
      name = $CustomerName
      phone = '08012345678'
      email = $Email
      bvn = $Bvn
      address = @{
        line1 = 'Address line 1'
        city = 'Lagos'
        state = 'Lagos'
        postalCode = '100001'
        countryCode = 'NG'
      }
    }
    reference = $Reference
    dob = $dob
    businessId = $businessId
  } | ConvertTo-Json -Depth 5 | Set-Content $vaBody -Encoding UTF8

  Write-Host "Base URL: $baseUrl"
  Write-Host ''

  $r1 = Invoke-CurlJson -Label '1) POST /api/v1/access-token' -Method 'POST' `
    -Url "$baseUrl/api/v1/access-token" -OutFile $tokenResp -BodyFile $tokenBody
  if ($r1.Code -ne '200') { throw 'Token request failed' }

  $tokenJson = Get-Content $tokenResp -Raw | ConvertFrom-Json
  $token = $tokenJson.data.access_token
  if (-not $token) { throw 'No access_token in token response' }

  $r2 = Invoke-CurlJson -Label '2) POST /api/v1/virtual-accounts/fixed-account' -Method 'POST' `
    -Url "$baseUrl/api/v1/virtual-accounts/fixed-account" -OutFile $vaResp -BodyFile $vaBody `
    -ExtraHeaders @{ Authorization = "Bearer $token" }

  $vaRaw = Get-Content $vaResp -Raw
  Write-Host $vaRaw

  if ($r2.Code -eq '422') {
    Write-Host ''
    Write-Host 'OK: PayOnUs says this customer already has a fixed VA (422). Use a new -Bvn / -Email / -Reference for another test account.'
    exit 0
  }

  if ($r2.Code -ne '200') { throw 'Fixed-account request failed' }

  Write-Host ''
  Write-Host 'Success: fixed virtual account created.'
}
finally {
  Remove-Item -Recurse -Force $tmpdir -ErrorAction SilentlyContinue
}
