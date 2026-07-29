$ErrorActionPreference = 'Stop'

# E2E: saved external bank accounts + PRIMARY wallet payout
# Runs through the live account-ms gateway (CRBC tenant host) against
# live PayOnUs (bank list, name enquiry, payout) and live compliance-ms (KYC ownership).

# account-ms gateway (tenant host crbc.tryspring.io only proxies a subset of wallet paths;
# login still goes through the tenant host to get a storefront user token)
$base = 'https://account-ms.fly.dev'
$loginBase = 'https://crbc.tryspring.io'
$email = 'titusdavid39+d@gmail.com'
$password = 'SecurePass123!'
$testAccountNumber = '7975523287'   # Globus Bank account from prior loan applications
$testBankNameInput = 'Globus Bank'
$pin = '2468'   # set for this user by the first run of this script
$payoutAmount = 500   # PayOnUs enforces a NGN 500 minimum per payout

function Invoke-Json {
  param([string]$Method, [string]$Uri, [hashtable]$Headers = @{}, $Body = $null)
  $params = @{ Method = $Method; Uri = $Uri; Headers = $Headers; ContentType = 'application/json' }
  if ($null -ne $Body) { $params.Body = ($Body | ConvertTo-Json -Depth 10) }
  return Invoke-RestMethod @params
}

function Invoke-JsonExpectFail {
  # Returns @{ status = <int>; body = <obj> } for an expected non-2xx response
  param([string]$Method, [string]$Uri, [hashtable]$Headers = @{}, $Body = $null)
  try {
    $resp = Invoke-Json -Method $Method -Uri $Uri -Headers $Headers -Body $Body
    return @{ status = 200; body = $resp }
  } catch {
    $status = [int]$_.Exception.Response.StatusCode
    $raw = $_.ErrorDetails.Message
    $parsed = $null
    if ($raw) { try { $parsed = $raw | ConvertFrom-Json } catch { $parsed = $raw } }
    return @{ status = $status; body = $parsed }
  }
}

$results = @()
function Record { param([string]$Name, [bool]$Pass, [string]$Detail)
  $script:results += [pscustomobject]@{ test = $Name; pass = $Pass; detail = $Detail }
  $color = if ($Pass) { 'Green' } else { 'Red' }
  Write-Host ("    [{0}] {1} - {2}" -f ($(if ($Pass) { 'PASS' } else { 'FAIL' })), $Name, $Detail) -ForegroundColor $color
}

Write-Host '=== E2E: external bank accounts + payout (live gateway/PayOnUs/compliance) ===' -ForegroundColor Cyan

Write-Host '[1] Storefront login...' -ForegroundColor Yellow
$login = Invoke-Json -Method Post -Uri "$loginBase/api/v1/auth/login" -Body @{ email = $email; password = $password }
$token = $login.accessToken
$userId = $login.user.id
if (-not $token) { throw 'Login failed' }
$auth = @{ Authorization = "Bearer $token" }
Write-Host "    User: $userId" -ForegroundColor Green

Write-Host '[2] PRIMARY wallet...' -ForegroundColor Yellow
$wallet = Invoke-Json -Method Get -Uri "$base/api/v1/wallets/user/$userId" -Headers $auth
$balance = [decimal]$wallet.data.wallet.mainBalance
Write-Host "    Balance: $balance NGN | NUBAN: $($wallet.data.wallet.virtualNuban.accountNumber)" -ForegroundColor Green

Write-Host '[3] Bank list via gateway (live PayOnUs)...' -ForegroundColor Yellow
$banks = Invoke-Json -Method Get -Uri "$base/api/v1/wallets/banks" -Headers $auth
Record 'bank-list' ($banks.success -and $banks.count -gt 0) "count=$($banks.count) cached=$($banks.cached)"
$globus = $banks.data | Where-Object { $_.name -match 'Globus' } | Select-Object -First 1
if (-not $globus) { throw 'Globus Bank not found in live bank list' }
Write-Host "    Globus: code=$($globus.code) name=$($globus.name)" -ForegroundColor Green

