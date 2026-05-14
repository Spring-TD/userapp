# 🔧 Token Validation Fix - Quick Guide

## ❌ The Problem

You were getting this error:
```
Failed to load resource: the server responded with a status of 401 (Unauthorized)
API returned error: The provided token is invalid
```

## ✅ The Root Cause

The `JWT_SECRET` environment variable was **missing** from your `.env.local` file!

When you logged in:
1. ✅ service-auth-ms created a token with its JWT_SECRET
2. ✅ Token was stored in localStorage
3. ❌ When fetching apps, the `/api/apps` route tried to transform the token
4. ❌ It used a fallback JWT_SECRET that didn't match the backend
5. ❌ Backend rejected the transformed token as "invalid"

## 🔧 The Fix

I've added the JWT_SECRET to your `.env.local` file:

```bash
JWT_SECRET=Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23
```

This is the **shared secret** used by all your backend services:
- service-auth-ms (authentication)
- create-app-ms (app management)
- product-ms (product management)

## 🚀 What You Need to Do

### Step 1: Restart Your Development Server

**IMPORTANT:** Environment variables only load when the server starts!

```bash
# Stop your current dev server (Ctrl+C)
# Then restart it:
npm run dev
# or
pnpm dev
# or
yarn dev
```

### Step 2: Clear Your Browser and Log In Again

```bash
# In browser console (F12):
localStorage.clear()
sessionStorage.clear()

# Then:
1. Refresh the page
2. Log in again
3. Try accessing the merchant dashboard
```

### Step 3: Verify It Works

After restarting and logging in again:
1. Go to `/dashboard/merchant`
2. You should see your apps!
3. No more 401 errors

## 🔍 Why This Happened

The `/api/apps` route transforms JWT tokens to ensure they have the correct role information for the backend. This transformation requires re-signing the token with the same `JWT_SECRET` that the backend uses.

Without the correct secret:
- Frontend signs with: `fallback_secret_123`
- Backend expects: `Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23`
- Result: **Token validation fails** ❌

With the correct secret:
- Frontend signs with: `Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23`
- Backend expects: `Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23`
- Result: **Token validation succeeds** ✅

## 📝 What Changed

**File:** `.env.local`

**Added:**
```bash
# JWT Secret - MUST match backend services
# This is the shared secret used by service-auth-ms, create-app-ms, and product-ms
JWT_SECRET=Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23
```

## ✅ After This Fix

Once you restart the server and log in again:
1. ✅ Apps will load in merchant dashboard
2. ✅ You can create apps
3. ✅ You can create products
4. ✅ The debug panel will work
5. ✅ You can diagnose the product display issue

## 🎯 Next Steps

1. **Restart dev server** (most important!)
2. **Clear browser storage**
3. **Log in again**
4. **Test the merchant dashboard**
5. **Use the debug panel** to check product display

---

**Remember: You MUST restart the dev server for environment variables to take effect!**
