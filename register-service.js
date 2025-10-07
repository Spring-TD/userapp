const axios = require('axios');

async function registerService() {
  try {
    const response = await axios.post('http://localhost:3000/api/v1/services/create', {
      name: 'auth-service',
      description: 'Authentication service for user authentication and authorization',
      endpoint_url: 'http://localhost:3000',
      health_check_url: 'http://localhost:3000/health'
    });
    
    console.log('Service registration response:', JSON.stringify(response.data, null, 2));
    return response.data.data.service.service_id;
  } catch (error) {
    console.error('Service registration error:', error.response ? error.response.data : error.message);
  }
}

registerService();