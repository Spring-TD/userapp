/**
 * Admin Service — all bases follow **User-App** `NEXT_PUBLIC_API_URL` (`getApiBaseUrl()`).
 * If wallet/product admin routes live on other hosts in your deployment, route them via your API gateway
 * or split envs in a future change; this app standardizes on one origin per build.
 */

import { getApiBaseUrl } from '@/lib/apiBaseUrl';
import { getAccessToken } from '@/lib/cookieAuth';

const ADMIN_ACCOUNT_BASE = getApiBaseUrl();
const ADMIN_WALLET_BASE = getApiBaseUrl();
const ADMIN_PRODUCT_BASE = getApiBaseUrl();

const getHeaders = () => {
    const token = typeof window !== 'undefined' ? getAccessToken() : null;
    return {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
    };
};

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AdminUser {
    id: string;
    name?: string;
    firstName?: string;
    lastName?: string;
    email: string;
    role: string;
    status: 'Active' | 'Pending' | 'Suspended' | 'Inactive';
    lastLogin?: string;
    createdAt?: string;
}

export interface AdminProduct {
    id: string;
    name: string;
    appId?: string;
    type?: string;
    dateCreated?: string;
    createdAt?: string;
    productKey?: string;
    referenceNumber?: string;
    isActive: boolean;
}

export interface AdminWalletTransaction {
    id: string;
    amount: number;
    referenceId?: string;
    description?: string;
    type: 'CREDIT' | 'DEBIT';
    status: string;
    fee?: number;
    userEmail?: string;
    userPhone?: string;
    createdAt: string;
}

export interface AdminApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    message?: string;
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

export const adminUsersApi = {
    /**
     * Get all admin/management users from account-ms
     * GET /api/v1/admin/users or /api/v1/users
     */
    async getAllUsers(): Promise<AdminApiResponse<AdminUser[]>> {
        try {
            const response = await fetch(`${ADMIN_ACCOUNT_BASE}/api/v1/admin/users`, {
                headers: getHeaders(),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (err) {
            console.error('[adminUsersApi] getAllUsers failed:', err);
            return { success: false, error: String(err) };
        }
    },

    /**
     * Update user status (activate, suspend, etc.)
     * PUT /api/v1/admin/users/{userId}/status
     */
    async updateUserStatus(
        userId: string,
        status: 'Active' | 'Suspended' | 'Inactive'
    ): Promise<AdminApiResponse<AdminUser>> {
        try {
            const response = await fetch(`${ADMIN_ACCOUNT_BASE}/api/v1/admin/users/${userId}/status`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify({ status }),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (err) {
            console.error('[adminUsersApi] updateUserStatus failed:', err);
            return { success: false, error: String(err) };
        }
    },
};

// ─── Admin Products ───────────────────────────────────────────────────────────

export const adminProductsApi = {
    /**
     * Get all products from Spring's product-ms
     * GET /api/v1/products
     */
    async getAllProducts(type?: string): Promise<AdminApiResponse<AdminProduct[]>> {
        try {
            const url = type
                ? `${ADMIN_PRODUCT_BASE}/api/v1/products?type=${encodeURIComponent(type)}`
                : `${ADMIN_PRODUCT_BASE}/api/v1/products`;
            const response = await fetch(url, { headers: getHeaders() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (err) {
            console.error('[adminProductsApi] getAllProducts failed:', err);
            return { success: false, error: String(err) };
        }
    },

    /**
     * Suspend/deactivate a product
     * PUT /api/v1/products/{productId}
     */
    async updateProduct(
        productId: string,
        data: Partial<{ isActive: boolean; status: string }>
    ): Promise<AdminApiResponse<AdminProduct>> {
        try {
            const response = await fetch(`${ADMIN_PRODUCT_BASE}/api/v1/products/${productId}`, {
                method: 'PUT',
                headers: getHeaders(),
                body: JSON.stringify(data),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (err) {
            console.error('[adminProductsApi] updateProduct failed:', err);
            return { success: false, error: String(err) };
        }
    },
};

// ─── Admin Wallet ─────────────────────────────────────────────────────────────

export const adminWalletApi = {
    /**
     * Get wallet summary stats
     * GET /api/v1/wallets/admin/summary
     */
    async getSummary(): Promise<AdminApiResponse<{
        totalWallets: number;
        totalBalance: number;
        activeWallets: number;
    }>> {
        try {
            const response = await fetch(`${ADMIN_WALLET_BASE}/api/v1/wallets/admin/summary`, {
                headers: getHeaders(),
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (err) {
            console.error('[adminWalletApi] getSummary failed:', err);
            return { success: false, error: String(err) };
        }
    },

    /**
     * Get all wallet transactions (platform-wide)
     * GET /api/v1/wallets/admin/transactions
     */
    async getAllTransactions(params?: {
        page?: number;
        limit?: number;
        type?: 'CREDIT' | 'DEBIT';
        status?: string;
        startDate?: string;
        endDate?: string;
    }): Promise<AdminApiResponse<AdminWalletTransaction[]>> {
        try {
            const query = new URLSearchParams();
            if (params) {
                Object.entries(params).forEach(([k, v]) => {
                    if (v !== undefined) query.append(k, String(v));
                });
            }
            const url = `${ADMIN_WALLET_BASE}/api/v1/wallets/admin/transactions?${query}`;
            const response = await fetch(url, { headers: getHeaders() });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (err) {
            console.error('[adminWalletApi] getAllTransactions failed:', err);
            return { success: false, error: String(err) };
        }
    },
};
