# Product Cleanup Guide

## Problem
After migrating to SQLite, old products from `products.json` were imported into the database. You now see more products than you actually created recently.

## Solution
Use the cleanup script to remove old products and keep only the ones you want.

---

## Quick Start

### 1. List All Products (See What You Have)
```bash
./cleanup-products.sh list
```

This shows all products with their creation dates so you can decide what to delete.

---

## Cleanup Options

### Option 1: Keep Only Recent Products (RECOMMENDED)
Keep only the 3 most recent products:
```bash
./cleanup-products.sh keep-last 3
```

This will:
- ✅ Keep your 3 newest products
- ❌ Delete all older products

### Option 2: Delete Products Before a Date
Delete all products created before Feb 17, 2026:
```bash
./cleanup-products.sh before 2026-02-17
```

### Option 4: Assign Products to You (Fix Missing Products)
If you created products but can't see them in Spring App:
```bash
./cleanup-products.sh assign-to-dev
```
This assigns all products to your developer account (`dev@test.com`).

---

## Step-by-Step Example

### Step 1: See what you have
```bash
./cleanup-products.sh list
```

**Output:**
```
📦 All Products in Database:

ID              Name                           Type            Created At                App ID
────────────────────────────────────────────────────────────────────────────────────────────────
abc123          Quick Loan                     Loan            2026-02-18T00:30:00Z      app_new
def456          Home Mortgage                  Mortgage        2026-02-18T00:25:00Z      app_new
ghi789          Savings Account                Savings         2026-02-18T00:20:00Z      app_new
old001          Old Test Loan                  Loan            2026-02-10T10:00:00Z      app_old
old002          Old Test Mortgage              Mortgage        2026-02-10T09:00:00Z      app_old

Total: 5 products
```

### Step 2: Keep only the 3 newest
```bash
./cleanup-products.sh keep-last 3
```

**Output:**
```
🗑️  Keeping the 3 most recent products. Deleting 2 older products:

   - Old Test Mortgage (old002) - Created: 2026-02-10T09:00:00Z
   - Old Test Loan (old001) - Created: 2026-02-10T10:00:00Z

⚠️  About to delete 2 products...
✅ Deleted 2 products
```

### Step 3: Verify
```bash
./cleanup-products.sh list
```

Now you should see only your 3 products!

---

## Advanced Usage (Direct TypeScript)

If you want more control, use the TypeScript script directly:

```bash
cd server/product-ms
ts-node src/db/cleanup-old-products.ts --help
```

---

## Troubleshooting

### "ts-node: command not found"
Install ts-node globally:
```bash
npm install -g ts-node
```

Or use npx:
```bash
cd server/product-ms
npx ts-node src/db/cleanup-old-products.ts --list
```

### Database is locked
Make sure product-ms is not running:
```bash
# Stop the service first
cd server/product-ms
# Then run cleanup
```

---

## What Gets Deleted?

The script deletes from the `products` table in `/data/products.db`. 

**It does NOT delete:**
- Product configurations (those stay in `product_configurations` table)
- Apps
- Users

If you want to clean those too, you can manually delete the database files:
```bash
rm server/product-ms/data/products.db
rm server/service-auth-ms/data/auth.db
rm server/create-app-ms/data/apps.db
```

Then restart services to recreate fresh databases.

---

## Recommended Workflow

**For your current situation (3 products you want to keep):**

```bash
# 1. List products to see what you have
./cleanup-products.sh list

# 2. Keep only the 3 newest
./cleanup-products.sh keep-last 3

# 3. Verify it worked
./cleanup-products.sh list
```

Done! ✅
