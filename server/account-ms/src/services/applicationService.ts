import mockDb, { Application } from '../utils/mockDb';
import productService from './productService';
import accountService from './accountService';

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

            // 2. Check if product requires approval
            // Loan and Mortgage products require admin approval
            const requiresApproval = ['Loan', 'Mortgage'].includes(product.type);

            if (requiresApproval) {
                // Create Application
                const application = await mockDb.createApplication({
                    userId: input.userId,
                    productId: input.productId,
                    productName: product.name,
                    productType: product.type,
                    amount: input.amount,
                    currency: input.currency,
                    status: 'PENDING'
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
     * Get all applications (for admin)
     */
    async getAllApplications() {
        return await mockDb.getAllApplications();
    }

    /**
     * Get pending applications (for admin)
     */
    async getPendingApplications() {
        const apps = await mockDb.getAllApplications();
        return apps.filter(a => a.status === 'PENDING');
    }

    /**
     * Get user's applications
     */
    async getUserApplications(userId: string) {
        return await mockDb.getApplicationsByUserId(userId);
    }

    /**
     * Get application by ID
     */
    async getApplicationById(applicationId: string) {
        return await mockDb.getApplicationById(applicationId);
    }
}

export default new ApplicationService();
