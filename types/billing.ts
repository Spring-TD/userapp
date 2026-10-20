// Billing microservice types

export interface Invoice {
    id: string
    userId: string
    amount: number
    currency: string
    status: 'pending' | 'paid' | 'failed' | 'cancelled'
    dueDate: string
    createdAt: string
    updatedAt: string
    items?: InvoiceItem[]
    description?: string
}

export interface InvoiceItem {
    id: string
    description: string
    quantity: number
    unitPrice: number
    amount: number
}

export interface Payment {
    id: string
    invoiceId?: string
    userId: string
    amount: number
    currency: string
    status: 'pending' | 'successful' | 'failed'
    paymentMethod: string
    transactionId: string
    createdAt: string
    updatedAt: string
    metadata?: Record<string, any>
}

export interface Transaction {
    id: string
    userId: string
    type: 'payment' | 'refund' | 'transfer' | 'withdrawal' | 'payout'
    amount: number
    currency: string
    status: 'pending' | 'successful' | 'failed'
    paymentMethod: string
    transactionId: string
    date: string
    createdAt: string
    description?: string
    metadata?: Record<string, any>
}

export interface Subscription {
    id: string
    userId: string
    planId: string
    status: 'active' | 'cancelled' | 'expired' | 'paused'
    amount: number
    currency: string
    billingCycle: 'monthly' | 'yearly' | 'weekly'
    startDate: string
    endDate?: string
    nextBillingDate?: string
    createdAt: string
    updatedAt: string
}

export interface BillingHistory {
    id: string
    userId: string
    date: string
    amount: string
    status: 'Successful' | 'Failed' | 'Pending' | 'Incoming'
    paymentMethod: string
    transactionId: string
    link?: string
}

export interface PaymentMethod {
    id: string
    userId: string
    type: 'card' | 'bank_transfer' | 'wallet'
    cardLast4?: string
    cardBrand?: string
    cardExpMonth?: number
    cardExpYear?: number
    bankName?: string
    accountNumber?: string
    isDefault: boolean
    createdAt: string
}

export interface RecurringBilling {
    id: string
    userId: string
    amount: number
    currency: string
    billingCycle: number // in days
    billingTarget?: number
    billingCount: number
    billToType: 'merchants' | 'users'
    billToIds: string[]
    billingFor: string
    billingTitle: string
    status: 'active' | 'paused' | 'cancelled'
    nextBillingDate: string
    createdAt: string
    updatedAt: string
}

export interface OneTimeBilling {
    id: string
    userId: string
    amount: number
    currency: string
    description: string
    status: 'pending' | 'paid' | 'failed'
    dueDate: string
    createdAt: string
    updatedAt: string
}

export interface BillingStatus {
    userId: string
    hasSufficientFunds: boolean
    currentBalance: number
    pendingBills: number
    upcomingBills: OneTimeBilling[]
    currentBill?: OneTimeBilling
    shouldRedirect: boolean
}

export interface ApiResponse<T> {
    success: boolean
    message: string
    data: T
}

export interface PaginatedResponse<T> {
    success: boolean
    message: string
    data: T[]
    pagination?: {
        page: number
        limit: number
        total: number
        totalPages: number
    }
}
