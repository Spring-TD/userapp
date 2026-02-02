import { IInvoice, IPayment, ISubscription, BillingType } from '../models/Billing';
import { v4 as uuidv4 } from 'uuid';
// @ts-ignore
import { MockInvoice as Invoice, MockPayment as Payment, MockSubscription as Subscription } from './mockDB';

export interface CreateInvoiceData {
    merchantId: string;
    customerId?: string;
    amount: number;
    currency: string;
    items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
    billingType?: BillingType;
    dueDate?: Date;
    notes?: string;
}

export interface CreatePaymentData {
    invoiceId?: string;
    merchantId: string;
    amount: number;
    currency: string;
    method: 'card' | 'bank_transfer' | 'paypal' | 'crypto';
    transactionId?: string;
}

export interface CreateSubscriptionData {
    merchantId: string;
    customerId: string;
    planId: string;
    amount: number;
    interval: 'day' | 'week' | 'month' | 'year';
}

export class BillingService {

    // Create Invoice
    static async createInvoice(data: CreateInvoiceData): Promise<IInvoice> {
        return Invoice.create({
            merchantId: data.merchantId,
            customerId: data.customerId,
            amount: data.amount,
            currency: data.currency,
            items: data.items,
            billingType: data.billingType || BillingType.ONE_TIME,
            dueDate: data.dueDate,
            notes: data.notes,
            status: 'pending'
        });
    }

    // Get Invoices
    static async getInvoices(merchantId: string): Promise<IInvoice[]> {
        return Invoice.find({ merchantId }).sort({ createdAt: -1 });
    }

    // Record Payment
    static async recordPayment(data: CreatePaymentData): Promise<IPayment> {
        const payment = await Payment.create({
            invoiceId: data.invoiceId,
            merchantId: data.merchantId,
            amount: data.amount,
            currency: data.currency,
            method: data.method,
            status: 'completed', // Assuming successful recording
            transactionId: data.transactionId
        });

        if (data.invoiceId) {
            const invoice = await Invoice.findById(data.invoiceId);
            if (invoice) {
                invoice.status = 'paid';
                invoice.paidDate = new Date();
                await invoice.save();
            }
        }

        return payment;
    }

    // Create Subscription
    static async createSubscription(data: CreateSubscriptionData): Promise<ISubscription> {
        // Calculate next billing date
        const now = new Date();
        let nextDate = new Date(now);

        switch (data.interval) {
            case 'day': nextDate.setDate(now.getDate() + 1); break;
            case 'week': nextDate.setDate(now.getDate() + 7); break;
            case 'month': nextDate.setMonth(now.getMonth() + 1); break;
            case 'year': nextDate.setFullYear(now.getFullYear() + 1); break;
        }

        return Subscription.create({
            merchantId: data.merchantId,
            customerId: data.customerId,
            planId: data.planId,
            amount: data.amount,
            interval: data.interval,
            status: 'active',
            startDate: now,
            nextBillingDate: nextDate
        });
    }

    // Get Subscriptions by Merchant
    static async getSubscriptions(merchantId: string): Promise<ISubscription[]> {
        return Subscription.find({ merchantId }).sort({ createdAt: -1 });
    }
}
