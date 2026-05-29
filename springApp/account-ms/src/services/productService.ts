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
    // App-specific pricing configuration
    pricingType?: 'percent' | 'Fixed pricing';
    pricingCondition?: 'With cap' | 'No Cap';
    upperCap?: number;
    lowerCap?: number;
    springTDFee?: number;
    serviceFee?: number;
    markupRate?: number; // Additional percentage to add to base interest rate
    customTerms?: any;
    enabledFeatures?: string[];
    isActive?: boolean;
}

export interface ProductInfo {
    id: string;
    name: string;
    description: string;
    type: string;
    appId: string;
    status: string;
    price?: number;
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
    currency?: string;
}

export type ProductApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'BLACKLISTED';

export interface ProductRequirementSubmission {
    requirementId?: string;
    requirementType?: string;
    label?: string;
    type?: 'document' | 'text' | 'number' | 'boolean' | 'json';
    value?: unknown;
    fileUrl?: string;
    fileName?: string;
    fileType?: string;
    fileSize?: number;
    metadata?: Record<string, unknown>;
}

export interface ProductApplication {
    id: string;
    userId: string;
    productId: string;
    productName: string;
    productType: string;
    amount: number;
    currency: string;
    email?: string;
    status: ProductApplicationStatus;
    rejectionReason?: string;
    blacklistReason?: string;
    appId: string;
    merchantId?: string;
    requirementsSnapshot?: Record<string, unknown>;
    requirementSubmissions: ProductRequirementSubmission[];
    createdAt: string;
    updatedAt: string;
}

export interface CreateProductApplicationInput {
    userId: string;
    productId: string;
    amount: number;
    currency: string;
    email?: string;
    merchantId?: string;
    appId?: string;
    applicantName?: string;
    phone?: string;
    bvn?: string;
    offeringMerchantName?: string;
    country?: string;
    integratorMerchantId?: string;
    integratorMerchantName?: string;
    productCreatorMerchantName?: string;
    subMerchant?: {
        id: string;
        name: string;
        email: string;
        phone: string;
        bvn?: string;
    };
    subMerchantContactEmail?: string;
    subMerchantContactPhone?: string;
    requirementSubmissions?: ProductRequirementSubmission[];
}

export interface ListProductApplicationsQuery {
    merchantId?: string;
    userId?: string;
    status?: ProductApplicationStatus;
    productType?: string;
}

export class ProductServiceError extends Error {
    constructor(message: string, public statusCode?: number) {
        super(message);
        Object.setPrototypeOf(this, new.target.prototype);
    }
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

    private throwProductServiceError(error: unknown, fallback: string): never {
        if (axios.isAxiosError(error)) {
            const data = error.response?.data as { error?: string; message?: string } | undefined;
            throw new ProductServiceError(
                data?.error || data?.message || error.message || fallback,
                error.response?.status
            );
        }

        throw new ProductServiceError(fallback);
    }

