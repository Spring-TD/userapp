import billingClient from '@/lib/services/billing-client'
import type {
    Invoice,
    Payment,
    Transaction,
    Subscription,
    BillingHistory,
    PaymentMethod,
    RecurringBilling,
    OneTimeBilling,
    BillingStatus,
    ApiResponse,
    PaginatedResponse,
} from '@/types/billing'

const API_BASE = '/api/v1/billing'

export const billingService = {
    // Invoice methods
    async getInvoices(params?: { page?: number; limit?: number }): Promise<ApiResponse<Invoice[]>> {
        return billingClient.request<ApiResponse<Invoice[]>>('get', `${API_BASE}/invoices`, undefined, params)
    },

    async getInvoice(id: string): Promise<ApiResponse<Invoice>> {
        return billingClient.request<ApiResponse<Invoice>>('get', `${API_BASE}/invoices/${id}`)
    },

    async createInvoice(data: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
        return billingClient.request<ApiResponse<Invoice>>('post', `${API_BASE}/invoices`, data)
    },

    async updateInvoice(id: string, data: Partial<Invoice>): Promise<ApiResponse<Invoice>> {
        return billingClient.request<ApiResponse<Invoice>>('put', `${API_BASE}/invoices/${id}`, data)
    },

    async deleteInvoice(id: string): Promise<ApiResponse<void>> {
        return billingClient.request<ApiResponse<void>>('delete', `${API_BASE}/invoices/${id}`)
    },

    // Payment methods
    async getPayments(params?: { page?: number; limit?: number }): Promise<ApiResponse<Payment[]>> {
        return billingClient.request<ApiResponse<Payment[]>>('get', `${API_BASE}/payments`, undefined, params)
    },

    async getPayment(id: string): Promise<ApiResponse<Payment>> {
        return billingClient.request<ApiResponse<Payment>>('get', `${API_BASE}/payments/${id}`)
    },

    async processPayment(data: Partial<Payment>): Promise<ApiResponse<Payment>> {
        return billingClient.request<ApiResponse<Payment>>('post', `${API_BASE}/payments`, data)
    },

    // Transaction methods
    async getTransactions(params?: { page?: number; limit?: number; status?: string }): Promise<ApiResponse<Transaction[]>> {
        return billingClient.request<ApiResponse<Transaction[]>>('get', `${API_BASE}/transactions`, undefined, params)
    },

    async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
        return billingClient.request<ApiResponse<Transaction>>('get', `${API_BASE}/transactions/${id}`)
    },

    // Subscription methods
    async getSubscriptions(params?: { page?: number; limit?: number }): Promise<ApiResponse<Subscription[]>> {
        return billingClient.request<ApiResponse<Subscription[]>>('get', `${API_BASE}/subscriptions`, undefined, params)
    },

    async getSubscription(id: string): Promise<ApiResponse<Subscription>> {
        return billingClient.request<ApiResponse<Subscription>>('get', `${API_BASE}/subscriptions/${id}`)
    },

    async createSubscription(data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
        return billingClient.request<ApiResponse<Subscription>>('post', `${API_BASE}/subscriptions`, data)
    },

    async updateSubscription(id: string, data: Partial<Subscription>): Promise<ApiResponse<Subscription>> {
        return billingClient.request<ApiResponse<Subscription>>('put', `${API_BASE}/subscriptions/${id}`, data)
    },

    // Billing status methods
    async checkBillingStatus(userId: string): Promise<ApiResponse<BillingStatus>> {
        return billingClient.request<ApiResponse<BillingStatus>>('post', `${API_BASE}/check-billing-status`, { userId })
    },

    async getBillingPageInfo(userId: string): Promise<ApiResponse<BillingStatus>> {
        return billingClient.request<ApiResponse<BillingStatus>>('get', `${API_BASE}/billing-page/${userId}`)
    },

    // Recurring billing methods
    async getRecurringBillings(params?: { page?: number; limit?: number }): Promise<ApiResponse<RecurringBilling[]>> {
        return billingClient.request<ApiResponse<RecurringBilling[]>>('get', `${API_BASE}/recurring-billings`, undefined, params)
    },

    async getRecurringBilling(id: string): Promise<ApiResponse<RecurringBilling>> {
        return billingClient.request<ApiResponse<RecurringBilling>>('get', `${API_BASE}/recurring-billings/${id}`)
    },

    async createRecurringBilling(data: Partial<RecurringBilling>): Promise<ApiResponse<RecurringBilling>> {
        return billingClient.request<ApiResponse<RecurringBilling>>('post', `${API_BASE}/recurring-billings`, data)
    },

    async updateRecurringBilling(id: string, data: Partial<RecurringBilling>): Promise<ApiResponse<RecurringBilling>> {
        return billingClient.request<ApiResponse<RecurringBilling>>('put', `${API_BASE}/recurring-billings/${id}`, data)
    },

    async cancelRecurringBilling(id: string): Promise<ApiResponse<RecurringBilling>> {
        return billingClient.request<ApiResponse<RecurringBilling>>('post', `${API_BASE}/recurring-billings/${id}/cancel`)
    },

    async pauseRecurringBilling(id: string): Promise<ApiResponse<RecurringBilling>> {
        return billingClient.request<ApiResponse<RecurringBilling>>('post', `${API_BASE}/recurring-billings/${id}/pause`)
    },

    async resumeRecurringBilling(id: string): Promise<ApiResponse<RecurringBilling>> {
        return billingClient.request<ApiResponse<RecurringBilling>>('post', `${API_BASE}/recurring-billings/${id}/resume`)
    },

    // One-time billing methods
    async getOneTimeBillings(params?: { page?: number; limit?: number }): Promise<ApiResponse<OneTimeBilling[]>> {
        return billingClient.request<ApiResponse<OneTimeBilling[]>>('get', `${API_BASE}/one-time-billings`, undefined, params)
    },

    async getOneTimeBilling(id: string): Promise<ApiResponse<OneTimeBilling>> {
        return billingClient.request<ApiResponse<OneTimeBilling>>('get', `${API_BASE}/one-time-billings/${id}`)
    },

    async createOneTimeBilling(data: Partial<OneTimeBilling>): Promise<ApiResponse<OneTimeBilling>> {
        return billingClient.request<ApiResponse<OneTimeBilling>>('post', `${API_BASE}/one-time-billings`, data)
    },

    async processOneTimeBillingPayment(id: string, paymentData: any): Promise<ApiResponse<Payment>> {
        return billingClient.request<ApiResponse<Payment>>('post', `${API_BASE}/one-time-billings/${id}/process-payment`, paymentData)
    },

    // Transfer, withdrawal, and payout methods
    async processTransfer(data: any): Promise<ApiResponse<any>> {
        return billingClient.request<ApiResponse<any>>('post', `${API_BASE}/transfers`, data)
    },

    async processWithdrawal(data: any): Promise<ApiResponse<any>> {
        return billingClient.request<ApiResponse<any>>('post', `${API_BASE}/withdrawals`, data)
    },

    async processPayout(data: any): Promise<ApiResponse<any>> {
        return billingClient.request<ApiResponse<any>>('post', `${API_BASE}/payouts`, data)
    },
}

export default billingService
