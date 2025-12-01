// Script to create four mock apps for the default merchant
const axios = require('axios');

// Configuration
const CREATE_APP_SERVICE_URL = process.env.CREATE_APP_SERVICE_URL || 'http://localhost:3002';
const SERVICE_AUTH_SERVICE_URL = process.env.SERVICE_AUTH_SERVICE_URL || 'http://localhost:3000';

// Default merchant credentials
const DEFAULT_MERCHANT_EMAIL = 'merchant@example.com';
const DEFAULT_MERCHANT_PASSWORD = 'DefaultPass123!';

// Mock app data templates
const appTemplates = [
  {
    name: 'E-commerce Platform',
    websiteUrl: 'https://ecommerce.example.com',
    alias: 'ecommerce-app',
    description: 'A comprehensive e-commerce platform for selling products online'
  },
  {
    name: 'Payment Gateway Integration',
    websiteUrl: 'https://payments.example.com',
    alias: 'payment-app',
    description: 'A payment gateway integration for processing online transactions'
  },
  {
    name: 'Subscription Management System',
    websiteUrl: 'https://subscriptions.example.com',
    alias: 'subscription-app',
    description: 'A subscription management system for recurring billing'
  },
  {
    name: 'Invoice Generator',
    websiteUrl: 'https://invoices.example.com',
    alias: 'invoice-app',
    description: 'An automated invoice generation and management system'
  }
];

async function authenticateAndGetMerchantId() {
  try {
    console.log('Authenticating with service-auth-ms...');
    
    // Login with default merchant credentials
    const loginResponse = await axios.post(`${SERVICE_AUTH_SERVICE_URL}/api/v1/auth/login`, {
      email: DEFAULT_MERCHANT_EMAIL,
      password: DEFAULT_MERCHANT_PASSWORD
    });
    
    if (!loginResponse.data.success) {
      throw new Error(`Login failed: ${loginResponse.data.error}`);
    }
    
    const { accessToken, refreshToken } = loginResponse.data.data.tokens;
    const user = loginResponse.data.data.user;
    
    console.log(`✅ Successfully authenticated as ${user.email}`);
    console.log(`User ID: ${user.id}`);
    console.log(`User Type: ${user.user_type}`);
    
    // Log all user properties to see what's available
    console.log('User properties:', Object.keys(user));
    
    // For the default merchant, we know the merchant ID from the code
    // In a real implementation, we would get this from the user object
    // But for the default merchant, we can use the known value
    const merchantId = 'default-merchant-id';
    console.log(`Using known merchant ID: ${merchantId}`);
    
    return {
      accessToken,
      refreshToken,
      merchantId: merchantId,
      userId: user.id,
      user
    };
  } catch (error) {
    console.error('Error during authentication:', error.response?.data || error.message);
    throw error;
  }
}

async function createApp(appData, merchantId, accessToken) {
  try {
    console.log(`Creating app: ${appData.name}`);
    
    // Make sure we're sending all required fields
    const requestData = {
      ...appData,
      merchantId: merchantId
    };
    
    console.log('Sending request data:', JSON.stringify(requestData, null, 2));
    
    const response = await axios.post(`${CREATE_APP_SERVICE_URL}/api/v1/apps`, requestData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.data.success) {
      console.log(`✅ Successfully created app: ${appData.name} (ID: ${response.data.data.app.id})`);
      return response.data.data.app;
    } else {
      console.error(`❌ Failed to create app: ${appData.name}`, response.data.error);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error creating app: ${appData.name}`);
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      console.error('Response headers:', error.response.headers);
    } else if (error.request) {
      console.error('Request data:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    return null;
  }
}

async function createDefaultMerchantApps() {
  console.log('Creating four mock apps for the default merchant...\n');
  
  try {
    // Authenticate and get merchant information
    const authInfo = await authenticateAndGetMerchantId();
    
    if (!authInfo) {
      console.error('Could not authenticate');
      process.exit(1);
    }
    
    // We're using the known merchant ID for the default merchant
    const { merchantId, accessToken } = authInfo;
    console.log(`Using merchant ID: ${merchantId}\n`);
    
    // Create four mock apps
    const createdApps = [];
    for (const template of appTemplates) {
      const app = await createApp(template, merchantId, accessToken);
      if (app) {
        createdApps.push(app);
      }
    }
    
    console.log(`\n🎉 Created ${createdApps.length} out of ${appTemplates.length} apps successfully!`);
    
    if (createdApps.length > 0) {
      console.log('\nCreated apps:');
      createdApps.forEach(app => {
        console.log(`  - ${app.name} (ID: ${app.id})`);
      });
    }
  } catch (error) {
    console.error('Error creating default merchant apps:', error.message);
    process.exit(1);
  }
}

// Run the script
createDefaultMerchantApps().catch(console.error);