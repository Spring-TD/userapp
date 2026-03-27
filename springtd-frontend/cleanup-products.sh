#!/bin/bash

# Product Cleanup Script
# Quick wrapper for cleaning up old products

cd "$(dirname "$0")/server/product-ms"

echo ""
echo "📦 Product Cleanup Tool"
echo "======================="
echo ""

# Use npx to run ts-node (no global install needed)
TS_NODE="npx ts-node --transpile-only"

# If no arguments, show help
if [ $# -eq 0 ]; then
    echo "Usage:"
    echo "  ./cleanup-products.sh list              # List all products"
    echo "  ./cleanup-products.sh keep-last 3       # Keep only 3 newest products"
    echo "  ./cleanup-products.sh before 2026-02-17 # Delete products before date"
    echo "  ./cleanup-products.sh delete-all        # Delete ALL products"
    echo ""
    exit 0
fi

# Execute the TypeScript script
case "$1" in
    list)
        $TS_NODE src/db/cleanup-old-products.ts --list
        ;;
    keep-last)
        if [ -z "$2" ]; then
            echo "❌ Error: Please specify how many products to keep"
            echo "   Example: ./cleanup-products.sh keep-last 3"
            exit 1
        fi
        $TS_NODE src/db/cleanup-old-products.ts --keep-last "$2"
        ;;
    before)
        if [ -z "$2" ]; then
            echo "❌ Error: Please specify a date (YYYY-MM-DD)"
            echo "   Example: ./cleanup-products.sh before 2026-02-17"
            exit 1
        fi
        $TS_NODE src/db/cleanup-old-products.ts --before "$2"
        ;;
    delete-all)
        echo "⚠️  WARNING: This will delete ALL products!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            $TS_NODE src/db/cleanup-old-products.ts --delete-all
        else
            echo "❌ Cancelled"
        fi
        ;;
    assign-to-dev)
        echo "🔄 Assigning all products to dev user (dev_user_001)..."
        # Use simple JS script to avoid TS issues
        node scripts/assign-products.js
        ;;
    *)
        echo "❌ Unknown command: $1"
        echo "   Use './cleanup-products.sh' to see usage"
        exit 1
        ;;
esac
