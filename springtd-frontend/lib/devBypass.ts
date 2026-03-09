/**
 * Development Bypass Mode
 * Set NEXT_PUBLIC_DEV_BYPASS=true to skip authentication
 */

export const DEV_BYPASS = process.env.NEXT_PUBLIC_DEV_BYPASS === 'true';

export const MOCK_USER = {
  id: 'majek-dev-user',
  email: 'majekgb@gmail.com',
  firstName: 'Majek',
  lastName: 'Garb',
  userMerchantId: 'majek-merchant-dev',
  userType: 'MERCHANT',
};

// Valid JWT token signed with the correct secret
export const MOCK_TOKEN = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJtYWplay1kZXYtdXNlciIsImVtYWlsIjoibWFqZWtnYkBnbWFpbC5jb20iLCJ1c2VyVHlwZSI6Ik1FUkNIQU5UIiwidXNlck1lcmNoYW50SWQiOiJtYWplay1tZXJjaGFudC1kZXYiLCJpYXQiOjE3NzE0NjYwNTIsImV4cCI6MTgwMzAwMjA1MiwiYXVkIjoiY2xpZW50LWFwcCIsImlzcyI6InNlcnZpY2UtYXV0aC1tcyJ9.QuiccDaIa6zG6_XIRfuBj7PjDdwLIllpfwL01lRbLF0';

// Auto-login in dev bypass mode
if (DEV_BYPASS && typeof window !== 'undefined') {
  localStorage.setItem('accessToken', MOCK_TOKEN);
  localStorage.setItem('user', JSON.stringify(MOCK_USER));
  console.log('🚀 DEV BYPASS MODE ENABLED');
  console.log('📧 Auto-logged in as:', MOCK_USER.email);
  console.log('🆔 Merchant ID:', MOCK_USER.userMerchantId);
}

