import axios from 'axios';
import { config } from '../config/environment';

export interface BillingStatus {
    hasDueBills: boolean;
    totalDueAmount: number;
    currency: string;
    nextBillingDate?: Date;
    status: string; // 'active', 'suspended', 'overdue'
}

class BillingService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = config.billingServiceUrl;
    }

    /**
     * Check billing status for a user
     * Returns information about due bills and account standing
     */
    async checkBillingStatus(userId: string): Promise<BillingStatus> {
        try {
            // Pass service token for authentication
            const response = await axios.post(`${this.baseUrl}/api/v1/billing/check-billing-status`, {
                userId
            }, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('Error checking billing status:', error.message);
            // Default to safe state if service is down, but log error
            return {
                hasDueBills: false,
                totalDueAmount: 0,
                currency: 'USD',
                status: 'unknown'
            };
        }
    }

    /**
     * Trigger a debit for a user if they have due bills
     * This is part of the orchestration: Account MS tells Billing MS to process payment
     */
    async triggerDebit(userId: string, amount: number, currency: string): Promise<boolean> {
        try {
            const response = await axios.post(`${this.baseUrl}/api/v1/billing/payments`, {
                userId,
                amount,
                currency,
                paymentMethod: 'balance', // Assuming debiting from account balance
                description: 'Automated debit for due bills'
            }, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });
            return response.data.success;
        } catch (error: any) {
            console.error('Error triggering debit:', error.message);
            return false;
        }
    }
}

export default new BillingService();
