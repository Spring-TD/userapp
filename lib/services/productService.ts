/**
 * Product Service
 *
 * Enhanced product management service including:
 * - Basic CRUD (delegates to product-api.ts)
 * - Product subscriptions and subscribers
 * - Product lifecycle (publish/unpublish/archive)
 * - Product analytics and statistics
 * - Product pricing and billing rules
 * - Product access control
 * - Integration with Special API for merchant views
 *
 * Backend: same base as auth (NEXT_PUBLIC_API_URL), hitting `/api/v1/products/...`.
 */

import { productApi } from './product-api';
import { getAccessToken } from '@/lib/cookieAuth';

// Use the same base URL as the auth/account service
const PRODUCT_SERVICE_URL =
  (process.env.NEXT_PUBLIC_API_URL || 'https://account-ms.fly.dev').replace(/\/$/, '');

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface Product {
  id: string;
  name: string;
  description: string;
  type: string;
  appId: string;
  merchantId: string;
  status: 'draft' | 'active' | 'inactive' | 'archived';
  visibility: 'public' | 'private' | 'unlisted';
  pricing?: ProductPricing;
  configuration?: Record<string, any>;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  archivedAt?: string;
}

export interface ProductPricing {
  type: 'free' | 'one_time' | 'subscription' | 'usage_based';
  amount?: number;
  currency?: string;
  billingPeriod?: 'daily' | 'weekly' | 'monthly' | 'yearly';
  trialDays?: number;
  setupFee?: number;
}

