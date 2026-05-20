import mockDb, { Application } from '../utils/mockDb';
import productService from './productService';
import accountService from './accountService';
import createAppService from './createAppService';

export interface ApplyForProductInput {
    userId: string;
    productId: string;
    amount: number;
    currency: string;
    email?: string;
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

                // Create Application
                const application = await mockDb.createApplication({
                    userId: input.userId,
                    productId: input.productId,
                    productName: product.name,
                    productType: product.type,
                    amount: input.amount,
                    currency: input.currency,
                    status: 'PENDING',
                    appId,
                    merchantId: appInfo.merchantId
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
                // Create Account directly for other products (Savings, Commodity, etc.)
                const account = await accountService.createAccount({
                    userId: input.userId,
                    accountType: product.type.toLowerCase(),
                    currency: input.currency,
                    productId: input.productId,
                    email: input.email
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
     * Approve an application
     */
    async approveApplication(applicationId: string, adminId: string) {
        try {
            const app = await mockDb.getApplicationById(applicationId);
            if (!app) {
                throw new Error('Application not found');
            }

            if (app.status !== 'PENDING') {
                throw new Error(`Application is already ${app.status}`);
            }

            // Update status to APPROVED
            await mockDb.updateApplicationStatus(applicationId, 'APPROVED');

            // Create the actual account
            const account = await accountService.createAccount({
                userId: app.userId,
                accountType: app.productType.toLowerCase(),
                currency: app.currency,
                productId: app.productId
            });

            return {
                success: true,
                message: 'Application approved and account created.',
                data: {
                    application: app,
                    account
                }
            };
        } catch (error: any) {
            console.error('Error approving application:', error);
            throw error;
        }
    }

    /**
     * Reject an application
     */
    async rejectApplication(applicationId: string, reason: string, adminId: string) {
        try {
            const app = await mockDb.getApplicationById(applicationId);
            if (!app) {
                throw new Error('Application not found');
            }

            if (app.status !== 'PENDING') {
                throw new Error(`Application is already ${app.status}`);
            }

            // Update status to REJECTED
            const updatedApp = await mockDb.updateApplicationStatus(applicationId, 'REJECTED', reason);

            return {
                success: true,
                message: 'Application rejected.',
                data: updatedApp
            };
        } catch (error: any) {
            console.error('Error rejecting application:', error);
            throw error;
        }
    }

    /**
     * Get all applications (admin) or all for one merchant (merchant listing).
     */
    async getAllApplications(merchantIdFilter?: string) {
        if (merchantIdFilter) {
            return await mockDb.getApplicationsByMerchantId(merchantIdFilter);
        }
        return await mockDb.getAllApplications();
    }

    /**
     * Get pending applications, optionally scoped to a merchant.
     */
    async getPendingApplications(merchantIdFilter?: string) {
        const apps = merchantIdFilter
            ? await mockDb.getApplicationsByMerchantId(merchantIdFilter)
            : await mockDb.getAllApplications();
        return apps.filter(a => a.status === 'PENDING');
    }

    /**
     * Get blacklisted mortgage applications, optionally scoped to a merchant.
     */
    async getBlacklistedMortgageApplications(merchantIdFilter?: string) {
        const apps = merchantIdFilter
            ? await mockDb.getApplicationsByMerchantId(merchantIdFilter)
            : await mockDb.getAllApplications();
        return apps.filter(a => a.productType === 'Mortgage' && a.status === 'BLACKLISTED');
    }

    /**
     * Get user's applications
     */
    async getUserApplications(userId: string) {
        return await mockDb.getApplicationsByUserId(userId);
    }

    /**
     * Get user's applications by type
     */
    async getUserApplicationsByType(userId: string, type: string) {
        const apps = await mockDb.getApplicationsByUserId(userId);
        return apps.filter(app => app.productType === type);
    }

    /**
     * Get application by ID
     */
    async getApplicationById(applicationId: string) {
        return await mockDb.getApplicationById(applicationId);
    }

    /**
     * Blacklist a mortgage application.
     */
    async blacklistMortgageApplication(applicationId: string, reason: string, adminId: string) {
        try {
            const app = await mockDb.getApplicationById(applicationId);
            if (!app) {
                throw new Error('Application not found');
            }

            if (app.productType !== 'Mortgage') {
                throw new Error('Only mortgage applications can be blacklisted');
            }

            if (app.status === 'APPROVED') {
                throw new Error('Approved applications cannot be blacklisted');
            }

            if (app.status === 'BLACKLISTED') {
                throw new Error('Application is already BLACKLISTED');
            }

            const updatedApp = await mockDb.updateApplicationStatus(applicationId, 'BLACKLISTED', reason);

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
