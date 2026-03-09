/**
 * Special API Service Usage Examples
 * 
 * This file demonstrates how to use the Special API Service
 * to access advanced merchant features like user subscriptions,
 * product analytics, and transaction tracking.
 */

import specialApiService from '@/lib/specialApiService';

// ============================================
// PRODUCT ANALYTICS
// ============================================

/**
 * Get all subscribers for a product (Active/Inactive loans, savings, etc.)
 * Use this in product detail pages to show active and inactive subscriptions
 */
export async function getProductSubscribers(productId: string) {
  try {
    const response = await specialApiService.products.getProductSubscribers(productId);
    
    if (response.success && response.data) {
      // Filter active vs inactive
      const activeSubscribers = response.data.filter(sub => sub.status === 'ACTIVE');
      const inactiveSubscribers = response.data.filter(sub => sub.status === 'INACTIVE');
      
      return {
        active: activeSubscribers,
        inactive: inactiveSubscribers,
        total: response.data.length
      };
    }
    
    return { active: [], inactive: [], total: 0 };
  } catch (error) {
    console.error('Error fetching product subscribers:', error);
    throw error;
  }
}

/**
 * Get all applications for a product (loan applications, etc.)
 */
export async function getProductApplications(productId: string) {
  try {
    const response = await specialApiService.applications.getAllProductApplications(productId);
    
    if (response.success && response.data) {
      const pending = response.data.filter(app => app.status === 'PENDING');
      const approved = response.data.filter(app => app.status === 'APPROVED');
      const rejected = response.data.filter(app => app.status === 'REJECTED');
      
      return { pending, approved, rejected, total: response.data.length };
    }
    
    return { pending: [], approved: [], rejected: [], total: 0 };
  } catch (error) {
    console.error('Error fetching product applications:', error);
    throw error;
  }
}

/**
 * Get all documents/files for a product (Drive tab)
 */
export async function getProductDocuments(productId: string) {
  try {
    const response = await specialApiService.drive.getDriveByProducts(productId);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching product documents:', error);
    throw error;
  }
}

/**
 * Get transaction history for a product
 */
export async function getProductTransactions(productId: string) {
  try {
    const response = await specialApiService.transactions.getAllTransactionHistoryByProduct(productId);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching product transactions:', error);
    throw error;
  }
}

// ============================================
// USER MANAGEMENT
// ============================================

/**
 * Create a new user with wallet
 */
