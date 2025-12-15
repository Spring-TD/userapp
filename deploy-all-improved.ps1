# Script to deploy all microservices to Fly.io with better error handling
Write-Host "Starting deployment of all microservices..." -ForegroundColor Green

# List of all microservices in the order they should be deployed
$microservices = @(
    "account-ms",
    "billing-ms",
    "client-auth-ms",
    "compliance-ms",
    "create-app-ms",
    "payment-ms",
    "product-ms",
    "service-auth-ms",
    "wallet-ms"
)

$successCount = 0
$failureCount = 0
$failedServices = @()

# Deploy each microservice
foreach ($service in $microservices) {
    Write-Host "Deploying $service..." -ForegroundColor Yellow
    
    # Change to the service directory
    Set-Location "server\$service"
    
    # Run fly deploy
    $result = fly deploy 2>&1
    
    # Check if deployment was successful
    if ($LASTEXITCODE -eq 0) {
        Write-Host "$service deployed successfully!" -ForegroundColor Green
        $successCount++
    } else {
        Write-Host "Failed to deploy $service" -ForegroundColor Red
        Write-Host $result -ForegroundColor Red
        $failureCount++
        $failedServices += $service
    }
    
    # Return to the root directory
    Set-Location "..\.."
    
    Write-Host "----------------------------------------" -ForegroundColor Gray
}

# Summary
Write-Host "Deployment Summary:" -ForegroundColor Cyan
Write-Host "Successful deployments: $successCount" -ForegroundColor Green
Write-Host "Failed deployments: $failureCount" -ForegroundColor Red

if ($failureCount -gt 0) {
    Write-Host "Failed services: $($failedServices -join ', ')" -ForegroundColor Red
    exit 1
} else {
    Write-Host "All microservices deployed successfully!" -ForegroundColor Green
    exit 0
}