// Utility functions for billing operations

/**
 * Format currency amount with symbol
 */
export function formatCurrency(amount: number, currency: string = 'NGN'): string {
    const symbols: Record<string, string> = {
        NGN: '₦',
        USD: '$',
        EUR: '€',
        GBP: '£',
    }

    const symbol = symbols[currency] || currency
    return `${symbol}${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`
}

/**
 * Format date for display
 */
export function formatDate(date: string | Date, format: 'short' | 'long' = 'short'): string {
    const d = typeof date === 'string' ? new Date(date) : date

    if (format === 'long') {
        return d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        })
    }

    // Short format: DD/MM/YYYY
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear()
    return `${day}/${month}/${year}`
}

/**
 * Get status badge color based on status
 */
export function getStatusColor(status: string): string {
    const statusColors: Record<string, string> = {
        successful: 'bg-green-100 text-green-800',
        success: 'bg-green-100 text-green-800',
        paid: 'bg-green-100 text-green-800',
        active: 'bg-green-100 text-green-800',

        failed: 'bg-red-100 text-red-800',
        cancelled: 'bg-red-100 text-red-800',
        expired: 'bg-red-100 text-red-800',

        pending: 'bg-orange-100 text-orange-800',
        paused: 'bg-orange-100 text-orange-800',

        incoming: 'bg-gray-100 text-gray-800 border border-gray-300',
    }

    return statusColors[status.toLowerCase()] || 'bg-gray-100 text-gray-800'
}

/**
 * Calculate total from billing items
 */
export function calculateBillingTotal(items: Array<{ amount: number }>): number {
    return items.reduce((total, item) => total + item.amount, 0)
}

/**
 * Get payment method display name
 */
export function getPaymentMethodDisplay(method: string, last4?: string): string {
    if (method.toLowerCase().includes('visa') || method.toLowerCase().includes('card')) {
        return last4 ? `Visa ${last4}` : 'Visa Card'
    }
    if (method.toLowerCase().includes('mastercard')) {
        return last4 ? `Mastercard ${last4}` : 'Mastercard'
    }
    if (method.toLowerCase().includes('bank')) {
        return 'Bank transfer'
    }
    return method
}

/**
 * Check if date is overdue
 */
export function isOverdue(dueDate: string | Date): boolean {
    const due = typeof dueDate === 'string' ? new Date(dueDate) : dueDate
    return due < new Date()
}

/**
 * Get relative time (e.g., "2 days ago", "in 3 days")
 */
export function getRelativeTime(date: string | Date): string {
    const d = typeof date === 'string' ? new Date(date) : date
    const now = new Date()
    const diffMs = d.getTime() - now.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Tomorrow'
    if (diffDays === -1) return 'Yesterday'
    if (diffDays > 1) return `in ${diffDays} days`
    if (diffDays < -1) return `${Math.abs(diffDays)} days ago`

    return formatDate(d)
}

/**
 * Validate card number (basic Luhn algorithm)
 */
export function validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s/g, '')
    if (!/^\d+$/.test(cleaned)) return false

    let sum = 0
    let isEven = false

    for (let i = cleaned.length - 1; i >= 0; i--) {
        let digit = parseInt(cleaned[i], 10)

        if (isEven) {
            digit *= 2
            if (digit > 9) digit -= 9
        }

        sum += digit
        isEven = !isEven
    }

    return sum % 10 === 0
}

/**
 * Format card number with spaces
 */
export function formatCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '')
    const groups = cleaned.match(/.{1,4}/g) || []
    return groups.join(' ')
}

/**
 * Get card brand from number
 */
export function getCardBrand(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s/g, '')

    if (/^4/.test(cleaned)) return 'Visa'
    if (/^5[1-5]/.test(cleaned)) return 'Mastercard'
    if (/^3[47]/.test(cleaned)) return 'American Express'
    if (/^6(?:011|5)/.test(cleaned)) return 'Discover'

    return 'Unknown'
}
