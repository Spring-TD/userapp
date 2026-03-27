import { Request, Response } from 'express';
import { BillingService } from '../services/billingService';
import { BillingScheduler } from '../services/billingScheduler';
import { RecurringBillingService } from '../services/recurringBillingService';

export class BillingController {
  // Invoice methods
  static async createInvoice(req: Request, res: Response) {
    try {
      const invoiceData = req.body;
      const result = await BillingService.createInvoice(invoiceData);
      res.status(201).json({
        success: true,
        message: 'Invoice created successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating invoice',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BillingService.getInvoice(id);
      res.status(200).json({
        success: true,
        message: 'Invoice retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving invoice',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async listInvoices(req: Request, res: Response) {
    try {
      const filters = req.query;
      const result = await BillingService.listInvoices(filters);
      res.status(200).json({
        success: true,
        message: 'Invoices retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving invoices',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async updateInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const result = await BillingService.updateInvoice(id, updateData);
      res.status(200).json({
        success: true,
        message: 'Invoice updated successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating invoice',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async deleteInvoice(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BillingService.deleteInvoice(id);
      res.status(200).json({
        success: true,
        message: 'Invoice deleted successfully',
        data: { deleted: result }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error deleting invoice',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Payment methods
  static async processPayment(req: Request, res: Response) {
    try {
      const paymentData = req.body;
      const result = await BillingService.processPayment(paymentData);
      res.status(201).json({
        success: true,
        message: 'Payment processed successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BillingService.getPayment(id);
      res.status(200).json({
        success: true,
        message: 'Payment retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async listPayments(req: Request, res: Response) {
    try {
      const filters = req.query;
      const result = await BillingService.listPayments(filters);
      res.status(200).json({
        success: true,
        message: 'Payments retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving payments',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Subscription methods
  static async createSubscription(req: Request, res: Response) {
    try {
      const subscriptionData = req.body;
      const result = await BillingService.createSubscription(subscriptionData);
      res.status(201).json({
        success: true,
        message: 'Subscription created successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async getSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BillingService.getSubscription(id);
      res.status(200).json({
        success: true,
        message: 'Subscription retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async listSubscriptions(req: Request, res: Response) {
    try {
      const filters = req.query;
      const result = await BillingService.listSubscriptions(filters);
      res.status(200).json({
        success: true,
        message: 'Subscriptions retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving subscriptions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async updateSubscription(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      const result = await BillingService.updateSubscription(id, updateData);
      res.status(200).json({
        success: true,
        message: 'Subscription updated successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating subscription',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Transaction methods
  static async getTransaction(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BillingService.getTransaction(id);
      res.status(200).json({
        success: true,
        message: 'Transaction retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving transaction',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  static async listTransactions(req: Request, res: Response) {
    try {
      const filters = req.query;
      const result = await BillingService.listTransactions(filters);
      res.status(200).json({
        success: true,
        message: 'Transactions retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving transactions',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check billing status and handle insufficient funds
   */
  static async checkBillingStatus(req: Request, res: Response) {
    try {
      const { walletId, userId, amount, description } = req.body;
      
      if (!walletId || !userId || !amount) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameters: walletId, userId, and amount are required'
        });
      }
      
      // Validate amount is a positive number
      const amountNum = Number(amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a positive number'
        });
      }
      
      const result = await BillingService.processBillingWithInsufficientFundsHandling(
        walletId,
        userId,
        amountNum,
        description || 'Billing operation'
      );
      
      if (!result.success) {
        return res.status(500).json({
          success: false,
          message: result.message,
          error: result.error
        });
      }
      
      if (result.requiresBillingPageRedirect) {
        return res.status(200).json({
          success: true,
          message: result.message,
          redirectToBillingPage: true
        });
      } else {
        return res.status(200).json({
          success: true,
          message: result.message,
          redirectToBillingPage: false
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error checking billing status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get billing page information for a user
   */
  static async getBillingPageInfo(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: 'Missing required parameter: userId'
        });
      }
      
      // In a real implementation, this would fetch user billing information
      // For now, we'll return mock data
      const billingInfo = {
        userId,
        outstandingBalance: 0,
        pendingCharges: [],
        paymentMethods: [],
        billingHistory: []
      };
      
      return res.status(200).json({
        success: true,
        message: 'Billing information retrieved successfully',
        data: billingInfo
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: 'Error retrieving billing information',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Manually trigger recurring billing process
   */
  static async triggerRecurringBilling(req: Request, res: Response) {
    try {
      const scheduler = BillingScheduler.getInstance();
      await scheduler.runNow();
      
      res.status(200).json({
        success: true,
        message: 'Recurring billing process triggered successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error triggering recurring billing process',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
  
  /**
   * Get recurring billing status
   */
  static async getRecurringBillingStatus(req: Request, res: Response) {
    try {
      // In a real implementation, this would return the status of the scheduler
      // For now, we'll return mock data
      res.status(200).json({
        success: true,
        message: 'Recurring billing status retrieved successfully',
        data: {
          schedulerRunning: true,
          lastRun: new Date().toISOString(),
          nextRun: new Date(Date.now() + 3600000).toISOString(), // 1 hour from now
          interval: 'hourly'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving recurring billing status',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a new recurring billing
   */
  static async createRecurringBilling(req: Request, res: Response) {
    try {
      const billingData = req.body;
      const result = await RecurringBillingService.createRecurringBilling(billingData);
      res.status(201).json({
        success: true,
        message: 'Recurring billing created successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating recurring billing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a specific recurring billing
   */
  static async getRecurringBilling(req: Request, res: Response) {
    try {
      const { id } = req.params;
      // In a real implementation, this would fetch from database
      // For now, we'll return mock data
      const result = {
        id,
        amount: 200,
        billingType: 'recurring',
        billingCycle: 30,
        billingTarget: 20000,
        billingCount: 1,
        billTo: 'user_ref',
        billingFor: 'description',
        billingTitle: 'name this billing',
        billingException: {
          maxAttempts: 3,
          currentAttempts: 0
        },
        status: 'active',
        startDate: new Date(),
        nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        totalBilled: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      res.status(200).json({
        success: true,
        message: 'Recurring billing retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving recurring billing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List recurring billings
   */
  static async listRecurringBillings(req: Request, res: Response) {
    try {
      // In a real implementation, this would query the database
      // For now, we'll return mock data
      const result = [
        {
          id: 'rb_123',
          amount: 200,
          billingType: 'recurring',
          billingCycle: 30,
          billingTarget: 20000,
          billingCount: 1,
          billTo: 'user_ref',
          billingFor: 'description',
          billingTitle: 'name this billing',
          billingException: {
            maxAttempts: 3,
            currentAttempts: 0
          },
          status: 'active',
          startDate: new Date(),
          nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          totalBilled: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      res.status(200).json({
        success: true,
        message: 'Recurring billings retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving recurring billings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update a recurring billing
   */
  static async updateRecurringBilling(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      // In a real implementation, this would update in database
      // For now, we'll return mock data
      const result = {
        id,
        ...updateData,
        updatedAt: new Date()
      };
      
      res.status(200).json({
        success: true,
        message: 'Recurring billing updated successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error updating recurring billing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Cancel a recurring billing
   */
  static async cancelRecurringBilling(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await RecurringBillingService.cancelRecurringBilling(id);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error cancelling recurring billing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Pause a recurring billing
   */
  static async pauseRecurringBilling(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await RecurringBillingService.pauseRecurringBilling(id);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error pausing recurring billing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Resume a recurring billing
   */
  static async resumeRecurringBilling(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await RecurringBillingService.resumeRecurringBilling(id);
      
      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message
        });
      } else {
        res.status(500).json({
          success: false,
          message: result.message
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error resuming recurring billing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // One-time billing methods
  /**
   * Create a one-time billing entry
   */
  static async createOneTimeBilling(req: Request, res: Response) {
    try {
      const billingData = req.body;
      const result = await BillingService.createOneTimeBilling(billingData);
      res.status(201).json({
        success: true,
        message: 'One-time billing created successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error creating one-time billing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get a one-time billing entry
   */
  static async getOneTimeBilling(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BillingService.getOneTimeBilling(id);
      if (result) {
        res.status(200).json({
          success: true,
          message: 'One-time billing retrieved successfully',
          data: result
        });
      } else {
        res.status(404).json({
          success: false,
          message: 'One-time billing not found'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving one-time billing',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * List one-time billing entries
   */
  static async listOneTimeBillings(req: Request, res: Response) {
    try {
      const filters = req.query;
      const result = await BillingService.listOneTimeBillings(filters);
      res.status(200).json({
        success: true,
        message: 'One-time billings retrieved successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error retrieving one-time billings',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process a one-time billing payment
   */
  static async processOneTimeBillingPayment(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await BillingService.processOneTimeBillingPayment(id);
      res.status(200).json({
        success: true,
        message: 'One-time billing payment processed successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing one-time billing payment',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Transfer, Withdrawal, and Payout methods
  /**
   * Process a transfer operation and create a one-time billing entry
   */
  static async processTransfer(req: Request, res: Response) {
    try {
      const transferData = req.body;
      const result = await BillingService.processTransfer(transferData);
      res.status(201).json({
        success: true,
        message: 'Transfer processed and one-time billing created successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing transfer',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process a withdrawal operation and create a one-time billing entry
   */
  static async processWithdrawal(req: Request, res: Response) {
    try {
      const withdrawalData = req.body;
      const result = await BillingService.processWithdrawal(withdrawalData);
      res.status(201).json({
        success: true,
        message: 'Withdrawal processed and one-time billing created successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing withdrawal',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Process a payout operation and create a one-time billing entry
   */
  static async processPayout(req: Request, res: Response) {
    try {
      const payoutData = req.body;
      const result = await BillingService.processPayout(payoutData);
      res.status(201).json({
        success: true,
        message: 'Payout processed and one-time billing created successfully',
        data: result
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing payout',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}