Write-Host '[4] Name enquiry (live PayOnUs)...' -ForegroundColor Yellow
$enquiry = Invoke-Json -Method Post -Uri "$base/api/v1/wallets/banks/name-enquiry" -Headers $auth -Body @{
  accountNumber = $testAccountNumber
  bankCode = $globus.code
  currency = 'NGN'
}
$resolvedName = $enquiry.data.accountName
Record 'name-enquiry' ($enquiry.success -and $resolvedName) "accountName=$resolvedName"

Write-Host '[5] List saved accounts (before)...' -ForegroundColor Yellow
$listBefore = Invoke-Json -Method Get -Uri "$base/api/v1/wallets/user/$userId/external-bank-accounts" -Headers $auth
$existing = @($listBefore.data.accounts) | Where-Object { $_.accountNumber -eq $testAccountNumber }
Write-Host "    Saved accounts: $(@($listBefore.data.accounts).Count)" -ForegroundColor Green

Write-Host '[6] NEGATIVE: add with mismatched accountName...' -ForegroundColor Yellow
$badAdd = Invoke-JsonExpectFail -Method Post -Uri "$base/api/v1/wallets/user/$userId/external-bank-accounts" -Headers $auth -Body @{
  bankName = $testBankNameInput
  accountNumber = $testAccountNumber
  accountName = 'Totally Different Person'
  currency = 'NGN'
}
Record 'reject-wrong-account-name' ($badAdd.status -ge 400 -and $badAdd.status -lt 500) "status=$($badAdd.status) error=$($badAdd.body.error)"

Write-Host '[7] NEGATIVE: add with unknown bank name...' -ForegroundColor Yellow
$badBank = Invoke-JsonExpectFail -Method Post -Uri "$base/api/v1/wallets/user/$userId/external-bank-accounts" -Headers $auth -Body @{
  bankName = 'Bank Of Nowhere'
  accountNumber = $testAccountNumber
  currency = 'NGN'
}
Record 'reject-unknown-bank' ($badBank.status -ge 400 -and $badBank.status -lt 500) "status=$($badBank.status) error=$($badBank.body.error)"

Write-Host '[8] Add saved account (bankName only, live KYC ownership check)...' -ForegroundColor Yellow
if ($existing) {
  $savedAccountId = $existing[0].id
  Record 'add-account' $true "already saved (id=$savedAccountId, name=$($existing[0].accountName))"
} else {
  $add = Invoke-JsonExpectFail -Method Post -Uri "$base/api/v1/wallets/user/$userId/external-bank-accounts" -Headers $auth -Body @{
    bankName = $testBankNameInput
    accountNumber = $testAccountNumber
    accountName = $resolvedName
    currency = 'NGN'
  }
  if ($add.status -eq 200 -or $add.status -eq 201) {
    $savedAccountId = $add.body.data.account.id
    Record 'add-account' $true "id=$savedAccountId savedName=$($add.body.data.account.accountName) bankCode=$($add.body.data.account.bankCode)"
  } else {
    Record 'add-account' $false "status=$($add.status) error=$($add.body.error)"
  }
}

Write-Host '[9] List saved accounts (after)...' -ForegroundColor Yellow
$listAfter = Invoke-Json -Method Get -Uri "$base/api/v1/wallets/user/$userId/external-bank-accounts" -Headers $auth
$saved = @($listAfter.data.accounts) | Where-Object { $_.accountNumber -eq $testAccountNumber } | Select-Object -First 1
Record 'list-contains-saved' ($null -ne $saved) "count=$(@($listAfter.data.accounts).Count) default=$($saved.isDefault)"
if (-not $savedAccountId -and $saved) { $savedAccountId = $saved.id }

