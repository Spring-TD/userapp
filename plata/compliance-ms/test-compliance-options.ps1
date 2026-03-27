# Test compliance business/industry/model options endpoints (production).
# Usage:
#   Without token (expect 401): .\test-compliance-options.ps1
#   With token:                 .\test-compliance-options.ps1 -Token "YOUR_MERCHANT_JWT"

param([string]$Token = "")

$baseGateway = "https://account-ms-plata.fly.dev"
$baseCompliance = "https://compliance-ms.fly.dev"
$paths = @("business-type-options", "industry-type-options", "business-model-options")

$headers = @{}
if ($Token) { $headers["Authorization"] = "Bearer $Token" }

Write-Host "=== Via Gateway (/api/v1/compliance) ===" -ForegroundColor Cyan
foreach ($path in $paths) {
    Write-Host "--- GET /api/v1/compliance/business/$path ---" -ForegroundColor Yellow
    try {
        $r = Invoke-WebRequest -Uri "$baseGateway/api/v1/compliance/business/$path" -Headers $headers -UseBasicParsing -TimeoutSec 30
        Write-Host $r.Content
        Write-Host "HTTP: $($r.StatusCode)`n"
    } catch {
        Write-Host "Error: $($_.Exception.Message)`n"
    }
}

Write-Host "=== Direct to compliance-ms (/api/v1/kyc) ===" -ForegroundColor Cyan
foreach ($path in $paths) {
    Write-Host "--- GET /api/v1/kyc/business/$path ---" -ForegroundColor Yellow
    try {
        $r = Invoke-WebRequest -Uri "$baseCompliance/api/v1/kyc/business/$path" -Headers $headers -UseBasicParsing -TimeoutSec 30
        Write-Host $r.Content
        Write-Host "HTTP: $($r.StatusCode)`n"
    } catch {
        Write-Host "Error: $($_.Exception.Message)`n"
    }
}
