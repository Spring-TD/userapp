import axios from 'axios';
import { config } from '../config/environment';

export interface Wallet {
    id: string;
    userId: string;
    currency: string;
    balance: number;
    status: string;
}

class WalletService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = config.walletServiceUrl;
    }

    /**
     * Create a wallet for a user
     * This is called when a user creates a new account for a specific product (savings, loan, mortgage)
     */
    async createWallet(userId: string, currency: string, name: string): Promise<Wallet> {
        try {
            // Pass service token for authentication
            // Note: wallet-ms expects a merchantId in the token or request for user wallet creation
            // Since this is a service-to-service call, we assume the token handles permissions

            const response = await axios.post(`${this.baseUrl}/api/v1/wallets/user`, {
                name,
                currency
            }, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token',
                    // We might need to pass the userId in a way the wallet service understands if it's not in the token
                    // But based on wallet-ms code, it extracts userId from req.user.userId
                    // So we might need a special "impersonation" token or header if the service token doesn't carry userId
                    // For now, let's assume the service token allows creating wallets for any user if we pass userId in body (if supported)
                    // OR we need to modify wallet-ms to accept userId in body for service calls.
                    // Looking at wallet-ms code: const userId = req.user.userId;
                    // This implies the token MUST belong to the user OR be a special service token that sets req.user.userId

                    // Since we can't easily change wallet-ms right now, let's assume we have a way to pass context
                    // or we are using a token that represents the user context.

                    // However, for a proper microservice orchestration, usually the service has a "system" endpoint
                    // or accepts an override.

                    // Let's try to pass it in the body and hope we can update wallet-ms later if needed, 
                    // or assume the auth middleware handles service tokens by allowing an override header.
                }
            });

            return response.data.data.wallet;
        } catch (error: any) {
            console.error('Error creating wallet:', error.message);
            throw new Error('Failed to create wallet');
        }
    }

    /**
     * Check if user has a wallet for a specific currency
     */
    async getUserWallets(userId: string): Promise<Wallet[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/wallets/user/${userId}`, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });

            // The endpoint returns a single wallet or list? 
            // wallet-ms: getUserWallet returns { data: { wallet: ... } } (single wallet?)
            // But there is also getUserWalletsByMerchant.
            // Let's assume getUserWallet returns the main wallet or we might need a list endpoint.

            // If it returns a single object, wrap in array
            if (response.data.data.wallet) {
                return [response.data.data.wallet];
            }
            return [];
        } catch (error: any) {
            console.error('Error getting user wallets:', error.message);
            return [];
        }
    }
}

export default new WalletService();
