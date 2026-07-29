$ErrorActionPreference = 'Continue'
$login = Invoke-RestMethod -Method Post -Uri 'https://crbc.tryspring.io/api/v1/auth/login' -ContentType 'application/json' -Body (@{email='titusdavid39+d@gmail.com';password='SecurePass123!'} | ConvertTo-Json)
$t = $login.accessToken
$uid = $login.user.id
$h = @{ Authorization = "Bearer $t" }
$body = @{ amount = 1; description = 'probe top-up' } | ConvertTo-Json
$targets = @(
  "https://crbc.tryspring.io/api/v1/wallets/user/$uid/balance",
  "https://www.crbc.tryspring.io/api/v1/wallets/user/$uid/balance",
  "https://account-ms.fly.dev/api/v1/wallets/user/$uid/balance",
  "https://wallet-ms.fly.dev/api/v1/wallets/user/$uid/balance"
)
foreach ($uri in $targets) {
  try {
    $r = Invoke-RestMethod -Method Put -Uri $uri -Headers $h -ContentType 'application/json' -Body $body
    Write-Host "OK $uri -> $($r.success)"
  } catch {
    $code = try { [int]$_.Exception.Response.StatusCode } catch { '?' }
    Write-Host "FAIL $uri -> $code $($_.ErrorDetails.Message)"
  }
}
