/**
 * Payment Service
 * 
 * Comprehensive wrapper for all payment operations including:
 * - Payment initiation (card, bank transfer)
 * - Payment verification
 * - Payment history and tracking
 * - Payment methods management
 * - Webhook handling
 * 
 * Backend: payment-ms (https://payment-ms.fly.dev)
 */

const PAYMENT_SERVICE_URL = process.env.NEXT_PUBLIC_PAYMENT_SERVICE_URL?.replace(/\/$/, '') || 'https://payment-ms.fly.dev';

import { getAccessToken } from '@/lib/cookieAuth';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface PaymentMethod {
  id: string;
  type: 'card' | 'bank_transfer' | 'wallet';
  name: string;
  details: {
    last4?: string;
    brand?: string;
    expiryMonth?: string;
    expiryYear?: string;
    bankName?: string;
    accountNumber?: string;
  };
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Payment {
  id: string;
  reference: string;
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentMethod: 'card' | 'bank_transfer' | 'wallet';
  merchantId: string;
  userId: string;
  appId?: string;
  productId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface PaymentInitiationRequest {
  amount: number;
  currency?: string;
  paymentMethod: 'card' | 'bank_transfer' | 'wallet';
  description?: string;
  appId?: string;
  productId?: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}

export interface PaymentInitiationResponse {
  success: boolean;
  data?: {
    payment: Payment;
    paymentUrl?: string;
    reference: string;
  };
  error?: string;
}

export interface CardPaymentRequest {
  amount: number;
  currency?: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  cvv: string;
  cardholderName: string;
  saveCard?: boolean;
  description?: string;
  appId?: string;
  productId?: string;
  metadata?: Record<string, any>;
}

export interface BankTransferPaymentRequest {
  amount: number;
  currency?: string;
  description?: string;
  appId?: string;
  productId?: string;
  metadata?: Record<string, any>;
}

export interface BankTransferDetails {
  accountName: string;
  accountNumber: string;
  bankName: string;
  reference: string;
  amount: number;
  expiresAt: string;
}

export interface PaymentVerificationRequest {
  reference: string;
  transactionId?: string;
}

export interface PaymentVerificationResponse {
  success: boolean;
  data?: {
    payment: Payment;
    verified: boolean;
    message?: string;
  };
  error?: string;
}

export interface PaymentHistoryFilter {
  status?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';
  paymentMethod?: 'card' | 'bank_transfer' | 'wallet';
  startDate?: string;
  endDate?: string;
  appId?: string;
  productId?: string;
  limit?: number;
  offset?: number;
}

export interface PaymentWebhookPayload {
  event: 'payment.created' | 'payment.processing' | 'payment.completed' | 'payment.failed';
  payment: Payment;
  timestamp: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

function getAuthHeaders(): HeadersInit {
  const token = typeof window !== 'undefined' ? getAccessToken() : null;
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
}

// ============================================================================
// Payment Initiation API
// ============================================================================

export const paymentInitiationApi = {
  /**
   * Initiate a new payment
   */
  async initiatePayment(request: PaymentInitiationRequest): Promise<PaymentInitiationResponse> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payments/initiate`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate payment');
      }

      return data;
    } catch (error: any) {
      console.error('Payment initiation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate payment',
      };
    }
  },

  /**
   * Initiate card payment with card details
   */
  async initiateCardPayment(request: CardPaymentRequest): Promise<PaymentInitiationResponse> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payments/card`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process card payment');
      }

      return data;
    } catch (error: any) {
      console.error('Card payment error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process card payment',
      };
    }
  },

  /**
   * Initiate bank transfer payment and get account details
   */
  async initiateBankTransfer(request: BankTransferPaymentRequest): Promise<{
    success: boolean;
    data?: { payment: Payment; bankDetails: BankTransferDetails };
    error?: string;
  }> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payments/bank-transfer`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to initiate bank transfer');
      }

      return data;
    } catch (error: any) {
      console.error('Bank transfer initiation error:', error);
      return {
        success: false,
        error: error.message || 'Failed to initiate bank transfer',
      };
    }
  },

  /**
   * Initiate wallet payment (deduct from user wallet)
   */
  async initiateWalletPayment(request: Omit<PaymentInitiationRequest, 'paymentMethod'>): Promise<PaymentInitiationResponse> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payments/wallet`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process wallet payment');
      }

      return data;
    } catch (error: any) {
      console.error('Wallet payment error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process wallet payment',
      };
    }
  },
};

// ============================================================================
// Payment Verification API
// ============================================================================

