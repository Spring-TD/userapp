import axios from 'axios';
import { config } from '../config/environment';

export interface AppInfo {
    id: string;
    name: string;
    merchantId: string;
    status: string;
    createdAt: string;
}

export interface AppOwnershipRecord {
    appId: string;
    appName: string;
    merchantId: string;
    accountId?: string;
    createdAt: Date;
}

class CreateAppService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = config.createAppServiceUrl;
    }

    /**
     * Get app information by app ID
     * This helps account-ms understand which app an account belongs to
     */
    async getAppInfo(appId: string): Promise<AppInfo | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/special/internal/apps/${appId}`, {
                headers: {
                    'X-Internal-Token': config.jwtSecret
                },
                timeout: config.tenantResolverTimeoutMs,
                validateStatus: () => true
            });

            if (response.status >= 200 && response.status < 300 && response.data.success && response.data.data) {
                const app = response.data.data;
                return {
                    id: app.id || app._id || appId,
                    name: app.name,
                    merchantId: app.merchantId || app.merchant_id,
                    status: app.status,
                    createdAt: app.createdAt || app.created_at
                };
            }
            return null;
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'unknown error';
            console.error('Error getting app info:', message);
            return null;
        }
    }

    /**
     * Get all apps owned by a merchant
     * This helps track which apps a merchant/user owns
     */
    async getAppsByMerchantId(merchantId: string): Promise<AppInfo[]> {
        try {
            const apps: AppInfo[] = [];
            let page = 1;
            const limit = 20;

            while (true) {
                const response = await axios.get(`${this.baseUrl}/api/v1/apps/merchant/${merchantId}`, {
                    headers: {
                        'Authorization': 'Bearer sams_account_service_token'
                    },
                    params: { page, limit }
                });

                if (!response.data.success || !Array.isArray(response.data.data)) {
                    return apps;
                }

                apps.push(...response.data.data);

                const pagination = response.data.pagination as
                    | { hasNextPage?: boolean; totalPages?: number }
                    | undefined;
                if (!pagination?.hasNextPage || page >= (pagination.totalPages ?? page)) {
                    return apps;
                }
                page += 1;
            }
        } catch (error: any) {
            console.error('Error getting apps by merchant:', error.message);
            return [];
        }
    }

    /**
     * Record that an account was created for a specific app
     * This maintains the memory of which accounts belong to which apps
     */
    async recordAccountForApp(appId: string, accountId: string, userId: string): Promise<void> {
        try {
            console.log(`Recording account ${accountId} for app ${appId} (user: ${userId})`);

            // Get app info to store in memory
            const appInfo = await this.getAppInfo(appId);

            if (appInfo) {
                // In a real implementation, you might want to store this in a database
                // or call a specific endpoint in create-app-ms to record this association
                // For now, we'll just log it
                console.log(`Account ${accountId} associated with app ${appInfo.name} (${appId})`);
                console.log(`App owner: ${appInfo.merchantId}`);
            }
        } catch (error) {
            console.error('Failed to record account for app:', error);
        }
    }

    /**
     * Check if a user owns a specific app
     * This is useful for authorization and access control
     */
    async userOwnsApp(userId: string, appId: string): Promise<boolean> {
        try {
            const appInfo = await this.getAppInfo(appId);

            if (!appInfo) {
                return false;
            }

            // Check if the user is the merchant who owns the app
            return appInfo.merchantId === userId;
        } catch (error) {
            console.error('Error checking app ownership:', error);
            return false;
        }
    }

    /**
     * Get ownership records for a user
     * Returns all apps owned by the user along with associated accounts
     */
    async getOwnershipRecords(userId: string): Promise<AppOwnershipRecord[]> {
        try {
            const apps = await this.getAppsByMerchantId(userId);

            return apps.map(app => ({
                appId: app.id,
                appName: app.name,
                merchantId: app.merchantId,
                createdAt: new Date(app.createdAt)
            }));
        } catch (error) {
            console.error('Error getting ownership records:', error);
            return [];
        }
    }
}

export default new CreateAppService();
