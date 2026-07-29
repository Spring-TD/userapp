$ErrorActionPreference = 'Continue'
$login = Invoke-RestMethod -Method Post -Uri 'https://crbc.tryspring.io/api/v1/auth/login' -ContentType 'application/json' -Body (@{email='titusdavid39+d@gmail.com';password='SecurePass123!'} | ConvertTo-Json)
$t = $login.accessToken
$uid = $login.user.id
Write-Host "user=$uid"

$targets = @(
  @{ label = 'crbc wallet-get';   uri = "https://crbc.tryspring.io/api/v1/wallets/user/$uid" },
  @{ label = 'crbc banks';        uri = 'https://crbc.tryspring.io/api/v1/wallets/banks' },
  @{ label = 'account-ms banks';  uri = 'https://account-ms.fly.dev/api/v1/wallets/banks' },
  @{ label = 'account-ms ext-accounts'; uri = "https://account-ms.fly.dev/api/v1/wallets/user/$uid/external-bank-accounts" },
  @{ label = 'wallet-ms direct banks'; uri = 'https://wallet-ms.fly.dev/api/v1/wallets/banks' },
  @{ label = 'wallet-ms direct ext-accounts'; uri = "https://wallet-ms.fly.dev/api/v1/wallets/user/$uid/external-bank-accounts" }
)
foreach ($tg in $targets) {
  $h = @{ Authorization = "Bearer $t" }
  try {
    $r = Invoke-RestMethod -Uri $tg.uri -Headers $h
    Write-Host ("{0}: OK success={1} count={2}" -f $tg.label, $r.success, $r.count)
  } catch {
    $code = try { [int]$_.Exception.Response.StatusCode } catch { '?' }
    Write-Host ("{0}: FAIL {1} {2}" -f $tg.label, $code, $_.ErrorDetails.Message)
  }
}
