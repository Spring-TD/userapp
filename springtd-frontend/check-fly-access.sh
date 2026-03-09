#!/bin/bash

echo "================================================"
echo "Fly.io Access Check"
echo "================================================"
echo ""

# Check if fly CLI is installed
if ! command -v fly &> /dev/null; then
    echo "❌ Fly CLI not installed"
    echo ""
    echo "To install:"
    echo "  curl -L https://fly.io/install.sh | sh"
    echo "  export PATH=\"\$HOME/.fly/bin:\$PATH\""
    echo ""
    exit 1
fi

echo "✅ Fly CLI installed"
FLY_VERSION=$(fly version 2>&1 | head -1)
echo "   Version: $FLY_VERSION"
echo ""

# Check authentication
echo "================================================"
echo "Authentication Status"
echo "================================================"
echo ""

if fly auth whoami &> /dev/null; then
    echo "✅ Authenticated"
    echo ""
    fly auth whoami
    echo ""
else
    echo "❌ Not authenticated"
    echo ""
    echo "To login:"
    echo "  fly auth login"
    echo ""
    exit 1
fi

# Check organizations
echo "================================================"
echo "Organizations"
echo "================================================"
echo ""

fly orgs list 2>&1
echo ""

# Check app access
echo "================================================"
echo "App Access Check: create-app-ms"
echo "================================================"
echo ""

if fly status -a create-app-ms &> /dev/null; then
    echo "✅ You have access to create-app-ms!"
    echo ""
    
    # Show app details
    fly status -a create-app-ms
    echo ""
    
    # Check secrets
    echo "================================================"
    echo "Current Secrets"
    echo "================================================"
    echo ""
    fly secrets list -a create-app-ms 2>&1
    echo ""
    
    # Show deployment recommendation
    echo "================================================"
    echo "✅ YOU CAN DEPLOY!"
    echo "================================================"
    echo ""
    echo "Run these commands to deploy:"
    echo ""
    echo "  # Set the JWT secret (if not already set)"
    echo "  fly secrets set JWT_SECRET=Jb@1zP!k9#tW\$xL&5aVn*QyR7gE^cF#Qb23 -a create-app-ms"
    echo ""
    echo "  # Deploy the service"
    echo "  cd server/create-app-ms"
    echo "  fly deploy"
    echo ""
    
else
    echo "❌ Cannot access create-app-ms"
    echo ""
    echo "Possible reasons:"
    echo "  1. The app doesn't exist"
    echo "  2. You don't have permissions"
    echo "  3. The app is in a different organization"
    echo ""
    echo "Next steps:"
    echo "  1. Check with your organization admin"
    echo "  2. Verify you're added to the correct organization"
    echo "  3. Ask admin to grant you deployment permissions"
    echo ""
    
    # Try to list all apps
    echo "================================================"
    echo "All Apps You Have Access To"
    echo "================================================"
    echo ""
    fly apps list 2>&1
    echo ""
fi

echo "================================================"
echo "Check Complete"
echo "================================================"