export interface ProductSubscriber {
  id: string;
  userId: string;
  productId: string;
  status: 'active' | 'inactive' | 'suspended' | 'cancelled';
  startDate: string;
  endDate?: string;
  autoRenew: boolean;
  metadata?: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ProductSubscription {
  id: string;
  subscriberId: string;
  productId: string;
  appId: string;
  status: 'active' | 'past_due' | 'cancelled' | 'expired';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelledAt?: string;
  billingInfo?: {
    amount: number;
    currency: string;
    nextBillingDate?: string;
  };
  user?: {
    id: string;
    email: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface ProductAnalytics {
  productId: string;
  totalSubscribers: number;
  activeSubscribers: number;
  inactiveSubscribers: number;
  newSubscribersThisMonth: number;
  churnRate: number;
  revenue: {
    total: number;
    thisMonth: number;
    lastMonth: number;
    currency: string;
  };
  usage?: {
    totalRequests: number;
    activeUsers: number;
    averageRequestsPerUser: number;
  };
}

export interface ProductAccessControl {
  productId: string;
  userId: string;
  permissions: string[];
  expiresAt?: string;
  createdAt: string;
}

export interface ProductConfiguration {
  productId: string;
  settings: Record<string, any>;
  features: {
    [key: string]: {
      enabled: boolean;
      config?: Record<string, any>;
    };
  };
  limits?: {
    maxUsers?: number;
    maxRequests?: number;
    maxStorage?: number;
  };
  webhooks?: {
    url: string;
    events: string[];
    secret?: string;
  }[];
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
// Basic Product API (delegates to product-api.ts)
// ============================================================================

export const basicProductApi = {
  createProduct: productApi.createProduct,
  getProductsByAppId: productApi.getProductsByAppId,
  getProductById: productApi.getProductById,
  updateProduct: productApi.updateProduct,
  deleteProduct: productApi.deleteProduct,
  getProductConfiguration: productApi.getProductConfiguration,
  saveProductConfiguration: productApi.saveProductConfiguration,
};

// ============================================================================
// Product Lifecycle API
// ============================================================================

export const productLifecycleApi = {
  /**
   * Publish a product (make it available to users)
   */
  async publishProduct(productId: string): Promise<{
    success: boolean;
    data?: Product;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/publish`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to publish product');
      }

      return data;
    } catch (error: any) {
      console.error('Publish product error:', error);
      return {
        success: false,
        error: error.message || 'Failed to publish product',
      };
    }
  },

  /**
   * Unpublish a product (remove from public access)
   */
  async unpublishProduct(productId: string): Promise<{
    success: boolean;
    data?: Product;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/unpublish`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unpublish product');
      }

      return data;
    } catch (error: any) {
      console.error('Unpublish product error:', error);
      return {
        success: false,
        error: error.message || 'Failed to unpublish product',
      };
    }
  },

  /**
   * Archive a product (soft delete)
   */
  async archiveProduct(productId: string): Promise<{
    success: boolean;
    data?: Product;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/archive`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to archive product');
      }

      return data;
    } catch (error: any) {
      console.error('Archive product error:', error);
      return {
        success: false,
        error: error.message || 'Failed to archive product',
      };
    }
  },

  /**
   * Restore archived product
   */
  async restoreProduct(productId: string): Promise<{
    success: boolean;
    data?: Product;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/restore`, {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to restore product');
      }

      return data;
    } catch (error: any) {
      console.error('Restore product error:', error);
      return {
        success: false,
        error: error.message || 'Failed to restore product',
      };
    }
  },
};

// ============================================================================
// Product Subscribers API
// ============================================================================

export const productSubscribersApi = {
  /**
   * Get all subscribers for a product
   */
  async getProductSubscribers(
    productId: string,
    filter?: {
      status?: 'active' | 'inactive' | 'suspended' | 'cancelled';
      limit?: number;
      offset?: number;
    }
  ): Promise<{
    success: boolean;
    data?: { subscribers: ProductSubscriber[]; total: number };
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
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/subscribers?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscribers');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch subscribers error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch subscribers',
      };
    }
  },

  /**
   * Get active subscribers for a product
   */
  async getActiveSubscribers(productId: string): Promise<{
    success: boolean;
    data?: ProductSubscriber[];
    error?: string;
  }> {
    const result = await this.getProductSubscribers(productId, { status: 'active' });
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.subscribers,
      };
    }
    return {
      success: false,
      error: result.error,
    };
  },

  /**
   * Get inactive subscribers for a product
   */
  async getInactiveSubscribers(productId: string): Promise<{
    success: boolean;
    data?: ProductSubscriber[];
    error?: string;
  }> {
    const result = await this.getProductSubscribers(productId, { status: 'inactive' });
    if (result.success && result.data) {
      return {
        success: true,
        data: result.data.subscribers,
      };
    }
    return {
      success: false,
      error: result.error,
    };
  },

  /**
   * Add subscriber to product
   */
  async addSubscriber(
    productId: string,
    request: {
      userId: string;
      autoRenew?: boolean;
      metadata?: Record<string, any>;
    }
  ): Promise<{
    success: boolean;
    data?: ProductSubscriber;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/subscribers`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(request),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add subscriber');
      }

      return data;
    } catch (error: any) {
      console.error('Add subscriber error:', error);
      return {
        success: false,
        error: error.message || 'Failed to add subscriber',
      };
    }
  },

  /**
   * Remove subscriber from product
   */
  async removeSubscriber(productId: string, subscriberId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/subscribers/${subscriberId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove subscriber');
      }

      return data;
    } catch (error: any) {
      console.error('Remove subscriber error:', error);
      return {
        success: false,
        error: error.message || 'Failed to remove subscriber',
      };
    }
  },

  /**
   * Update subscriber status
   */
  async updateSubscriberStatus(
    productId: string,
    subscriberId: string,
    status: 'active' | 'inactive' | 'suspended'
  ): Promise<{
    success: boolean;
    data?: ProductSubscriber;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/subscribers/${subscriberId}/status`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update subscriber status');
      }

      return data;
    } catch (error: any) {
      console.error('Update subscriber status error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update subscriber status',
      };
    }
  },
};

// ============================================================================
// Product Subscriptions API (User's perspective)
// ============================================================================

