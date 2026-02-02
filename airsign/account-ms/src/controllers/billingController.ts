import { Request, Response } from 'express';
import { BillingService, CreateInvoiceData, CreatePaymentData, CreateSubscriptionData } from '../services/billingService';

export class BillingController {

    static async createInvoice(req: Request, res: Response) {
        try {
            const invoice = await BillingService.createInvoice(req.body as CreateInvoiceData);
            res.status(201).json({ success: true, invoice });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async getInvoices(req: Request, res: Response) {
        try {
            const invoices = await BillingService.getInvoices(req.params['merchantId'] as string);
            res.status(200).json({ success: true, invoices });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async recordPayment(req: Request, res: Response) {
        try {
            const payment = await BillingService.recordPayment(req.body as CreatePaymentData);
            res.status(201).json({ success: true, payment });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async createSubscription(req: Request, res: Response) {
        try {
            const subscription = await BillingService.createSubscription(req.body as CreateSubscriptionData);
            res.status(201).json({ success: true, subscription });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }

    static async getSubscriptions(req: Request, res: Response) {
        try {
            const subscriptions = await BillingService.getSubscriptions(req.params['merchantId'] as string);
            res.status(200).json({ success: true, subscriptions });
        } catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
