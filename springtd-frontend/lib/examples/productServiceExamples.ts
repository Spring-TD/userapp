/**
 * Product Service Usage Examples
 * 
 * Demonstrates how to use the enhanced product service in your components
 */

import productService, {
  ProductPricing,
  ProductConfiguration,
} from '../productService';

// ============================================================================
// Example 1: Product Lifecycle Management
// ============================================================================

export async function handleProductLifecycle(productId: string) {
  // Publish product (make it available)
  const publishResult = await productService.lifecycle.publishProduct(productId);
  if (publishResult.success) {
    console.log('Product published:', publishResult.data);
  }

  // Unpublish product (remove from public)
  const unpublishResult = await productService.lifecycle.unpublishProduct(productId);
  if (unpublishResult.success) {
    console.log('Product unpublished');
  }

  // Archive product
  const archiveResult = await productService.lifecycle.archiveProduct(productId);
  if (archiveResult.success) {
    console.log('Product archived');
  }

  // Restore archived product
  const restoreResult = await productService.lifecycle.restoreProduct(productId);
  if (restoreResult.success) {
    console.log('Product restored');
  }
}

// ============================================================================
// Example 2: Managing Product Subscribers (Active/Inactive Tabs)
// ============================================================================

export async function getProductSubscribersForTabs(productId: string) {
  // Get active subscribers
  const activeResult = await productService.subscribers.getActiveSubscribers(productId);
  const activeSubscribers = activeResult.success ? activeResult.data : [];

  // Get inactive subscribers
  const inactiveResult = await productService.subscribers.getInactiveSubscribers(productId);
  const inactiveSubscribers = inactiveResult.success ? inactiveResult.data : [];

  // Get all subscribers with pagination
  const allResult = await productService.subscribers.getProductSubscribers(productId, {
    limit: 50,
    offset: 0,
  });

  console.log('Active:', activeSubscribers?.length);
  console.log('Inactive:', inactiveSubscribers?.length);
  console.log('Total:', allResult.data?.total);

  return {
    active: activeSubscribers || [],
    inactive: inactiveSubscribers || [],
    total: allResult.data?.total || 0,
  };
}

// Add a subscriber to a product
export async function addSubscriberToProduct(productId: string, userId: string) {
  const result = await productService.subscribers.addSubscriber(productId, {
    userId,
    autoRenew: true,
    metadata: {
      source: 'dashboard',
      addedBy: 'merchant',
    },
  });

  if (result.success && result.data) {
    console.log('Subscriber added:', result.data.id);
    return result.data;
  } else {
    console.error('Failed to add subscriber:', result.error);
  }
}

// Update subscriber status (activate/deactivate)
export async function toggleSubscriberStatus(
  productId: string,
  subscriberId: string,
  currentStatus: 'active' | 'inactive'
) {
  const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
  
  const result = await productService.subscribers.updateSubscriberStatus(
    productId,
    subscriberId,
    newStatus
  );

  if (result.success) {
    console.log(`Subscriber ${newStatus}`);
    return result.data;
  }
}

// ============================================================================
// Example 3: Product Analytics Dashboard
// ============================================================================

export async function getProductDashboardData(productId: string) {
  // Get overall analytics
  const analyticsResult = await productService.analytics.getProductAnalytics(productId);
  
  if (analyticsResult.success && analyticsResult.data) {
    const analytics = analyticsResult.data;
    
    console.log('Total Subscribers:', analytics.totalSubscribers);
    console.log('Active Subscribers:', analytics.activeSubscribers);
    console.log('Churn Rate:', analytics.churnRate + '%');
    console.log('Total Revenue:', analytics.revenue.total);
    console.log('This Month Revenue:', analytics.revenue.thisMonth);
    
    return analytics;
  }
}

// Get usage metrics for charts
export async function getProductUsageChart(productId: string) {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 3); // Last 3 months

  const result = await productService.analytics.getProductUsage(productId, {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    groupBy: 'week',
  });

  if (result.success && result.data) {
    // Format data for charts
    const chartData = result.data.map(item => ({
      date: item.period,
      requests: item.requests,
      users: item.activeUsers,
      revenue: item.revenue,
    }));
    
    return chartData;
  }
}

