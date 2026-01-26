import axios from 'axios';
import { config } from '../config/environment';

export interface KycStatus {
    status: string; // 'verified', 'pending', 'rejected', 'none'
    kycLevel?: string;
    lastUpdated?: Date;
}

class ComplianceService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = config.complianceServiceUrl;
    }

    /**
     * Check KYC status for a user
     */
    async checkKycStatus(userId: string): Promise<KycStatus> {
        try {
            // Pass service token for authentication
            const response = await axios.get(`${this.baseUrl}/api/v1/kyc/status/${userId}`, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });
            return response.data;
        } catch (error: any) {
            if (error.response && error.response.status === 404) {
                return { status: 'none' };
            }
            console.error('Error checking KYC status:', error.message);
            // Return 'none' or throw error depending on how strict we want to be
            // For now, let's return 'none' so we can trigger initiation
            return { status: 'none' };
        }
    }

    /**
     * Initiate KYC for a user
     * This could create a minimal profile or trigger a workflow
     */
    async initiateKyc(userId: string, email?: string): Promise<any> {
        try {
            // Pass service token for authentication
            const response = await axios.post(`${this.baseUrl}/api/v1/kyc/profile/${userId}`, {
                email
            }, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });
            return response.data;
        } catch (error: any) {
            console.error('Error initiating KYC:', error.message);
            throw new Error('Failed to initiate KYC process');
        }
    }
}

export default new ComplianceService();
