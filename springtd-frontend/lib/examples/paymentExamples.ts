/**
 * Payment Service Usage Examples
 * 
 * Demonstrates how to use the payment service in your components
 */

import paymentService, {
  PaymentInitiationRequest,
  CardPaymentRequest,
  BankTransferPaymentRequest,
  PaymentHistoryFilter,
} from '../paymentService';

// ============================================================================
// Example 1: Card Payment Flow
// ============================================================================

export async function handleCardPayment() {
  const cardRequest: CardPaymentRequest = {
    amount: 50000, // Amount in smallest currency unit (e.g., kobo for NGN)
    currency: 'NGN',
    cardNumber: '5060990580000217499',
    expiryMonth: '12',
    expiryYear: '26',
    cvv: '123',
    cardholderName: 'John Doe',
    saveCard: true,
    description: 'Product subscription payment',
    productId: 'prod_123',
    metadata: {
      customerEmail: 'john@example.com',
      orderId: 'ORD-12345',
    },
  };

  const result = await paymentService.initiation.initiateCardPayment(cardRequest);

  if (result.success && result.data) {
    console.log('Payment initiated:', result.data.reference);
    console.log('Payment URL:', result.data.paymentUrl);

    // Poll for payment status or wait for webhook
    await verifyPaymentStatus(result.data.reference);
  } else {
    console.error('Payment failed:', result.error);
  }
}

// ============================================================================
// Example 2: Bank Transfer Flow
// ============================================================================

export async function handleBankTransferPayment() {
  const transferRequest: BankTransferPaymentRequest = {
    amount: 100000,
    currency: 'NGN',
    description: 'App creation fee',
    appId: 'app_123',
    metadata: {
      purpose: 'subscription',
    },
  };

  const result = await paymentService.initiation.initiateBankTransfer(transferRequest);

  if (result.success && result.data) {
    const { payment, bankDetails } = result.data;
    
    console.log('Bank Transfer Details:');
    console.log('Account Name:', bankDetails.accountName);
    console.log('Account Number:', bankDetails.accountNumber);
    console.log('Bank Name:', bankDetails.bankName);
    console.log('Reference:', bankDetails.reference);
    console.log('Amount:', bankDetails.amount);
    console.log('Expires At:', bankDetails.expiresAt);

    // Display these details to the user
    // They will need to transfer to this account with the reference
    
    return bankDetails;
  } else {
    console.error('Failed to initiate transfer:', result.error);
  }
}

// ============================================================================
// Example 3: Wallet Payment Flow
// ============================================================================

export async function handleWalletPayment() {
  const result = await paymentService.initiation.initiateWalletPayment({
    amount: 25000,
    currency: 'NGN',
    description: 'Product purchase',
    productId: 'prod_456',
  });

  if (result.success && result.data) {
    console.log('Payment completed:', result.data.payment);
    return result.data.payment;
  } else {
    console.error('Wallet payment failed:', result.error);
    // User might not have sufficient balance
  }
}

// ============================================================================
// Example 4: Payment Verification
// ============================================================================

export async function verifyPaymentStatus(reference: string) {
  const result = await paymentService.verification.verifyPayment({ reference });

  if (result.success && result.data) {
    const { payment, verified } = result.data;
    
    if (verified && payment.status === 'completed') {
      console.log('Payment successful!');
      // Update your UI, grant access, etc.
      return true;
    } else if (payment.status === 'failed') {
      console.log('Payment failed');
      return false;
    } else {
      console.log('Payment still pending');
      // Continue polling or wait for webhook
      return null;
    }
  } else {
    console.error('Verification failed:', result.error);
    return false;
  }
}

// ============================================================================
// Example 5: Get Payment History with Filters
// ============================================================================

export async function getRecentPayments() {
  const filter: PaymentHistoryFilter = {
    status: 'completed',
    limit: 10,
    offset: 0,
  };

  const result = await paymentService.history.getPayments(filter);

  if (result.success && result.data) {
    console.log('Recent payments:', result.data.payments);
    console.log('Total:', result.data.total);
    console.log('Has more:', result.data.hasMore);
    return result.data.payments;
  } else {
    console.error('Failed to fetch payments:', result.error);
    return [];
  }
}

// ============================================================================
// Example 6: Get Payment Statistics for Dashboard
// ============================================================================

