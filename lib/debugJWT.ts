/**
 * JWT Debug Utility
 * Use this to inspect your JWT token and see what fields are available
 */

import { getAccessToken } from './cookieAuth';

export function debugJWT() {
  if (typeof window === 'undefined') {
    console.log('JWT Debug: Not in browser environment');
    return null;
  }

  const token = getAccessToken();
  
  if (!token) {
    console.log('JWT Debug: No access token found (cookie or localStorage)');
    return null;
  }

  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    console.log('=== JWT Token Payload ===');
    console.log('Full payload:', payload);
    console.log('\n=== Merchant ID Candidates ===');
    console.log('userMerchantId:', payload.userMerchantId);
    console.log('user_merchant_id:', payload.user_merchant_id);
    console.log('merchantId:', payload.merchantId);
    console.log('userId:', payload.userId);
    console.log('id:', payload.id);
    console.log('sub:', payload.sub);
    
    const merchantId = payload.userMerchantId || 
                      payload.user_merchant_id || 
                      payload.merchantId || 
                      payload.userId || 
                      payload.id || 
                      payload.sub;
    
    console.log('\n=== Resolved Merchant ID ===');
    console.log('Merchant ID:', merchantId);
    
    return {
      payload,
      merchantId,
    };
  } catch (error) {
    console.error('JWT Debug: Failed to decode token', error);
    return null;
  }
}

// Make it available globally for easy debugging in browser console
if (typeof window !== 'undefined') {
  (window as any).debugJWT = debugJWT;
}
