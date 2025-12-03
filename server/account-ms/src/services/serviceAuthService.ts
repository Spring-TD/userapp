import axios from 'axios';
import { config } from '../config/environment';

export interface UserState {
    userId: string;
    email: string;
    status: string;
    accountsCreated?: string[];
    walletsCreated?: string[];
    kycStatus?: string;
    lastActivity?: Date;
}

class ServiceAuthService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = config.serviceAuthUrl;
    }

    /**
     * Update user state in service-auth-ms
     * This maintains a memory/record of user activities across services
     */
    async updateUserState(userId: string, stateUpdate: Partial<UserState>): Promise<boolean> {
        try {
            // service-auth-ms has a user profile endpoint
            // We'll use PUT /api/v1/user/profile to update user information
            // However, this endpoint expects authentication from the user themselves

            // For service-to-service communication, we need to use a service token
            // that allows us to update user state on behalf of the system

            const response = await axios.put(`${this.baseUrl}/api/v1/user/profile`,
                stateUpdate,
                {
                    headers: {
                        'Authorization': 'Bearer sams_account_service_token',
                        'X-Service-User-Id': userId // Custom header to specify which user we're updating
                    }
                }
            );

            return response.data.success;
        } catch (error: any) {
            console.error('Error updating user state:', error.message);
            return false;
        }
    }

    /**
     * Get user state from service-auth-ms
     */
    async getUserState(userId: string): Promise<UserState | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/user/info/${userId}`, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });

            if (response.data.success && response.data.data.user) {
                return response.data.data.user;
            }
            return null;
        } catch (error: any) {
            console.error('Error getting user state:', error.message);
            return null;
        }
    }

    /**
     * Record account creation activity
     * This updates the user's state to track that an account was created
     */
    async recordAccountCreation(userId: string, accountId: string, accountType: string): Promise<void> {
        try {
            console.log(`Recording account creation for user ${userId}: ${accountType} account (${accountId})`);

            // Get current state
            const currentState = await this.getUserState(userId);

            const accountsCreated = currentState?.accountsCreated || [];
            accountsCreated.push(`${accountType}:${accountId}`);

            await this.updateUserState(userId, {
                accountsCreated,
                lastActivity: new Date()
            });

            console.log('Account creation recorded in service-auth-ms');
        } catch (error) {
            console.error('Failed to record account creation:', error);
            // Non-critical, so we don't throw
        }
    }

    /**
     * Record wallet creation activity
     */
    async recordWalletCreation(userId: string, walletId: string, walletType: string): Promise<void> {
        try {
            console.log(`Recording wallet creation for user ${userId}: ${walletType} wallet (${walletId})`);

            const currentState = await this.getUserState(userId);

            const walletsCreated = currentState?.walletsCreated || [];
            walletsCreated.push(`${walletType}:${walletId}`);

            await this.updateUserState(userId, {
                walletsCreated,
                lastActivity: new Date()
            });

            console.log('Wallet creation recorded in service-auth-ms');
        } catch (error) {
            console.error('Failed to record wallet creation:', error);
        }
    }

    /**
     * Update KYC status in user state
     */
    async updateKycStatus(userId: string, kycStatus: string): Promise<void> {
        try {
            await this.updateUserState(userId, {
                kycStatus,
                lastActivity: new Date()
            });

            console.log(`KYC status updated to ${kycStatus} for user ${userId}`);
        } catch (error) {
            console.error('Failed to update KYC status:', error);
        }
    }
}

export default new ServiceAuthService();