// Get revenue breakdown
export async function getRevenueBreakdown(productId: string) {
  const result = await productService.analytics.getProductRevenue(productId, {
    startDate: new Date(new Date().getFullYear(), 0, 1).toISOString(), // Year start
    endDate: new Date().toISOString(),
  });

  if (result.success && result.data) {
    console.log('Total Revenue:', result.data.total);
    console.log('From Subscriptions:', result.data.breakdown.subscriptions);
    console.log('From One-time:', result.data.breakdown.oneTime);
    console.log('From Usage:', result.data.breakdown.usage);
    
    return result.data;
  }
}

// ============================================================================
// Example 4: User Subscriptions (User Dashboard)
// ============================================================================

export async function getUserProductSubscriptions() {
  // Get all active subscriptions
  const result = await productService.subscriptions.getUserSubscriptions({
    status: 'active',
  });

  if (result.success && result.data) {
    console.log('Active subscriptions:', result.data);
    return result.data;
  }
}

// Subscribe to a product
export async function subscribeToProduct(productId: string, paymentMethodId?: string) {
  const result = await productService.subscriptions.subscribeToProduct({
    productId,
    paymentMethodId,
    autoRenew: true,
  });

  if (result.success && result.data) {
    console.log('Subscription created:', result.data.id);
    console.log('Current period ends:', result.data.currentPeriodEnd);
    return result.data;
  } else {
    console.error('Failed to subscribe:', result.error);
  }
}

// Cancel subscription
export async function cancelProductSubscription(subscriptionId: string) {
  const result = await productService.subscriptions.cancelSubscription(subscriptionId);

  if (result.success && result.data) {
    console.log('Subscription cancelled:', result.data.cancelledAt);
    return result.data;
  }
}

// ============================================================================
// Example 5: Product Pricing Management
// ============================================================================

export async function updateProductPricing(productId: string) {
  const pricing: ProductPricing = {
    type: 'subscription',
    amount: 9900, // $99.00
    currency: 'USD',
    billingPeriod: 'monthly',
    trialDays: 14,
    setupFee: 0,
  };

  const result = await productService.pricing.updatePricing(productId, pricing);

  if (result.success && result.data) {
    console.log('Pricing updated:', result.data.pricing);
    return result.data;
  }
}

// Get current pricing
export async function getProductPricing(productId: string) {
  const result = await productService.pricing.getPricing(productId);

  if (result.success && result.data) {
    const pricing = result.data;
    console.log('Type:', pricing.type);
    console.log('Amount:', pricing.amount);
    console.log('Billing Period:', pricing.billingPeriod);
    console.log('Trial Days:', pricing.trialDays);
    
    return pricing;
  }
}

// ============================================================================
// Example 6: Product Access Control
// ============================================================================

export async function manageProductAccess(productId: string, userId: string) {
  // Check if user has access
  const checkResult = await productService.access.checkAccess(productId, userId);
  
  if (checkResult.success && checkResult.data) {
    if (checkResult.data.hasAccess) {
      console.log('User has access with permissions:', checkResult.data.permissions);
    } else {
      console.log('User does not have access');
    }
  }

  // Grant access with permissions
  const grantResult = await productService.access.grantAccess({
    productId,
    userId,
    permissions: ['read', 'write', 'execute'],
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
  });

  if (grantResult.success) {
    console.log('Access granted');
  }

  // Revoke access
  const revokeResult = await productService.access.revokeAccess(productId, userId);
  if (revokeResult.success) {
    console.log('Access revoked');
  }
}

// ============================================================================
// Example 7: Advanced Product Configuration
// ============================================================================

export async function configureProductFeatures(productId: string) {
  // Get full configuration
  const configResult = await productService.config.getFullConfiguration(productId);
  
  if (configResult.success && configResult.data) {
    console.log('Current config:', configResult.data);
  }

  // Update features
  const featuresResult = await productService.config.updateFeatures(productId, {
    'api_access': {
      enabled: true,
      config: {
        rateLimit: 1000,
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
      },
    },
    'webhook_notifications': {
      enabled: true,
      config: {
        events: ['user.created', 'payment.completed'],
      },
    },
    'advanced_analytics': {
      enabled: false,
    },
  });

  // Update limits
  const limitsResult = await productService.config.updateLimits(productId, {
    maxUsers: 1000,
    maxRequests: 100000,
    maxStorage: 10737418240, // 10 GB in bytes
  });

  // Add webhook
  const webhookResult = await productService.config.addWebhook(productId, {
    url: 'https://myapp.com/webhooks/product',
    events: ['subscriber.added', 'subscriber.removed', 'payment.completed'],
    secret: 'webhook_secret_key_123',
  });

  if (webhookResult.success) {
    console.log('Webhook configured');
  }
}

