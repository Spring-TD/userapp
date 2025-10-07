const axios = require('axios');

async function checkKYCProfiles() {
  try {
    const response = await axios.get('http://localhost:3003/api/v1/kyc/search', {
      headers: {
        'Authorization': 'Bearer sams_hoHnOBYKG5z_z-18kPvOMBwqqVef2nzy'
      }
    });
    
    console.log('KYC Profiles:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Error checking KYC profiles:', error.response ? error.response.data : error.message);
  }
}

checkKYCProfiles();