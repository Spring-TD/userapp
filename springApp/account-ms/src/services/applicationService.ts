import productService, { ProductRequirementSubmission } from './productService';
import accountService from './accountService';
import createAppService from './createAppService';
import { executeCommodityPurchase } from './commodityPurchaseService';

export interface ApplyForProductInput {
    userId: string;
    productId: string;
    amount: number;
    currency: string;
    email?: string;
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

class ApplicationService {
    /**
     * Apply for a product.
     * If the product is Loan or Mortgage, it creates an application that requires approval.
     * Otherwise, it creates the account immediately.
     */
    async applyForProduct(input: ApplyForProductInput) {
        try {
            // 1. Get product info
            const product = await productService.getProductInfo(input.productId);
            if (!product) {
                throw new Error('Product not found');
            }

            // 2. Enforce server-side: product must be active for its owning app
            const appId = product.appId;
            if (!appId) {
                throw new Error('Product is not active for this app. Only active products can be applied for.');
            }
            const pricing = await productService.getProductPricing(input.productId, appId);
            if (pricing?.isActive !== true) {
                throw new Error('Product is not active for this app. Only active products can be applied for.');
            }

            // 3. Check if product requires approval (LOAN / MORTGAGE from product-ms; legacy Title Case supported)
            const normalizedType = String(product.type || '').trim().toUpperCase();
            const requiresApproval = normalizedType === 'LOAN' || normalizedType === 'MORTGAGE';

            if (requiresApproval) {
                const appInfo = await createAppService.getAppInfo(appId);
                if (!appInfo) {
                    throw new Error('App not found for product');
                }

                // Persist loan/mortgage applications in product-ms so product data and applicant requirements live together.
                const application = await productService.createProductApplication({
                    userId: input.userId,
                    productId: input.productId,
                    amount: input.amount,
                    currency: input.currency,
                    email: input.email,
                    appId,
                    merchantId: appInfo.merchantId,
                    applicantName: input.applicantName,
                    phone: input.phone,
                    bvn: input.bvn,
                    offeringMerchantName: input.offeringMerchantName,
                    country: input.country,
                    integratorMerchantId: input.integratorMerchantId,
                    integratorMerchantName: input.integratorMerchantName,
                    productCreatorMerchantName: input.productCreatorMerchantName,
                    subMerchant: input.subMerchant,
                    subMerchantContactEmail: input.subMerchantContactEmail,
                    subMerchantContactPhone: input.subMerchantContactPhone,
                    requirementSubmissions: input.requirementSubmissions
                });

                return {
                    success: true,
                    message: 'Application submitted successfully. Pending approval.',
                    data: {
                        type: 'application',
                        application
                    }
                };
            } else {
                const isCommodity = normalizedType === 'COMMODITY';

                if (isCommodity) {
                    const purchase = await executeCommodityPurchase({
                        userId: input.userId,
                        productId: input.productId,
                        appId,
                        amount: input.amount,
                        currency: input.currency
                    });

                    const account = await accountService.createAccount({
                        userId: input.userId,
                        accountType: product.type.toLowerCase(),
                        currency: input.currency,
                        productId: input.productId,
                        email: input.email,
                        appId
                    });

                    await accountService.updateAccountBalance(account.id, purchase.basePrice);

                    return {
                        success: true,
                        message: 'Commodity purchased successfully.',
                        data: {
                            type: 'account',
                            account: {
                                ...account,
                                balance: purchase.basePrice
                            },
                            purchase: {
                                referenceId: purchase.referenceId,
                                basePrice: purchase.basePrice,
                                commissionAmount: purchase.commissionAmount,
                                totalAmount: purchase.totalAmount,
                                commissionRatePercent: purchase.commissionRatePercent,
                                offeringMerchantId: purchase.offeringMerchantId,
                                creatorMerchantId: purchase.creatorMerchantId
                            }
                        }
                    };
                }

                // Create Account directly for other products (Savings, Investment, etc.)
                const account = await accountService.createAccount({
                    userId: input.userId,
                    accountType: product.type.toLowerCase(),
                    currency: input.currency,
                    productId: input.productId,
                    email: input.email,
                    appId
                });

                return {
                    success: true,
                    message: 'Product account created successfully.',
                    data: {
                        type: 'account',
                        account
                    }
                };
            }
        } catch (error: any) {
            console.error('Error applying for product:', error);
            throw error;
        }
    }

    /**
     * Get all applications (admin) or all for one merchant (merchant listing).
     */
    async getAllApplications(merchantIdFilter?: string) {
        return await productService.listProductApplications({ merchantId: merchantIdFilter });
    }

    /**
     * Get pending applications, optionally scoped to a merchant.
     */
    async getPendingApplications(merchantIdFilter?: string) {
        return await productService.listProductApplications({ merchantId: merchantIdFilter, status: 'PENDING' });
    }

    /**
     * Get blacklisted mortgage applications, optionally scoped to a merchant.
     */
    async getBlacklistedMortgageApplications(merchantIdFilter?: string) {
        return await productService.listProductApplications({
            merchantId: merchantIdFilter,
            productType: 'MORTGAGE',
            status: 'BLACKLISTED'
        });
    }

    /**
     * Get user's applications
     */
    async getUserApplications(userId: string) {
        return await productService.listProductApplications({ userId });
    }

    /**
     * Get user's applications by type
     */
    async getUserApplicationsByType(userId: string, type: string) {
        return await productService.listProductApplications({ userId, productType: type.toUpperCase() });
    }

    /**
     * Get application by ID
     */
    async getApplicationById(applicationId: string) {
        return await productService.getProductApplicationById(applicationId);
    }

    /**
     * Blacklist a mortgage application.
     */
    async blacklistMortgageApplication(applicationId: string, reason: string, adminId: string) {
        try {
            const app = await productService.getProductApplicationById(applicationId);
            if (!app) {
                throw new Error('Application not found');
            }

            if (String(app.productType).toUpperCase() !== 'MORTGAGE') {
                throw new Error('Only mortgage applications can be blacklisted');
            }

            if (app.status === 'APPROVED') {
                throw new Error('Approved applications cannot be blacklisted');
            }

            if (app.status === 'BLACKLISTED') {
                throw new Error('Application is already BLACKLISTED');
            }

            const updatedApp = await productService.updateProductApplicationStatus(applicationId, 'BLACKLISTED', reason);

            return {
                success: true,
                message: 'Mortgage application blacklisted.',
                data: updatedApp
            };
        } catch (error: any) {
            console.error('Error blacklisting mortgage application:', error);
            throw error;
        }
    }
}

export default new ApplicationService();