Write-Host '[10] Transaction PIN status...' -ForegroundColor Yellow
$pinStatus = Invoke-Json -Method Get -Uri "$base/api/v1/wallets/user/$userId/transaction-pin/status" -Headers $auth
if (-not $pinStatus.data.hasTransactionPin) {
  Write-Host '    Setting PIN...' -ForegroundColor Yellow
  Invoke-Json -Method Post -Uri "$base/api/v1/wallets/user/$userId/transaction-pin" -Headers $auth -Body @{ pin = $pin } | Out-Null
}
Write-Host "    hasTransactionPin: true | locked: $($pinStatus.data.locked)" -ForegroundColor Green

Write-Host '[11] NEGATIVE: payout to unsaved/bogus savedBankAccountId...' -ForegroundColor Yellow
$badPayout = Invoke-JsonExpectFail -Method Post -Uri "$base/api/v1/wallets/user/$userId/payout" -Headers $auth -Body @{
  savedBankAccountId = '000000000000000000000000'
  amount = 100
  currency = 'NGN'
  pin = $pin
  narration = 'E2E negative payout'
}
Record 'reject-unsaved-payout-destination' ($badPayout.status -ge 400 -and $badPayout.status -lt 500) "status=$($badPayout.status) error=$($badPayout.body.error)"

Write-Host '[12] NEGATIVE: payout with raw bank details (no savedBankAccountId)...' -ForegroundColor Yellow
$rawPayout = Invoke-JsonExpectFail -Method Post -Uri "$base/api/v1/wallets/user/$userId/payout" -Headers $auth -Body @{
  accountNumber = $testAccountNumber
  bankCode = $globus.code
  accountName = $resolvedName
  amount = 100
  currency = 'NGN'
  pin = $pin
}
Record 'reject-raw-bank-details' ($rawPayout.status -eq 400) "status=$($rawPayout.status) error=$($rawPayout.body.error)"

Write-Host "[13] Payout NGN $payoutAmount to saved account (live PayOnUs)..." -ForegroundColor Yellow
if (-not $savedAccountId) {
  Record 'payout' $false 'no saved account id available'
} else {
  $wallet = Invoke-Json -Method Get -Uri "$base/api/v1/wallets/user/$userId" -Headers $auth
  $balBefore = [decimal]$wallet.data.wallet.mainBalance
  if ($balBefore -lt ($payoutAmount + 100)) {
    Write-Host '    Topping up 500 NGN (ledger via tenant host)...' -ForegroundColor Yellow
    Invoke-Json -Method Put -Uri "$base/api/v1/wallets/user/$userId/balance" -Headers $auth -Body @{ amount = 500; description = 'E2E payout test top-up' } | Out-Null
    $wallet = Invoke-Json -Method Get -Uri "$base/api/v1/wallets/user/$userId" -Headers $auth
    $balBefore = [decimal]$wallet.data.wallet.mainBalance
  }
  $payout = Invoke-JsonExpectFail -Method Post -Uri "$base/api/v1/wallets/user/$userId/payout" -Headers $auth -Body @{
    savedBankAccountId = $savedAccountId
    amount = $payoutAmount
    currency = 'NGN'
    pin = $pin
    narration = 'E2E saved-account payout test'
  }
  if ($payout.status -eq 200) {
    $walletAfter = Invoke-Json -Method Get -Uri "$base/api/v1/wallets/user/$userId" -Headers $auth
    $balAfter = [decimal]$walletAfter.data.wallet.mainBalance
    Record 'payout' $true "ref=$($payout.body.data.payoutReference) providerStatus=$($payout.body.data.providerStatus) balance $balBefore -> $balAfter"
  } else {
    Record 'payout' $false "status=$($payout.status) error=$($payout.body.error) code=$($payout.body.code)"
  }
}

Write-Host ''
Write-Host '=== RESULTS ===' -ForegroundColor Cyan
$results | Format-Table -AutoSize | Out-String | Write-Host
$failed = @($results | Where-Object { -not $_.pass })
if ($failed.Count -gt 0) {
  Write-Host "E2E FAILED: $($failed.Count) test(s)" -ForegroundColor Red
  exit 1
}
Write-Host 'E2E PASSED' -ForegroundColor Green
