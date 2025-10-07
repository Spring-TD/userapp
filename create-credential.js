const axios = require('axios');

async function createCredential() {
  try {
    // First get the service IDs
    const servicesResponse = await axios.get('http://localhost:3000/api/v1/services');
    const services = servicesResponse.data.data.services;
    
    const authService = services.find(s => s.name === 'auth-service');
    const complianceService = services.find(s => s.name === 'compliance-service');
    
    if (!authService || !complianceService) {
      console.error('Could not find required services');
      return;
    }
    
    console.log('Auth service ID:', authService.service_id);
    console.log('Compliance service ID:', complianceService.service_id);
    
    // Create credential for auth service to access compliance service
    const response = await axios.post(`http://localhost:3000/api/v1/services/${authService.service_id}/credentials`, {
      credential_type: 'api_key',
      target_service_id: complianceService.service_id,
      expires_in: 86400, // 24 hours
      permissions: ['read', 'write'],
      rate_limit: 1000
    });
    
    console.log('Credential creation response:', JSON.stringify(response.data, null, 2));
    return response.data.data.credential.credential_value;
  } catch (error) {
    console.error('Credential creation error:', error.response ? error.response.data : error.message);
  }
}

createCredential();