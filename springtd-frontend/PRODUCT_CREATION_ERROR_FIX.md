# Product Creation Error - Solution

## Problem
When creating a product in Product Builder, you're getting a 500 Internal Server Error because the Product Microservice is not running.

## Root Cause
The `/api/products` endpoint is trying to connect to:
- **Default**: `https://product-ms.fly.dev` (production, might be down)
- **Local**: Not running

The product-ms is configured to run on **port 3005** but is not currently running.

## Solution

### Option 1: Start Product Microservice Locally (Recommended for Development)

1. **Open a new terminal** and navigate to the product-ms directory:
   ```bash
   cd /home/majek/springtddashboard1/server/product-ms
   ```

2. **Install dependencies** (if not already installed):
   ```bash
   npm install
   ```

3. **Start the microservice**:
   ```bash
   npm run dev
   ```
   
   You should see:
   ```
   🚀 Product Microservice running on port 3005
   📱 Environment: development
   ```

4. **Update your `.env.local`** to point to the local service:
   ```bash
   echo "NEXT_PUBLIC_PRODUCT_SERVICE_URL=http://localhost:3005" >> .env.local
   ```

5. **Restart your Next.js app** to pick up the new environment variable.

### Option 2: Use Docker Compose (If you want all services running)

```bash
cd /home/majek/springtddashboard1/server
docker-compose up product-ms
```

### Option 3: Check if Fly.dev Service is Running

If you want to use the production service, check if it's deployed and running:
```bash
fly status -a product-ms
```

## Verification

After starting the product-ms, test it:
```bash
curl http://localhost:3005/health
```

You should get:
```json
{
  "success": true,
  "message": "Product Microservice is running",
  "timestamp": "...",
  "version": "1.0.0"
}
```

## Next Steps

Once the product-ms is running, try creating a product again in Product Builder.