export async function createUserWithWallet(userData: {
  email: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  merchantId: string;
}) {
  try {
    const response = await specialApiService.users.createUserAndWallet(userData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to create user');
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
}

/**
 * Get all users in the system
 */
export async function getAllUsers() {
  try {
    const response = await specialApiService.users.getAllUsers();
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching users:', error);
    throw error;
  }
}

/**
 * Get user wallet balance
 */
export async function getUserWalletBalance(userId: string) {
  try {
    const response = await specialApiService.wallets.getUserWallet(userId);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching user wallet:', error);
    throw error;
  }
}

// ============================================
// MERCHANT DASHBOARD
// ============================================

/**
 * Get merchant wallet balances (Treasury, Operation, KYC)
 */
export async function getMerchantWalletBalances(merchantId: string) {
  try {
    const [treasury, operation, kyc] = await Promise.all([
      specialApiService.wallets.getMerchantWalletBalance(merchantId, 'TREASURY'),
      specialApiService.wallets.getMerchantWalletBalance(merchantId, 'OPERATION'),
      specialApiService.wallets.getMerchantWalletBalance(merchantId, 'KYC'),
    ]);
    
    return {
      treasury: treasury.success ? treasury.data : null,
      operation: operation.success ? operation.data : null,
      kyc: kyc.success ? kyc.data : null,
    };
  } catch (error) {
    console.error('Error fetching merchant wallet balances:', error);
    throw error;
  }
}

/**
 * Get merchant wallet transaction history
 */
export async function getMerchantWalletHistory(
  merchantId: string,
  walletType: 'TREASURY' | 'OPERATION' | 'KYC'
) {
  try {
    const response = await specialApiService.wallets.getMerchantWalletHistory(
      merchantId,
      walletType
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return null;
  } catch (error) {
    console.error('Error fetching wallet history:', error);
    throw error;
  }
}

/**
 * Get all users' wallets for a merchant
 */
export async function getAllUserWallets(merchantId: string) {
  try {
    const response = await specialApiService.wallets.getAllUsersWallets(merchantId);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching user wallets:', error);
    throw error;
  }
}

// ============================================
// SUBSCRIPTIONS
// ============================================

/**
 * Subscribe a user to a product
 */
export async function subscribeUserToProduct(
  userId: string,
  productId: string,
  startDate?: string,
  endDate?: string
) {
  try {
    const response = await specialApiService.subscriptions.subscribeUserToProduct(
      userId,
      productId,
      { startDate, endDate }
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to subscribe user');
  } catch (error) {
    console.error('Error subscribing user to product:', error);
    throw error;
  }
}

/**
 * Check if user has active subscription to a product
 */
export async function checkUserSubscription(userId: string, productId: string) {
  try {
    const response = await specialApiService.subscriptions.getUserProductSubscription(
      userId,
      productId
    );
    
    if (response.success && response.data) {
      return response.data.status === 'ACTIVE';
    }
    
    return false;
  } catch (error) {
    console.error('Error checking user subscription:', error);
    return false;
  }
}

// ============================================
// APPLICATIONS
// ============================================

/**
 * Submit user application to a product (loan application, etc.)
 */
export async function submitProductApplication(
  userId: string,
  productId: string,
  applicationData: any
) {
  try {
    const response = await specialApiService.applications.applyToProduct(
      userId,
      productId,
      applicationData
    );
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to submit application');
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
}

// ============================================
// TRANSACTIONS
// ============================================

/**
 * Get user transaction history
 */
export async function getUserTransactionHistory(userId: string) {
  try {
    const response = await specialApiService.transactions.getTransactionHistoryForUser(userId);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    throw error;
  }
}

/**
 * Get app transaction history
 */
export async function getAppTransactionHistory(appId: string) {
  try {
    const response = await specialApiService.transactions.getTransactionHistoryByApp(appId);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching app transactions:', error);
    throw error;
  }
}

// ============================================
// DOCUMENTS
// ============================================

/**
 * Submit document for a user
 */
export async function submitUserDocument(
  userId: string,
  documentData: {
    fileName: string;
    fileType: string;
    fileSize: number;
    fileUrl: string;
    productId?: string;
  }
) {
  try {
    const response = await specialApiService.drive.submitDocsForUser(userId, documentData);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    throw new Error(response.error || 'Failed to submit document');
  } catch (error) {
    console.error('Error submitting document:', error);
    throw error;
  }
}

/**
 * Get all documents for a user
 */
export async function getUserDocuments(userId: string) {
  try {
    const response = await specialApiService.drive.getDriveByUser(userId);
    
    if (response.success && response.data) {
      return response.data;
    }
    
    return [];
  } catch (error) {
    console.error('Error fetching user documents:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE: PRODUCT DETAIL PAGE INTEGRATION
// ============================================

/**
 * Get all data needed for product detail page
 * This combines multiple API calls to show:
 * - Active subscriptions
 * - Inactive subscriptions
 * - Documents (Drive)
 * - Pending applications
 * - Transaction history
 */
export async function getProductDetailData(productId: string) {
  try {
    const [subscribers, applications, documents, transactions] = await Promise.all([
      getProductSubscribers(productId),
      getProductApplications(productId),
      getProductDocuments(productId),
      getProductTransactions(productId),
    ]);
    
    return {
      active: subscribers.active,
      inactive: subscribers.inactive,
      pending: applications.pending,
      documents,
      transactions,
      stats: {
        totalSubscribers: subscribers.total,
        activeCount: subscribers.active.length,
        inactiveCount: subscribers.inactive.length,
        pendingApplications: applications.pending.length,
        totalDocuments: documents.length,
        totalTransactions: transactions.length,
      },
    };
  } catch (error) {
    console.error('Error fetching product detail data:', error);
    throw error;
  }
}

// ============================================
// EXAMPLE: MERCHANT DASHBOARD OVERVIEW
// ============================================

/**
 * Get overview data for merchant dashboard
 */
export async function getMerchantDashboardOverview(merchantId: string) {
  try {
    const [walletBalances, userWallets, allProducts] = await Promise.all([
      getMerchantWalletBalances(merchantId),
      getAllUserWallets(merchantId),
      specialApiService.products.getAllProducts(),
    ]);
    
    const totalBalance = 
      (walletBalances.treasury?.balance || 0) +
      (walletBalances.operation?.balance || 0) +
      (walletBalances.kyc?.balance || 0);
    
    const totalUserBalance = userWallets.reduce((sum, wallet) => sum + wallet.balance, 0);
    
    return {
      wallets: walletBalances,
      totalBalance,
      totalUserBalance,
      totalUsers: userWallets.length,
      totalProducts: allProducts.data?.length || 0,
      userWallets,
    };
  } catch (error) {
    console.error('Error fetching merchant dashboard overview:', error);
    throw error;
  }
}
