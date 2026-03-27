import axios from 'axios';
import { config } from '../config/environment';

export interface ProductPricing {
    productId: string;
    productName: string;
    productType: string;
    interestRate?: {
        type: 'percentage' | 'amount';
        value: number;
    };
    managementFee?: number;
    penalty?: {
        type: 'percentage' | 'amount';
        value: number;
    };
    withdrawalPenalty?: {
        type: 'percentage' | 'amount';
        value: number;
    };
    minimumAmount?: number;
    maximumAmount?: number;
    price?: number; // For commodity products
    currency?: string;
}

export interface ProductInfo {
    id: string;
    name: string;
    description: string;
    type: string;
    appId: string;
    status: string;
    price?: number;
}

class ProductService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = config.productServiceUrl;
    }

    /**
     * Get product information by product ID
     */
    async getProductInfo(productId: string): Promise<ProductInfo | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/products/${productId}`, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });

            if (response.data.success && response.data.data) {
                return response.data.data;
            }
            return null;
        } catch (error: any) {
            console.error('Error getting product info:', error.message);
            return null;
        }
    }

    /**
     * Get product pricing/configuration
     * This retrieves the pricing details for a product
     */
    async getProductPricing(productId: string): Promise<ProductPricing | null> {
        try {
            // Get product info first
            const productInfo = await this.getProductInfo(productId);

            if (!productInfo) {
                return null;
            }

            // Get product configuration which contains pricing details
            const configResponse = await axios.get(`${this.baseUrl}/api/v1/configurations/${productId}`, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });

            if (configResponse.data.success && configResponse.data.data) {
                const config = configResponse.data.data;

                // Extract pricing information based on product type
                const pricing: ProductPricing = {
                    productId: productInfo.id,
                    productName: productInfo.name,
                    productType: productInfo.type,
                    interestRate: config.interestRate,
                    managementFee: config.managementFee,
                    penalty: config.penalty,
                    withdrawalPenalty: config.withdrawalPenalty,
                    minimumAmount: config.minimumFacilityAmount || config.loanAmount?.minimum,
                    maximumAmount: config.maximumFacilityAmount || config.loanAmount?.maximum,
                    price: config.price || productInfo.price,
                    currency: config.currency
                };

                return pricing;
            }

            return null;
        } catch (error: any) {
            console.error('Error getting product pricing:', error.message);
            return null;
        }
    }

    /**
     * Get all products for an app
     */
    async getProductsByAppId(appId: string): Promise<ProductInfo[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/products/app/${appId}`, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });

            if (response.data.success && response.data.data) {
                return response.data.data;
            }
            return [];
        } catch (error: any) {
            console.error('Error getting products by app:', error.message);
            return [];
        }
    }

    /**
     * Calculate pricing for an account based on product
     * This helps determine fees, interest rates, etc. for an account
     */
    async calculateAccountPricing(productId: string, accountType: string, amount: number): Promise<any> {
        try {
            const pricing = await this.getProductPricing(productId);

            if (!pricing) {
                return {
                    error: 'Product pricing not found'
                };
            }

            // Calculate based on product type
            const calculations: any = {
                productId,
                productName: pricing.productName,
                productType: pricing.productType,
                accountType,
                amount
            };

            // Calculate interest
            if (pricing.interestRate) {
                if (pricing.interestRate.type === 'percentage') {
                    calculations.interestAmount = (amount * pricing.interestRate.value) / 100;
                } else {
                    calculations.interestAmount = pricing.interestRate.value;
                }
                calculations.interestRate = pricing.interestRate;
            }

            // Calculate management fee
            if (pricing.managementFee) {
                calculations.managementFee = pricing.managementFee;
            }

            // Calculate penalties
            if (pricing.penalty) {
                if (pricing.penalty.type === 'percentage') {
                    calculations.penaltyAmount = (amount * pricing.penalty.value) / 100;
                } else {
                    calculations.penaltyAmount = pricing.penalty.value;
                }
                calculations.penalty = pricing.penalty;
            }

            // Calculate withdrawal penalty
            if (pricing.withdrawalPenalty) {
                if (pricing.withdrawalPenalty.type === 'percentage') {
                    calculations.withdrawalPenaltyAmount = (amount * pricing.withdrawalPenalty.value) / 100;
                } else {
                    calculations.withdrawalPenaltyAmount = pricing.withdrawalPenalty.value;
                }
                calculations.withdrawalPenalty = pricing.withdrawalPenalty;
            }

            // Total cost
            calculations.totalCost = amount +
                (calculations.interestAmount || 0) +
                (calculations.managementFee || 0);

            return calculations;
        } catch (error: any) {
            console.error('Error calculating account pricing:', error);
            return {
                error: error.message
            };
        }
    }

    /**
     * Set or update product pricing
     * This allows account-ms to influence product pricing based on account data
     */
    async updateProductPricing(productId: string, pricingUpdates: Partial<ProductPricing>): Promise<boolean> {
        try {
            // Update product configuration with new pricing
            const response = await axios.put(
                `${this.baseUrl}/api/v1/configurations/${productId}`,
                { configuration: pricingUpdates },
                {
                    headers: {
                        'Authorization': 'Bearer sams_account_service_token'
                    }
                }
            );

            return response.data.success;
        } catch (error: any) {
            console.error('Error updating product pricing:', error.message);
            return false;
        }
    }
}

export default new ProductService();