// ============================================================================
// Example 8: Product Detail Page Component Integration
// ============================================================================

export const ProductDetailPageExample = `
import { useState, useEffect } from 'react';
import productService from '@/lib/productService';

export function ProductDetailPage({ productId }) {
  const [product, setProduct] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [activeSubscribers, setActiveSubscribers] = useState([]);
  const [inactiveSubscribers, setInactiveSubscribers] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadProductData();
  }, [productId]);

  const loadProductData = async () => {
    // Load product details
    const productResult = await productService.basic.getProductById(productId);
    if (productResult.success) {
      setProduct(productResult.data);
    }

    // Load analytics
    const analyticsResult = await productService.analytics.getProductAnalytics(productId);
    if (analyticsResult.success) {
      setAnalytics(analyticsResult.data);
    }

    // Load subscribers based on active tab
    if (activeTab === 'active') {
      const activeResult = await productService.subscribers.getActiveSubscribers(productId);
      if (activeResult.success) {
        setActiveSubscribers(activeResult.data);
      }
    } else if (activeTab === 'inactive') {
      const inactiveResult = await productService.subscribers.getInactiveSubscribers(productId);
      if (inactiveResult.success) {
        setInactiveSubscribers(inactiveResult.data);
      }
    }
  };

  return (
    <div>
      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <h2>{product?.name}</h2>
          <p>Total Subscribers: {analytics?.totalSubscribers}</p>
          <p>Active: {analytics?.activeSubscribers}</p>
          <p>Revenue: {analytics?.revenue.total}</p>
        </div>
      )}

      {/* Active Subscribers Tab */}
      {activeTab === 'active' && (
        <div>
          <h3>Active Subscribers</h3>
          {activeSubscribers.map(subscriber => (
            <div key={subscriber.id}>
              {subscriber.userId} - {subscriber.status}
            </div>
          ))}
        </div>
      )}

      {/* Inactive Subscribers Tab */}
      {activeTab === 'inactive' && (
        <div>
          <h3>Inactive Subscribers</h3>
          {inactiveSubscribers.map(subscriber => (
            <div key={subscriber.id}>
              {subscriber.userId} - {subscriber.status}
            </div>
          ))}
        </div>
      )}

      {/* Configuration Tab */}
      {activeTab === 'configuration' && (
        <ProductConfiguration productId={productId} />
      )}
    </div>
  );
}
`;

// ============================================================================
// Example 9: Combining with Special API Service
// ============================================================================

export const CombinedProductDataExample = `
import productService from '@/lib/productService';
import specialApiService from '@/lib/specialApiService';

// Get comprehensive product data using both services
export async function getCompleteProductData(productId: string) {
  // Regular product data
  const productResult = await productService.basic.getProductById(productId);
  
  // Analytics from product service
  const analyticsResult = await productService.analytics.getProductAnalytics(productId);
  
  // Cross-merchant data from special API (requires API key)
  const specialResult = await specialApiService.products.getProductById(productId);
  
  // Combine all data
  return {
    product: productResult.data,
    analytics: analyticsResult.data,
    specialData: specialResult.data,
  };
}
`;

// ============================================================================
// Example 10: Complete Product Management Flow
// ============================================================================

export async function completeProductFlow(appId: string) {
  // 1. Create product
  const createResult = await productService.basic.createProduct({
    name: 'Premium Loan Product',
    description: 'Advanced loan management system',
    type: 'loan',
    appId,
  });

  if (!createResult.success) {
    console.error('Failed to create product');
    return;
  }

  const productId = createResult.data.id;
  console.log('Product created:', productId);

  // 2. Configure pricing
  await productService.pricing.updatePricing(productId, {
    type: 'subscription',
    amount: 49900,
    currency: 'NGN',
    billingPeriod: 'monthly',
    trialDays: 7,
  });

  // 3. Configure features and limits
  await productService.config.updateFeatures(productId, {
    'api_access': { enabled: true, config: { rateLimit: 5000 } },
    'webhooks': { enabled: true },
  });

  await productService.config.updateLimits(productId, {
    maxUsers: 500,
    maxRequests: 50000,
  });

  // 4. Publish product
  const publishResult = await productService.lifecycle.publishProduct(productId);
  console.log('Product published:', publishResult.success);

  // 5. Add initial subscribers
  const subscriber1 = await productService.subscribers.addSubscriber(productId, {
    userId: 'user_123',
    autoRenew: true,
  });

  console.log('Initial setup complete!');
  
  return productId;
}
