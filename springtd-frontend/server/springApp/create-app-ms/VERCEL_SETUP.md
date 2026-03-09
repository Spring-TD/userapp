# Vercel API Setup Guide

This guide will help you obtain the necessary Vercel API credentials to enable DNS configuration for custom domains.

## Required Environment Variables

Add these to your `.env` file in the `create-app-ms` directory:

```env
VERCEL_API_TOKEN=your_vercel_api_token_here
VERCEL_DEFAULT_PROJECT_ID=prj_xxxxx
VERCEL_TEAM_ID=team_xxxxx  # Optional - only needed for team accounts
```

## Step-by-Step Instructions

### 1. Get Your Vercel API Token

1. **Log in to Vercel**
   - Go to [https://vercel.com](https://vercel.com)
   - Sign in with your account

2. **Navigate to Settings**
   - Click on your profile picture/avatar in the top right corner
   - Select **"Settings"** from the dropdown menu

3. **Go to Tokens Section**
   - In the left sidebar, click on **"Tokens"**
   - Or go directly to: [https://vercel.com/account/tokens](https://vercel.com/account/tokens)

4. **Create a New Token**
   - Click the **"Create Token"** button
   - Give it a descriptive name (e.g., "SpringTD DNS Management")
   - Set the expiration (recommended: "No Expiration" for production, or a specific date for development)
   - Click **"Create"**

5. **Copy the Token**
   - ⚠️ **IMPORTANT**: Copy the token immediately - you won't be able to see it again!
   - The token will look something like: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`
   - Add it to your `.env` file as `VERCEL_API_TOKEN`

### 2. Get Your Vercel Project ID

1. **Go to Your Project**
   - Navigate to your Vercel project dashboard
   - Select the project you want to use for DNS management

2. **Access Project Settings**
   - Click on the **"Settings"** tab in your project
   - Or go to: `https://vercel.com/[your-team]/[your-project]/settings`

3. **Find the Project ID**
   - Scroll down to the **"General"** section
   - Look for **"Project ID"** - it will look like: `prj_xxxxxxxxxxxxxxxxxxxxx`
   - Copy this value
   - Add it to your `.env` file as `VERCEL_DEFAULT_PROJECT_ID`

   **Alternative Method:**
   - You can also find the Project ID in the project's URL when viewing it
   - Or check the project's `.vercel/project.json` file if you've linked it locally

### 3. Get Your Team ID (Optional - Only for Team Accounts)

**Skip this step if you're using a personal account.**

1. **Go to Team Settings**
   - Click on your team name in the top navigation
   - Select **"Settings"** from the dropdown

2. **Find Team ID**
   - In the team settings, look for **"Team ID"** in the general section
   - It will look like: `team_xxxxxxxxxxxxxxxxxxxxx`
   - Copy this value
   - Add it to your `.env` file as `VERCEL_TEAM_ID`

   **Note:** If you're using a personal account (not a team), you can omit this variable or leave it empty.

## Example .env File

Here's a complete example of what your `.env` file should look like:

```env
# Existing environment variables
PORT=4002
NODE_ENV=development
SERVICE_AUTH_URL=http://localhost:4000
PRODUCT_SERVICE_URL=http://localhost:4005
WALLET_SERVICE_URL=http://localhost:4004
SPECIAL_API_KEY=your-special-api-key
PUBLIC_KEY=your-public-key
JWT_SECRET=your-jwt-secret
SUBDOMAIN_BASE_DOMAIN=springtd.com
SERVER_IP=your-server-ip
PLATFORM_DOMAIN=domain.useinclude.com

# Vercel API Configuration
VERCEL_API_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
VERCEL_DEFAULT_PROJECT_ID=prj_xxxxxxxxxxxxxxxxxxxxx
VERCEL_TEAM_ID=team_xxxxxxxxxxxxxxxxxxxxx  # Optional - only for teams
```

## Verification

After adding the credentials to your `.env` file:

1. **Restart your application** to load the new environment variables
2. **Test the connection** by making a request to add a custom domain:
   ```bash
   PUT /api/v1/apps/:id/configuration/dns
   {
     "customDomain": "example.com"
   }
   ```

3. **Check the logs** - if there are any errors about missing Vercel configuration, verify:
   - The token is correct and hasn't expired
   - The project ID matches your Vercel project
   - The team ID is correct (if using a team account)

## Troubleshooting

### Error: "Vercel API Token is not configured"
- Make sure `VERCEL_API_TOKEN` is set in your `.env` file
- Restart your application after adding the variable
- Check for typos in the variable name

### Error: "Vercel project ID is required"
- Make sure `VERCEL_DEFAULT_PROJECT_ID` is set in your `.env` file
- Or provide `vercelProjectId` in the API request body
- Verify the project ID is correct (starts with `prj_`)

### Error: "Failed to add domain to Vercel"
- Check that your API token has the correct permissions
- Verify the domain isn't already added to another Vercel project
- Make sure the project ID belongs to your account/team
- Check Vercel's status page for any service issues

### Token Permissions
- The API token needs permissions to:
  - Add domains to projects
  - View domain information
  - Verify domains
  - Remove domains

If you're using a team account, make sure the token has team-level permissions.

## Security Best Practices

1. **Never commit your `.env` file** to version control
2. **Use different tokens** for development and production
3. **Set token expiration** for development tokens
4. **Rotate tokens** periodically for security
5. **Use environment-specific tokens** if possible

## Additional Resources

- [Vercel API Documentation](https://vercel.com/docs/rest-api)
- [Vercel Tokens Documentation](https://vercel.com/docs/rest-api#authentication)
- [Vercel Domains API](https://vercel.com/docs/rest-api#endpoints/domains)

