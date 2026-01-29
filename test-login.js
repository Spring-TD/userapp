const axios = require('axios');

async function testLogin() {
  try {
    const response = await axios.post('http://localhost:3001/api/v1/auth/login', {
      email: 'test@example.com',
      password: 'testpass'
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });
    console.log('Response:', response.data);
  } catch (error) {
    console.log('Error:', error.response ? error.response.data : error.message);
  }
}

testLogin();