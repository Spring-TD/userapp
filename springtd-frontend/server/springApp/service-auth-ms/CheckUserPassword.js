// CheckUserPassword.js - Enhanced version that creates and checks a verified merchant account
const path = require('path');
const { mockDb } = require(path.join(__dirname, 'dist', 'utils', 'mockDatabase'));
const { AuthService } = require(path.join(__dirname, 'dist', 'services', 'authService'));

// Merchant account details
const merchantAccount = {
  email: 'merchant@example.com',
  password: 'MerchantPass123!',
  first_name: 'Merchant',
  last_name: 'User',
  user_merchant_id: 'merch_001',
  country: 'US'
};

async function createAndCheckUser() {
  try {
    console.log('Creating and checking verified merchant account...');
    
    // First, try to find existing user
    let user = await mockDb.findUserByEmail('merchant@example.com');
    
    if (!user) {
      console.log('No existing user found. Creating new merchant account...');
      
      // Create a new merchant account
      const result = await AuthService.registerMerchant(merchantAccount);
      
      if (result.success) {
        console.log('✅ Merchant account created successfully!');
        
        // Update to verified status
        const updatedResult = await mockDb.updateUser(result.merchant.id, {
          status: 'active',
          email_verified: true
        });
        
        if (updatedResult) {
          user = updatedResult;
          console.log('✅ Account updated to verified status!');
        } else {
          console.log('⚠️  Account created but not verified');
          user = result.merchant;
        }
      } else {
        console.log('❌ Failed to create merchant account:', result.error);
        return;
      }
    } else {
      console.log('✅ Existing user found!');
      
      // Check if user needs to be updated to verified status
      if (user.status !== 'active' || !user.email_verified) {
        console.log('Updating account to verified status...');
        const updatedResult = await mockDb.updateUser(user.id, {
          status: 'active',
          email_verified: true
        });
        
        if (updatedResult) {
          user = updatedResult;
          console.log('✅ Account updated to verified status!');
        }
      }
    }
    
    // Display user information
    console.log('\nUser details:', {
      id: user.id,
      email: user.email,
      status: user.status,
      email_verified: user.email_verified,
      user_type: user.user_type,
      first_name: user.first_name,
      last_name: user.last_name
    });
    
    // Check if the user has the correct status
    if (user.status === 'active' && user.email_verified === true) {
      console.log('✅ User is verified and active');
    } else {
      console.log('⚠️ User status:', user.status);
      console.log('⚠️ Email verified:', user.email_verified);
    }
    
    // Final check - get all users
    console.log('\nAll users in database:');
    const allUsers = await mockDb.getAllUsers();
    console.log(`Found ${allUsers.length} users:`);
    allUsers.forEach(user => {
      console.log(`- ${user.email} (${user.user_type}): ${user.status}`);
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

createAndCheckUser();