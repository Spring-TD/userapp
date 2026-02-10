Write-Host "Deploying service-auth-ms to Fly.io..."

# Navigate to the service directory
Set-Location "c:\Users\user\Downloads\spring-TD\springApp\service-auth-ms"

# Check if logged in to Fly.io
fly auth whoami
if ($LASTEXITCODE -ne 0) {
    Write-Host "Please log in to Fly.io first using: fly auth login"
    exit 1
}

# Initialize the app if it doesn't exist
Write-Host "Checking if app exists..."
try {
    fly apps show service-auth-ms | Out-Null
    Write-Host "App service-auth-ms already exists"
}
catch {
    Write-Host "Creating new Fly.io app..."
    fly apps create service-auth-ms --org springtd
}

# Deploy the application
Write-Host "Deploying application..."
fly deploy --remote-only

# Set all secrets from the .env file at once
Write-Host "`nSetting all secrets from .env file at once..."
Write-Host "This will upload all environment variables from the .env file to Fly.io as secrets."

# Import all secrets from the .env file
Write-Host "Importing secrets from .env file..."
$envFile = Get-Content ".\.env" -Raw
# Parse and set each secret individually
foreach($line in $envFile.Split("`n`r", [System.StringSplitOptions]::RemoveEmptyEntries)) {
    if($line -match "^([^=]+)=(.*)$"){ 
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        if($value.StartsWith('"') -and $value.EndsWith('"')) {
            $value = $value.Substring(1, $value.Length-2)
        }
        Write-Host "Setting $key"
        fly secrets set $key="$value" --app service-auth-ms
    }
}

$redisUrl = Read-Host "Enter REDIS_URL (optional, press Enter to skip)"
if ($redisUrl) {
    fly secrets set REDIS_URL="$redisUrl" --app service-auth-ms
}

$redisPassword = Read-Host "Enter REDIS_PASSWORD (optional, press Enter to skip)"
if ($redisPassword) {
    fly secrets set REDIS_PASSWORD="$redisPassword" --app service-auth-ms
}

$twilioSid = Read-Host "Enter TWILIO_ACCOUNT_SID (optional, press Enter to skip)"
if ($twilioSid) {
    fly secrets set TWILIO_ACCOUNT_SID="$twilioSid" --app service-auth-ms
}

$twilioToken = Read-Host "Enter TWILIO_AUTH_TOKEN (optional, press Enter to skip)"
if ($twilioToken) {
    fly secrets set TWILIO_AUTH_TOKEN="$twilioToken" --app service-auth-ms
}

$twilioNumber = Read-Host "Enter TWILIO_PHONE_NUMBER (optional, press Enter to skip)"
if ($twilioNumber) {
    fly secrets set TWILIO_PHONE_NUMBER="$twilioNumber" --app service-auth-ms
}

$complianceCredential = Read-Host "Enter COMPLIANCE_SERVICE_CREDENTIAL (optional, press Enter to skip)"
if ($complianceCredential) {
    fly secrets set COMPLIANCE_SERVICE_CREDENTIAL="$complianceCredential" --app service-auth-ms
}

Write-Host "`nDeployment completed! Your service is now running at:"
Write-Host "https://service-auth-ms.fly.dev"