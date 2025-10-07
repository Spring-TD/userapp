const axios = require('axios');

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3000/api/v1/auth/login', {
      email: 'merchant@example.com',
      password: 'DefaultPass123!'
    });
    
    console.log('Login response:', JSON.stringify(response.data, null, 2));
  } catch (error) {
    console.error('Login error:', error.response ? error.response.data : error.message);
  }
}

testLogin();