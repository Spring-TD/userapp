// Simple script to check merchant account status
const path = require('path');

// Set the path to the dist directory
const distPath = path.join(__dirname, 'dist');

// Import the required modules from the compiled code
const { AuthService } = require(path.join(distPath, 'services', 'authService'));
const { mockDb } = require(path.join(distPath, 'utils', 'mockDatabase'));

async function checkMerchantStatus() {
  try {
    console.log('Checking merchant account status...');
    
    // Try to get all users to see what accounts exist
    console.log('Attempting to retrieve all users...');
    const allUsers = await mockDb.getAllUsers();
    console.log(`Found ${allUsers.length} users in the database:`);
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.user_type}): ${user.status}`);
    });
    
    // Also try to find the merchant by email using AuthService
    const merchant = await AuthService.getUserByEmail('merchant@example.com');
    
    if (merchant) {
      console.log('\n✅ Merchant account found!');
      console.log('Account details:', {
        id: merchant.id,
        email: merchant.email,
        first_name: merchant.first_name,
        last_name: merchant.last_name,
        user_type: merchant.user_type,
        status: merchant.status,
        email_verified: merchant.email_verified,
        user_merchant_id: merchant.user_merchant_id,
        country: merchant.country,
        created_at: merchant.created_at,
        updated_at: merchant.updated_at
      });
    } else {
      console.log('\n❌ No merchant account found with email merchant@example.com');
    }
  } catch (error) {
    console.error('❌ Error checking merchant status:', error.message);
    console.error('Stack trace:', error.stack);
  }
}

// Run the function
checkMerchantStatus();