export const productSubscriptionsApi = {
  /**
   * Get user's subscriptions
   */
  async getUserSubscriptions(filter?: {
    status?: 'active' | 'past_due' | 'cancelled' | 'expired';
    productId?: string;
  }): Promise<{
    success: boolean;
    data?: ProductSubscription[];
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
        `${PRODUCT_SERVICE_URL}/api/v1/subscriptions?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch subscriptions');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch subscriptions error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch subscriptions',
      };
    }
  },

  /**
   * Subscribe to a product
   */
  async subscribeToProduct(request: {
    productId: string;
    paymentMethodId?: string;
    autoRenew?: boolean;
  }): Promise<{
    success: boolean;
    data?: ProductSubscription;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/v1/subscriptions`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to subscribe to product');
      }

      return data;
    } catch (error: any) {
      console.error('Subscribe error:', error);
      return {
        success: false,
        error: error.message || 'Failed to subscribe to product',
      };
    }
  },

  /**
   * Cancel subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<{
    success: boolean;
    data?: ProductSubscription;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/subscriptions/${subscriptionId}/cancel`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription');
      }

      return data;
    } catch (error: any) {
      console.error('Cancel subscription error:', error);
      return {
        success: false,
        error: error.message || 'Failed to cancel subscription',
      };
    }
  },

  /**
   * Renew subscription
   */
  async renewSubscription(subscriptionId: string): Promise<{
    success: boolean;
    data?: ProductSubscription;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/subscriptions/${subscriptionId}/renew`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to renew subscription');
      }

      return data;
    } catch (error: any) {
      console.error('Renew subscription error:', error);
      return {
        success: false,
        error: error.message || 'Failed to renew subscription',
      };
    }
  },
};

// ============================================================================
// Product Analytics API
// ============================================================================

export const productAnalyticsApi = {
  /**
   * Get product analytics/statistics
   */
  async getProductAnalytics(productId: string): Promise<{
    success: boolean;
    data?: ProductAnalytics;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/analytics`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch analytics');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch analytics error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch analytics',
      };
    }
  },

  /**
   * Get product usage metrics
   */
  async getProductUsage(
    productId: string,
    filter?: {
      startDate?: string;
      endDate?: string;
      groupBy?: 'day' | 'week' | 'month';
    }
  ): Promise<{
    success: boolean;
    data?: {
      period: string;
      requests: number;
      activeUsers: number;
      revenue: number;
    }[];
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
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/usage?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage data');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch usage error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch usage data',
      };
    }
  },

  /**
   * Get product revenue breakdown
   */
  async getProductRevenue(
    productId: string,
    filter?: {
      startDate?: string;
      endDate?: string;
    }
  ): Promise<{
    success: boolean;
    data?: {
      total: number;
      currency: string;
      breakdown: {
        subscriptions: number;
        oneTime: number;
        usage: number;
      };
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
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/revenue?${queryParams.toString()}`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch revenue data');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch revenue error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch revenue data',
      };
    }
  },
};

// ============================================================================
// Product Access Control API
// ============================================================================

export const productAccessApi = {
  /**
   * Grant user access to product
   */
  async grantAccess(request: {
    productId: string;
    userId: string;
    permissions: string[];
    expiresAt?: string;
  }): Promise<{
    success: boolean;
    data?: ProductAccessControl;
    error?: string;
  }> {
    try {
      const response = await fetch(`${PRODUCT_SERVICE_URL}/api/v1/products/access/grant`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(request),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to grant access');
      }

      return data;
    } catch (error: any) {
      console.error('Grant access error:', error);
      return {
        success: false,
        error: error.message || 'Failed to grant access',
      };
    }
  },

  /**
   * Revoke user access from product
   */
  async revokeAccess(productId: string, userId: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/access/${userId}`,
        {
          method: 'DELETE',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke access');
      }

      return data;
    } catch (error: any) {
      console.error('Revoke access error:', error);
      return {
        success: false,
        error: error.message || 'Failed to revoke access',
      };
    }
  },

  /**
   * Check if user has access to product
   */
  async checkAccess(productId: string, userId: string): Promise<{
    success: boolean;
    data?: { hasAccess: boolean; permissions: string[] };
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/access/${userId}/check`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to check access');
      }

      return data;
    } catch (error: any) {
      console.error('Check access error:', error);
      return {
        success: false,
        error: error.message || 'Failed to check access',
      };
    }
  },
};

// ============================================================================
// Product Pricing API
// ============================================================================

export const productPricingApi = {
  /**
   * Update product pricing
   */
  async updatePricing(productId: string, pricing: ProductPricing): Promise<{
    success: boolean;
    data?: Product;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/pricing`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify(pricing),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update pricing');
      }

      return data;
    } catch (error: any) {
      console.error('Update pricing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update pricing',
      };
    }
  },

  /**
   * Get product pricing details
   */
  async getPricing(productId: string): Promise<{
    success: boolean;
    data?: ProductPricing;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/pricing`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch pricing');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch pricing error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch pricing',
      };
    }
  },
};

// ============================================================================
// Advanced Configuration API
// ============================================================================

export const productConfigApi = {
  /**
   * Get full product configuration
   */
  async getFullConfiguration(productId: string): Promise<{
    success: boolean;
    data?: ProductConfiguration;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/config/full`,
        {
          method: 'GET',
          headers: getAuthHeaders(),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch configuration');
      }

      return data;
    } catch (error: any) {
      console.error('Fetch configuration error:', error);
      return {
        success: false,
        error: error.message || 'Failed to fetch configuration',
      };
    }
  },

  /**
   * Update product features
   */
  async updateFeatures(
    productId: string,
    features: ProductConfiguration['features']
  ): Promise<{
    success: boolean;
    data?: ProductConfiguration;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/config/features`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ features }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update features');
      }

      return data;
    } catch (error: any) {
      console.error('Update features error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update features',
      };
    }
  },

  /**
   * Update product limits
   */
  async updateLimits(
    productId: string,
    limits: ProductConfiguration['limits']
  ): Promise<{
    success: boolean;
    data?: ProductConfiguration;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/config/limits`,
        {
          method: 'PUT',
          headers: getAuthHeaders(),
          body: JSON.stringify({ limits }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update limits');
      }

      return data;
    } catch (error: any) {
      console.error('Update limits error:', error);
      return {
        success: false,
        error: error.message || 'Failed to update limits',
      };
    }
  },

  /**
   * Add webhook configuration
   */
  async addWebhook(
    productId: string,
    webhook: { url: string; events: string[]; secret?: string }
  ): Promise<{
    success: boolean;
    data?: ProductConfiguration;
    error?: string;
  }> {
    try {
      const response = await fetch(
        `${PRODUCT_SERVICE_URL}/api/v1/products/${productId}/config/webhooks`,
        {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify(webhook),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add webhook');
      }

      return data;
    } catch (error: any) {
      console.error('Add webhook error:', error);
      return {
        success: false,
        error: error.message || 'Failed to add webhook',
      };
    }
  },
};

// ============================================================================
// Default Export
// ============================================================================

const productService = {
  // Basic CRUD (from product-api.ts)
  basic: basicProductApi,
  
  // Lifecycle management
  lifecycle: productLifecycleApi,
  
  // Subscribers (merchant view)
  subscribers: productSubscribersApi,
  
  // Subscriptions (user view)
  subscriptions: productSubscriptionsApi,
  
  // Analytics & statistics
  analytics: productAnalyticsApi,
  
  // Access control
  access: productAccessApi,
  
  // Pricing management
  pricing: productPricingApi,
  
  // Advanced configuration
  config: productConfigApi,
};

export default productService;