export const paymentVerificationApi = {
  /**
   * Verify a payment by reference
   */
  async verifyPayment(request: PaymentVerificationRequest): Promise<PaymentVerificationResponse> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payments/verify`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to verify payment');
      }

      return data;
    } catch (error: any) {
      console.error('Payment verification error:', error);
      return {
        success: false,
        error: error.message || 'Failed to verify payment',
      };
    }
  },

  /**
   * Get payment status by reference
   */
  async getPaymentStatus(reference: string): Promise<{
    success: boolean;
    data?: Payment;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payments/status/${reference}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to get payment status');
      }

      return data;
    } catch (error: any) {
      console.error('Get payment status error:', error);
      return {
        success: false,
        error: error.message || 'Failed to get payment status',
      };
    }
  },
};

// ============================================================================
// Payment History API
// ============================================================================

export const paymentHistoryApi = {
  /**
   * Get payment history with optional filters
   */
  async getPayments(filter?: PaymentHistoryFilter): Promise<{
    success: boolean;
    data?: { payments: Payment[]; total: number; hasMore: boolean };
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(
        `${PAYMENT_SERVICE_URL}/api/v1/payments?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment history');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch payment history error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment history',
      };
    }
  },

  /**
   * Get payment by ID
   */
  async getPaymentById(paymentId: string): Promise<{
    success: boolean;
    data?: Payment;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payments/${paymentId}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch payment error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment',
      };
    }
  },

  /**
   * Get payment statistics
   */
  async getPaymentStats(filter?: { startDate?: string; endDate?: string }): Promise<{
    success: boolean;
    data?: {
      totalAmount: number;
      totalPayments: number;
      successfulPayments: number;
      failedPayments: number;
      pendingPayments: number;
      byPaymentMethod: Record<string, { count: number; amount: number }>;
    };
    error?: string;
  }> {
    try {
      const queryParams = new URLSearchParams();
      if (filter) {
        Object.entries(filter).forEach(([key, value]) => {
          if (value !== undefined) {
            queryParams.append(key, String(value));
          }
        });
      }

      const response = await fetch(
        `${PAYMENT_SERVICE_URL}/api/v1/payments/stats?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment statistics');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch payment stats error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment statistics',
      };
    }
  },
};

// ============================================================================
// Payment Methods API
// ============================================================================

export const paymentMethodsApi = {
  /**
   * Get saved payment methods
   */
  async getPaymentMethods(): Promise<{
    success: boolean;
    data?: PaymentMethod[];
    error?: string;
  }> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payment-methods`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch payment methods');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch payment methods error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch payment methods',
      };
    }
  },

  /**
   * Add new payment method (card)
   */
  async addPaymentMethod(request: {
    type: 'card';
    cardNumber: string;
    expiryMonth: string;
    expiryYear: string;
    cardholderName: string;
    setAsDefault?: boolean;
  }): Promise<{
    success: boolean;
    data?: PaymentMethod;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payment-methods`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add payment method');
      }

      return data;
    } catch (error: any) {
      console.error('Add payment method error:', error);
      return {
        success: false,
        error: error.message || 'Failed to add payment method',
      };
    }
  },

  /**
   * Delete payment method
   */
  async deletePaymentMethod(methodId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PAYMENT_SERVICE_URL}/api/v1/payment-methods/${methodId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete payment method');
      }

      return data;
    } catch (error: any) {
      console.error('Delete payment method error:', error);
      return {
        success: false,
        error: error.message || 'Failed to delete payment method',
      };
    }
  },

  /**
   * Set default payment method
   */
  async setDefaultPaymentMethod(methodId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PAYMENT_SERVICE_URL}/api/v1/payment-methods/${methodId}/set-default`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to set default payment method');
      }

      return data;
    } catch (error: any) {
      console.error('Set default payment method error:', error);
      return {
        success: false,
        error: error.message || 'Failed to set default payment method',
      };
    }
  },
};

// ============================================================================
// Webhook API
// ============================================================================

export const paymentWebhookApi = {
  /**
   * Verify webhook signature
   */
  verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
    // Implement webhook signature verification based on your payment provider
    // This is a placeholder implementation
    try {
      // Example: HMAC-SHA256 verification
      const crypto = require('crypto');
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
      return signature === expectedSignature;
    } catch (error) {
      console.error('Webhook signature verification error:', error);
      return false;
    }
  },

  /**
   * Process payment webhook
   */
  async processWebhook(payload: PaymentWebhookPayload): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      // Handle different webhook events (payment.created | processing | completed | failed)
      void payload.event;

      return {
        success: true,
        message: 'Webhook processed successfully',
      };
    } catch (error: any) {
      console.error('Process webhook error:', error);
      return {
        success: false,
        error: error.message || 'Failed to process webhook',
      };
    }
  },
};

// ============================================================================
// Default Export
// ============================================================================

const paymentService = {
  initiation: paymentInitiationApi,
  verification: paymentVerificationApi,
  history: paymentHistoryApi,
  methods: paymentMethodsApi,
  webhook: paymentWebhookApi,
};

export default paymentService;