export async function getPaymentDashboardData() {
  // Get last 30 days stats
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  const result = await paymentService.history.getPaymentStats({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  if (result.success && result.data) {
    console.log('Total Amount:', result.data.totalAmount);
    console.log('Total Payments:', result.data.totalPayments);
    console.log('Success Rate:', 
      (result.data.successfulPayments / result.data.totalPayments * 100).toFixed(2) + '%'
    );
    console.log('By Method:', result.data.byPaymentMethod);
    
    return result.data;
  } else {
    console.error('Failed to fetch stats:', result.error);
  }
}

// ============================================================================
// Example 7: Manage Payment Methods
// ============================================================================

export async function manageSavedCards() {
  // Get all saved payment methods
  const methodsResult = await paymentService.methods.getPaymentMethods();

  if (methodsResult.success && methodsResult.data) {
    const savedCards = methodsResult.data;
    console.log('Saved cards:', savedCards);

    // Use a saved card for payment
    const defaultCard = savedCards.find(card => card.isDefault);
    if (defaultCard) {
      console.log('Default card:', defaultCard.details.last4);
    }

    return savedCards;
  }
}

export async function addNewCard() {
  const result = await paymentService.methods.addPaymentMethod({
    type: 'card',
    cardNumber: '5060990580000217499',
    expiryMonth: '12',
    expiryYear: '28',
    cardholderName: 'Jane Doe',
    setAsDefault: true,
  });

  if (result.success && result.data) {
    console.log('Card added:', result.data.id);
    return result.data;
  } else {
    console.error('Failed to add card:', result.error);
  }
}

export async function deleteCard(methodId: string) {
  const result = await paymentService.methods.deletePaymentMethod(methodId);

  if (result.success) {
    console.log('Card deleted successfully');
  } else {
    console.error('Failed to delete card:', result.error);
  }
}

// ============================================================================
// Example 8: Poll Payment Status (for UI)
// ============================================================================

export async function pollPaymentStatus(
  reference: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<'completed' | 'failed' | 'timeout'> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const result = await paymentService.verification.getPaymentStatus(reference);

    if (result.success && result.data) {
      const status = result.data.status;

      if (status === 'completed') {
        return 'completed';
      } else if (status === 'failed' || status === 'cancelled') {
        return 'failed';
      }
      // Status is 'pending' or 'processing', continue polling
    }

    // Wait before next poll
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }

  return 'timeout';
}

// ============================================================================
// Example 9: React Component Integration
// ============================================================================

export const PaymentComponentExample = `
import { useState } from 'react';
import paymentService from '@/lib/paymentService';

export function PaymentDrawer({ amount, productId, onSuccess, onClose }) {
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [bankDetails, setBankDetails] = useState(null);

  const handleCardPayment = async (cardData) => {
    setLoading(true);
    try {
      const result = await paymentService.initiation.initiateCardPayment({
        amount,
        productId,
        ...cardData,
      });

      if (result.success && result.data) {
        // Verify payment
        const verified = await verifyPaymentStatus(result.data.reference);
        if (verified) {
          onSuccess(result.data.payment);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const handleBankTransfer = async () => {
    setLoading(true);
    try {
      const result = await paymentService.initiation.initiateBankTransfer({
        amount,
        productId,
      });

      if (result.success && result.data) {
        setBankDetails(result.data.bankDetails);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      {/* Payment method selector */}
      {/* Card form or bank transfer details */}
    </div>
  );
}
`;

// ============================================================================
// Example 10: Webhook Handler (for API route)
// ============================================================================

export const WebhookHandlerExample = `
// app/api/webhooks/payment/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { paymentWebhookApi } from '@/lib/paymentService';

export async function POST(request: NextRequest) {
  try {
    const signature = request.headers.get('x-payment-signature');
    const payload = await request.text();
    
    // Verify webhook signature
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET!;
    const isValid = paymentWebhookApi.verifyWebhookSignature(
      payload,
      signature,
      webhookSecret
    );

    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 401 }
      );
    }

    // Process webhook
    const webhookPayload = JSON.parse(payload);
    const result = await paymentWebhookApi.processWebhook(webhookPayload);

    // Update your database, send notifications, etc.
    if (webhookPayload.event === 'payment.completed') {
      // Grant user access to product
      await grantProductAccess(webhookPayload.payment);
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    );
  }
}
`;
