const axios = require('axios');

async function testSavingsConfiguration() {
  try {
    // First create a savings product
    const productResponse = await axios.post('http://localhost:3005/api/v1/products', {
      name: 'Test Savings Product',
      description: 'A test savings product for configuration',
      type: 'Savings',
      appId: 'app-999'
    });
    
    console.log('Savings Product created:', productResponse.data);
    
    const productId = productResponse.data.data.id;
    
    // Then create a configuration for the savings product
    const configResponse = await axios.post('http://localhost:3005/api/v1/configurations', {
      productId: productId,
      productType: 'Savings',
      configuration: {
        loanAmount: {
          minimum: 1000,
          maximum: 50000
        },
        charges: [
          {
            name: "Account Maintenance Fee",
            type: "fee",
            amount: 10,
            isPercentage: false
          },
          {
            name: "Insurance",
            type: "insurance",
            amount: 0.5,
            isPercentage: true
          }
        ],
        savingAmountSettings: "flexible",
        duration: {
          value: 12,
          unit: "month"
        },
        interestRate: 3.5,
        withdrawalPenalty: {
          type: "percentage",
          value: 1.0
        },
        withdrawalFlexibility: "monthly",
        moratorium: {
          value: 30,
          unit: "day"
        },
        productName: "Flexible Savings Account",
        userMode: "single"
      }
    });
    
    console.log('Savings Configuration created:', configResponse.data);
    
    // Retrieve the configuration
    const getConfigResponse = await axios.get(`http://localhost:3005/api/v1/configurations/${productId}`);
    console.log('Savings Configuration retrieved:', getConfigResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testSavingsConfiguration();