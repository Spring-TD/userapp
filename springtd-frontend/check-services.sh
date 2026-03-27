#!/bin/bash

# Script to check which microservices you have locally and their deployment status

echo "================================================"
echo "Microservices Source Code Check"
echo "================================================"
echo ""

# Check which services exist locally
echo "📁 Services in your local repository:"
echo ""

for service in server/*/; do
    if [ -d "$service" ]; then
        service_name=$(basename "$service")
        
        # Check if it has a fly.toml (indicates it's deployable)
        if [ -f "${service}fly.toml" ]; then
            app_name=$(grep "^app = " "${service}fly.toml" | cut -d "'" -f 2)
            echo "  ✅ $service_name"
            echo "     - Fly.io app: $app_name"
            echo "     - Has fly.toml: Yes"
            
            # Check if package.json exists
            if [ -f "${service}package.json" ]; then
                echo "     - Has package.json: Yes"
            fi
            
            # Check if Dockerfile exists
            if [ -f "${service}Dockerfile" ]; then
                echo "     - Has Dockerfile: Yes"
            fi
            echo ""
        else
            echo "  ⚠️  $service_name (no fly.toml - not configured for Fly.io)"
            echo ""
        fi
    fi
done

echo "================================================"
echo "Modified Files (git status)"
echo "================================================"
echo ""
git status --short server/

echo ""
echo "================================================"
echo "Deployment Recommendation"
echo "================================================"
echo ""
echo "Services you can safely deploy:"
echo ""

# Check for services with fly.toml
for service in server/*/; do
    if [ -f "${service}fly.toml" ]; then
        service_name=$(basename "$service")
        app_name=$(grep "^app = " "${service}fly.toml" | cut -d "'" -f 2)
        
        # Check if this service has been modified
        if git status --short "$service" | grep -q "^"; then
            echo "  🚀 $service_name (app: $app_name) - HAS CHANGES"
        else
            echo "  ✓  $service_name (app: $app_name) - No changes"
        fi
    fi
done

echo ""
echo "================================================"
echo "Next Steps"
echo "================================================"
echo ""
echo "To deploy create-app-ms (the service we modified):"
echo ""
echo "  1. Install Fly CLI: curl -L https://fly.io/install.sh | sh"
echo "  2. Login: fly auth login"
echo "  3. Set secret: fly secrets set JWT_SECRET=Jb@1zP!k9#tW\$xL&5aVn*QyR7gE^cF#Qb23 -a create-app-ms"
echo "  4. Deploy: cd server/create-app-ms && fly deploy"
echo ""
echo "Or coordinate with your backend developer to deploy."
echo ""
