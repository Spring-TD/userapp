#!/bin/bash

# Script to deploy service-auth-ms to Fly.io with required secrets

echo "Deploying service-auth-ms to Fly.io..."

# Navigate to the service directory
cd /c/Users/user/Downloads/spring-TD/springApp/service-auth-ms

# Check if logged in to Fly.io
fly auth whoami
if [ $? -ne 0 ]; then
    echo "Please log in to Fly.io first using: fly auth login"
    exit 1
fi

# Initialize the app if it doesn't exist
echo "Checking if app exists..."
if ! fly apps show service-auth-ms-springtd > /dev/null 2>&1; then
    echo "Creating new Fly.io app..."
    fly apps create service-auth-ms-springtd --org springtd
else
    echo "App service-auth-ms-springtd already exists"
fi

# Deploy the application
echo "Deploying application..."
fly deploy --remote-only

# Set all secrets from the .env file at once
echo "Setting all secrets from .env file at once..."
echo "This will upload all environment variables from the .env file to Fly.io as secrets."

# Use fly secrets import to upload all secrets from the .env file
cd /c/Users/user/Downloads/spring-TD/springApp/service-auth-ms
fly secrets import --app service-auth-ms < ./.env
cd /c/Users/user/Downloads/spring-TD

read -p "Enter REDIS_URL (optional, press Enter to skip): " redis_url
if [ ! -z "$redis_url" ]; then
    fly secrets set REDIS_URL="$redis_url" --app service-auth-ms
fi

read -p "Enter REDIS_PASSWORD (optional, press Enter to skip): " redis_password
if [ ! -z "$redis_password" ]; then
    fly secrets set REDIS_PASSWORD="$redis_password" --app service-auth-ms
fi

read -p "Enter TWILIO_ACCOUNT_SID (optional, press Enter to skip): " twilio_sid
if [ ! -z "$twilio_sid" ]; then
    fly secrets set TWILIO_ACCOUNT_SID="$twilio_sid" --app service-auth-ms
fi

read -p "Enter TWILIO_AUTH_TOKEN (optional, press Enter to skip): " twilio_token
if [ ! -z "$twilio_token" ]; then
    fly secrets set TWILIO_AUTH_TOKEN="$twilio_token" --app service-auth-ms
fi

read -p "Enter TWILIO_PHONE_NUMBER (optional, press Enter to skip): " twilio_number
if [ ! -z "$twilio_number" ]; then
    fly secrets set TWILIO_PHONE_NUMBER="$twilio_number" --app service-auth-ms
fi

read -p "Enter COMPLIANCE_SERVICE_CREDENTIAL (optional, press Enter to skip): " compliance_credential
if [ ! -z "$compliance_credential" ]; then
    fly secrets set COMPLIANCE_SERVICE_CREDENTIAL="$compliance_credential" --app service-auth-ms
fi

echo "Deployment completed! Your service is now running at:"
echo "https://service-auth-ms-springtd.fly.dev"