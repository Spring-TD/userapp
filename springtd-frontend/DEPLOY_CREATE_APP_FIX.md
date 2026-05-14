# Quick Deployment Guide - Create App Authentication Fix

## What Changed
Added proper JWT authentication to the create-app-ms microservice so it can verify user tokens and enforce role-based access control.

## Deploy to Fly.io (create-app-ms)

1. **Navigate to the service directory:**
```bash
cd server/create-app-ms
```

2. **Set the JWT_SECRET (must match auth service):**
```bash
fly secrets set JWT_SECRET=Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23 -a create-app-ms
```

3. **Deploy:**
```bash
fly deploy
```

4. **Verify deployment:**
```bash
fly status -a create-app-ms
fly logs -a create-app-ms
```

## Vercel (Next.js Frontend)

The frontend changes are already deployed automatically via git push. Just verify the environment variable is set:

1. Go to https://vercel.com/your-project/settings/environment-variables
2. Confirm `JWT_SECRET` is set to: `Jb@1zP!k9#tW$xL&5aVn*QyR7gE^cF#Qb23`
3. If not set, add it and redeploy

## Important: User Registration

Users MUST register as MERCHANT to create apps:

**Check your registration form** - it should use:
- Endpoint: `POST /api/v1/auth/register/merchant`
- NOT: `POST /api/v1/auth/register/user`

If using the wrong endpoint, users will get `userType: USER` which cannot create apps.

## Testing After Deployment

1. Register a new account (as merchant)
2. Verify email
3. Sign in
4. Try to create an app
5. Should succeed with 201 Created

## Troubleshooting

### Still getting 403 error?
- Check Fly.io logs: `fly logs -a create-app-ms`
- Verify JWT_SECRET is set: `fly secrets list -a create-app-ms`
- Check user's token has `userType: MERCHANT` or `ADMIN`

### How to check user's token?
In browser console after login:
```javascript
const token = localStorage.getItem('accessToken');
const payload = JSON.parse(atob(token.split('.')[1]));
console.log('User Type:', payload.userType);
```

Should show: `MERCHANT` or `ADMIN`

### User has wrong role?
They registered as USER instead of MERCHANT. They need to:
1. Register a new account using merchant registration
2. Or you need to update their role in the database
