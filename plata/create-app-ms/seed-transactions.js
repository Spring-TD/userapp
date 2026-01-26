// Script to seed some sample transactions for testing
const { TransactionService } = require('./dist/services/transactionService');

async function seedTransactions() {
  console.log('Seeding sample transactions...');
  
  // Create sample transactions for testing
  const transactions = [
    {
      appId: 'test-app-1',
      amount: 100.50,
      currency: 'USD',
      type: 'credit',
      status: 'completed',
      description: 'Payment received from customer'
    },
    {
      appId: 'test-app-1',
      amount: 25.99,
      currency: 'USD',
      type: 'debit',
      status: 'completed',
      description: 'Service fee'
    },
    {
      appId: 'test-app-1',
      amount: 50.00,
      currency: 'USD',
      type: 'credit',
      status: 'pending',
      description: 'Pending refund'
    },
    {
      appId: 'test-app-2',
      amount: 200.00,
      currency: 'USD',
      type: 'credit',
      status: 'completed',
      description: 'Product sale'
    }
  ];

  for (const transactionData of transactions) {
    try {
      const transaction = await TransactionService.createTransaction(transactionData);
      console.log(`Created transaction: ${transaction.id}`);
    } catch (error) {
      console.error('Error creating transaction:', error);
    }
  }

  console.log('Transaction seeding completed!');
}

// Run the seeding function
seedTransactions().catch(console.error);