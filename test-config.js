const axios = require('axios');

async function testConfiguration() {
  try {
    // First create a product
    const productResponse = await axios.post('http://localhost:3005/api/v1/products', {
      name: 'Test Loan Product',
      description: 'A test loan product for configuration',
      type: 'Loan',
      appId: 'app-888'
    });
    
    console.log('Product created:', productResponse.data);
    
    const productId = productResponse.data.data.id;
    
    // Then create a configuration for the product
    const configResponse = await axios.post('http://localhost:3005/api/v1/configurations', {
      productId: productId,
      productType: 'Loan',
      configuration: {
        purpose: 'Personal loan for home improvement',
        minimumFacilityAmount: 1000,
        maximumFacilityAmount: 50000,
        repaymentCycle: 'month',
        loanTenure: {
          value: 36,
          unit: 'month'
        },
        managementFee: 100,
        interestRate: 5.5,
        penalty: {
          type: 'percentage',
          value: 2.0
        },
        moratorium: {
          value: 3,
          unit: 'month'
        },
        minimumRepaymentAmount: 100,
        securityRequirements: ['property', 'other'],
        additionalSecurityRequirements: 'Guarantor required',
        eligibility: 'Must be employed with minimum monthly income of $2000',
        currency: 'USD',
        withdrawalPenalty: {
          type: 'percentage',
          value: 1.5
        }
      }
    });
    
    console.log('Configuration created:', configResponse.data);
    
    // Retrieve the configuration
    const getConfigResponse = await axios.get(`http://localhost:3005/api/v1/configurations/${productId}`);
    console.log('Configuration retrieved:', getConfigResponse.data);
    
  } catch (error) {
    console.error('Error:', error.response ? error.response.data : error.message);
  }
}

testConfiguration();