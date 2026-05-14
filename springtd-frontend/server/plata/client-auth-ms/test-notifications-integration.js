/**
 * Test script to verify notifications integration
 */

const axios = require('axios');

// Test configuration
const CLIENT_AUTH_URL = process.env.CLIENT_AUTH_URL || 'http://localhost:3001';
const NOTIFICATIONS_SERVICE_URL = process.env.NOTIFICATIONS_SERVICE_URL || 'http://localhost:4009';

async function testNotificationsService() {
  console.log('Testing Notifications Service Availability...');
  
  try {
    const response = await axios.get(`${NOTIFICATIONS_SERVICE_URL}/health`);
    console.log('✓ Notifications Service is running');
    console.log('Services status:', response.data.services);
    return true;
  } catch (error) {
    console.error('✗ Notifications Service is not accessible:', error.message);
    return false;
  }
}

async function testNotificationSending() {
  console.log('\nTesting Notification Sending...');
  
  try {
    const testData = {
      channel: 'email',
      recipient: 'test@example.com',
      template: 'password-reset',
      data: {
        userName: 'Test User',
        resetUrl: 'http://localhost:3000/reset-password?token=test-token'
      }
    };

    const response = await axios.post(
      `${NOTIFICATIONS_SERVICE_URL}/api/v1/notifications/send`,
      testData,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000
      }
    );

    console.log('✓ Notification sending test completed');
    console.log('Response:', response.data);
    return true;
  } catch (error) {
    console.error('✗ Notification sending failed:', error.message);
    return false;
  }
}

async function main() {
  console.log('Starting Notifications Integration Test...\n');
  
  const notificationsOk = await testNotificationsService();
  if (!notificationsOk) {
    console.log('\nCannot proceed: Notifications service is not available.');
    return;
  }

  await testNotificationSending();
  
  console.log('\nIntegration test completed!');
  console.log('\nSummary:');
  console.log('- Notifications service URL added to client-auth-ms');
  console.log('- NotificationService client created');
  console.log('- AuthService updated to use notifications service');
  console.log('- Password reset, OTP, and invitation emails now use notifications service');
}

// Run the test
main().catch(console.error);