    async createProductApplication(input: CreateProductApplicationInput): Promise<ProductApplication> {
        try {
            const response = await axios.post(`${this.baseUrl}/api/v1/product-applications`, input, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });

            if (response.data.success && response.data.data) {
                return response.data.data;
            }

            throw new Error(response.data.error || 'Failed to create product application');
        } catch (error) {
            this.throwProductServiceError(error, 'Failed to create product application');
        }
    }

    async getProductApplicationById(applicationId: string): Promise<ProductApplication | null> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/product-applications/${applicationId}`, {
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });

            if (response.data.success && response.data.data) {
                return response.data.data;
            }

            return null;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                return null;
            }
            this.throwProductServiceError(error, 'Failed to get product application');
        }
    }

    async listProductApplications(query: ListProductApplicationsQuery = {}): Promise<ProductApplication[]> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/v1/product-applications`, {
                params: query,
                headers: {
                    'Authorization': 'Bearer sams_account_service_token'
                }
            });

            if (response.data.success && response.data.data) {
                return response.data.data;
            }

            return [];
        } catch (error) {
            this.throwProductServiceError(error, 'Failed to list product applications');
        }
    }

    async updateProductApplicationStatus(
        applicationId: string,
        status: Exclude<ProductApplicationStatus, 'PENDING'>,
        reason?: string
    ): Promise<ProductApplication> {
        try {
            const response = await axios.put(
                `${this.baseUrl}/api/v1/product-applications/${applicationId}/status`,
                { status, reason },
                {
                    headers: {
                        'Authorization': 'Bearer sams_account_service_token'
                    }
                }
            );

            if (response.data.success && response.data.data) {
                return response.data.data;
            }

            throw new Error(response.data.error || 'Failed to update product application status');
        } catch (error) {
            this.throwProductServiceError(error, 'Failed to update product application status');
        }
    }

    /**
     * Get product pricing/configuration
     * This retrieves the pricing details for a product
     */
    async getProductPricing(productId: string, appId?: string): Promise<ProductPricing | null> {
        try {
            // Get product info first
            const productInfo = await this.getProductInfo(productId);

            if (!productInfo) {
                return null;
            }

            let pricing: ProductPricing = {
                productId: productInfo.id,
                productName: productInfo.name,
                productType: productInfo.type,
                // Base pricing from product configuration
                interestRate: productInfo.interestRate,
                managementFee: productInfo.managementFee,
                penalty: productInfo.penalty,
                withdrawalPenalty: productInfo.withdrawalPenalty,
                minimumAmount: productInfo.minimumAmount,
                maximumAmount: productInfo.maximumAmount,
                price: productInfo.price,
                currency: productInfo.currency
            };

            // If appId is provided, get app-specific pricing configuration
            if (appId) {
                try {
                    const configResponse = await axios.get(`${this.baseUrl}/api/v1/products/config/${appId}/${productId}`, {
                        headers: {
                            'Authorization': 'Bearer sams_account_service_token'
                        }
                    });

                    if (configResponse.data.success && configResponse.data.data) {
                        const config = configResponse.data.data;
                        
                        // Merge app-specific pricing configuration with base pricing
                        pricing = {
                            ...pricing,
                            pricingType: config.pricingType,
                            pricingCondition: config.pricingCondition,
                            upperCap: config.upperCap,
                            lowerCap: config.lowerCap,
                            springTDFee: config.springTDFee,
                            serviceFee: config.serviceFee,
                            markupRate: config.markupRate,
                            customTerms: config.customTerms,
                            enabledFeatures: config.enabledFeatures,
                            isActive: config.isActive
                        };
                    }
                } catch (configError: any) {
                    console.warn(`No app-specific configuration found for app ${appId} and product ${productId}:`, configError.message);
                    // Continue with base pricing if merchant config doesn't exist
                }
            }

            return pricing;
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
    async calculateAccountPricing(productId: string, accountType: string, amount: number, appId?: string): Promise<any> {
        try {
            const pricing = await this.getProductPricing(productId, appId);

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

            // Calculate interest (with markup if applicable)
            if (pricing.interestRate) {
                let baseInterestRate = pricing.interestRate;
                let finalInterestRate = baseInterestRate;
                
                // Apply markup if available
                if (pricing.markupRate !== undefined) {
                    if (baseInterestRate.type === 'percentage') {
                        // Add markup to base interest rate
                        finalInterestRate = {
                            type: 'percentage',
                            value: baseInterestRate.value + pricing.markupRate
                        };
                        calculations.markupRate = pricing.markupRate;
                        calculations.baseInterestRate = baseInterestRate;
                    }
                }
                
                if (finalInterestRate.type === 'percentage') {
                    calculations.interestAmount = (amount * finalInterestRate.value) / 100;
                } else {
                    calculations.interestAmount = finalInterestRate.value;
                }
                calculations.interestRate = finalInterestRate;
            }

            // Calculate management fee
            if (pricing.managementFee) {
                calculations.managementFee = pricing.managementFee;
            }

            // Calculate penalties
            if (pricing.penalty) {
                let finalPenalty = pricing.penalty;
                
                // Apply penalty calculation with proper percentage/amount handling
                if (pricing.penalty.type === 'percentage') {
                    calculations.penaltyAmount = (amount * pricing.penalty.value) / 100;
                } else {
                    calculations.penaltyAmount = pricing.penalty.value;
                }
                calculations.penalty = finalPenalty;
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

            // Calculate fees based on pricing configuration
            if (pricing.pricingType && pricing.pricingCondition) {
                calculations.pricingType = pricing.pricingType;
                calculations.pricingCondition = pricing.pricingCondition;
                calculations.springTDFee = pricing.springTDFee;
                calculations.serviceFee = pricing.serviceFee;
                
                // Apply caps if condition is 'With cap'
                if (pricing.pricingCondition === 'With cap' && pricing.upperCap !== undefined && pricing.lowerCap !== undefined) {
                    calculations.upperCap = pricing.upperCap;
                    calculations.lowerCap = pricing.lowerCap;
                    
                    // Example fee calculation based on amount
                    let calculatedFee = amount * 0.01; // Just an example calculation
                    if (calculatedFee > pricing.upperCap) {
                        calculations.adjustedFee = pricing.upperCap;
                    } else if (calculatedFee < pricing.lowerCap) {
                        calculations.adjustedFee = pricing.lowerCap;
                    } else {
                        calculations.adjustedFee = calculatedFee;
                    }
                }
            }

            // Total cost
            calculations.totalCost = amount +
                (calculations.interestAmount || 0) +
                (calculations.managementFee || 0) +
                (calculations.springTDFee || 0) +
                (calculations.serviceFee || 0) +
                (calculations.adjustedFee || 0);

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
    async updateProductPricing(productId: string, appId: string, pricingUpdates: Partial<ProductPricing>): Promise<boolean> {
        try {
            // Update app-specific product configuration with new pricing
            const response = await axios.put(
                `${this.baseUrl}/api/v1/products/config/${appId}/${productId}`,
                pricingUpdates, // Send the pricing updates directly as the body
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
