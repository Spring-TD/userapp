import { Request, Response, NextFunction } from 'express';
import recordService from '../services/recordService';
import { CreateRecordRequest, TransactionType, FinancialCategory, FundRecordRequest, DebitRecordRequest } from '../types/record';
import logger from '../utils/logger';
import Joi from 'joi';

/**
 * Validation schema for createRecord webhook
 */
const createRecordSchema = Joi.object({
  userId: Joi.string().required(),
  email: Joi.string().email().required(),
  firstName: Joi.string().min(1).max(100).required(),
  lastName: Joi.string().min(1).max(100).required(),
  userType: Joi.string().valid('MERCHANT', 'USER').required(),
  userMerchantId: Joi.string().min(5).max(50).required(),
  country: Joi.string().min(2).max(100).required(),
  phone: Joi.string().optional(),
  verifiedAt: Joi.string().isoDate().required(),
  metadata: Joi.object().optional()
});

/**
 * RecordController
 * Handles HTTP requests for record management
 */
export class RecordController {
  /**
   * POST /api/v1/records/webhook/create
   * Webhook endpoint called by service-auth-ms after successful account verification
   */
  async createRecordWebhook(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      logger.info('Received createRecord webhook request', {
        userId: req.body.userId,
        email: req.body.email,
        userType: req.body.userType
      });

      // Validate request body
      const { error, value } = createRecordSchema.validate(req.body);
      if (error) {
        logger.warn('Invalid webhook request', { error: error.details });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error.details.map(d => d.message).join(', ')
        });
        return;
      }

      const request: CreateRecordRequest = value as CreateRecordRequest;

      // Create record
      const result = await recordService.createRecord(request);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in createRecordWebhook', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/:recordId
   * Get record by ID
   */
  async getRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;

      const record = await recordService.getRecordById(recordId);

      if (!record) {
        res.status(404).json({
          success: false,
          error: 'Record not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { record }
      });
    } catch (error) {
      logger.error('Error in getRecord', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/user/:userId
   * Get record by user ID
   */
  async getRecordByUserId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userId } = req.params;

      const record = await recordService.getRecordByUserId(userId);

      if (!record) {
        res.status(404).json({
          success: false,
          error: 'Record not found for this user'
        });
        return;
      }

      res.json({
        success: true,
        data: { record }
      });
    } catch (error) {
      logger.error('Error in getRecordByUserId', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/email/:email
   * Get record by email
   */
  async getRecordByEmail(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { email } = req.params;

      const record = await recordService.getRecordByEmail(email);

      if (!record) {
        res.status(404).json({
          success: false,
          error: 'Record not found for this email'
        });
        return;
      }

      res.json({
        success: true,
        data: { record }
      });
    } catch (error) {
      logger.error('Error in getRecordByEmail', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/merchants
   * Get all merchant records
   */
  async getAllMerchants(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const merchants = await recordService.getAllMerchantRecords();

      res.json({
        success: true,
        data: {
          merchants,
          count: merchants.length
        }
      });
    } catch (error) {
      logger.error('Error in getAllMerchants', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/merchant/:userMerchantId/users
   * Get merchant-user records by merchant ID
   */
  async getMerchantUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userMerchantId } = req.params;

      const users = await recordService.getMerchantUsersByMerchantId(userMerchantId);

      res.json({
        success: true,
        data: {
          users,
          count: users.length,
          userMerchantId
        }
      });
    } catch (error) {
      logger.error('Error in getMerchantUsers', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/:recordId/ledger
   * Get ledger entries for a record
   */
  async getLedgerEntries(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;
      const { 
        entryType, 
        financialCategory,
        transactionType,
        startDate, 
        endDate, 
        minAmount,
        maxAmount,
        sortBy,
        sortOrder,
        limit, 
        offset 
      } = req.query;

      const query: any = { recordId };

      if (entryType) {
        query.entryType = entryType;
      }
      if (financialCategory) {
        query.financialCategory = financialCategory;
      }
      if (transactionType) {
        query.transactionType = transactionType;
      }
      if (startDate) {
        query.startDate = new Date(startDate as string);
      }
      if (endDate) {
        query.endDate = new Date(endDate as string);
      }
      if (minAmount) {
        query.minAmount = parseFloat(minAmount as string);
      }
      if (maxAmount) {
        query.maxAmount = parseFloat(maxAmount as string);
      }
      if (sortBy) {
        query.sortBy = sortBy;
      }
      if (sortOrder) {
        query.sortOrder = sortOrder;
      }
      if (limit) {
        query.limit = parseInt(limit as string, 10);
      }
      if (offset) {
        query.offset = parseInt(offset as string, 10);
      }

      const entries = await recordService.getLedgerEntries(query);

      res.json({
        success: true,
        data: {
          entries,
          count: entries.length,
          recordId,
          filters: {
            entryType: query.entryType,
            financialCategory: query.financialCategory,
            transactionType: query.transactionType,
            dateRange: query.startDate || query.endDate ? { startDate: query.startDate, endDate: query.endDate } : undefined,
            amountRange: query.minAmount || query.maxAmount ? { min: query.minAmount, max: query.maxAmount } : undefined,
            sortBy: query.sortBy,
            sortOrder: query.sortOrder
          }
        }
      });
    } catch (error) {
      logger.error('Error in getLedgerEntries', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/:recordId/ledger/summary
   * Get ledger summary for a record
   */
  async getLedgerSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;

      const summary = await recordService.getLedgerSummary(recordId);

      if (!summary) {
        res.status(404).json({
          success: false,
          error: 'Record not found'
        });
        return;
      }

      res.json({
        success: true,
        data: { summary }
      });
    } catch (error) {
      logger.error('Error in getLedgerSummary', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/records/:recordId/ledger/entry
   * Add a comprehensive ledger entry (debit or credit) with full transaction details
   */
  async addLedgerEntry(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;
      const { 
        entryType, 
        debitAmount, 
        transactionDescription,
        transactionType,
        financialCategory,
        txnRef,
        sessionId,
        fromCurrency,
        toCurrency,
        senderInfo,
        feeBreakdown,
        thirdPartyRefId,
        beneficiaryInfo,
        status
      } = req.body;

      // Validate required fields
      if (!entryType || !debitAmount || !transactionDescription || !transactionType || 
          !txnRef || !sessionId || !fromCurrency || !toCurrency || !senderInfo || !feeBreakdown) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: entryType, debitAmount, transactionDescription, transactionType, txnRef, sessionId, fromCurrency, toCurrency, senderInfo, feeBreakdown'
        });
        return;
      }

      // Validate financialCategory if provided
      if (financialCategory && !Object.values(FinancialCategory).includes(financialCategory)) {
        res.status(400).json({
          success: false,
          error: 'Invalid financial category. Must be one of: LOAN, SAVINGS, MORTGAGE, COMMODITY, WALLET'
        });
        return;
      }

      // Validate senderInfo structure
      if (!senderInfo.full_name || !senderInfo.email || !senderInfo.phone) {
        res.status(400).json({
          success: false,
          error: 'senderInfo must include full_name, email, and phone'
        });
        return;
      }

      // Validate feeBreakdown structure
      if (feeBreakdown.payout_fee === undefined || feeBreakdown.merchant_commission === undefined) {
        res.status(400).json({
          success: false,
          error: 'feeBreakdown must include payout_fee and merchant_commission'
        });
        return;
      }

      const entry = await recordService.addLedgerEntry(
        recordId,
        entryType,
        debitAmount,
        transactionDescription,
        {
          transactionType,
          financialCategory,
          txnRef,
          sessionId,
          fromCurrency,
          toCurrency,
          senderInfo,
          feeBreakdown,
          thirdPartyRefId,
          beneficiaryInfo,
          status
        }
      );

      if (!entry) {
        res.status(400).json({
          success: false,
          error: 'Failed to add ledger entry. Record may not exist.'
        });
        return;
      }

      res.status(201).json({
        success: true,
        data: { entry },
        message: 'Ledger entry added successfully'
      });
    } catch (error) {
      logger.error('Error in addLedgerEntry', { error });
      next(error);
    }
  }

  /**
   * PUT /api/v1/records/:recordId/deactivate
   * Deactivate a record
   */
  async deactivateRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;

      const success = await recordService.deactivateRecord(recordId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Record not found or could not be deactivated'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Record deactivated successfully'
      });
    } catch (error) {
      logger.error('Error in deactivateRecord', { error });
      next(error);
    }
  }

  /**
   * PUT /api/v1/records/:recordId/activate
   * Activate a record
   */
  async activateRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;

      const success = await recordService.activateRecord(recordId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Record not found or could not be activated'
        });
        return;
      }

      res.json({
        success: true,
        message: 'Record activated successfully'
      });
    } catch (error) {
      logger.error('Error in activateRecord', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/records/:recordId/fund
   * Fund a record in a specific financial category (CREDIT operation)
   */
  async fundRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;
      const {
        category,
        amount,
        description,
        transactionType,
        txnRef,
        sessionId,
        fromCurrency,
        toCurrency,
        senderInfo,
        feeBreakdown,
        thirdPartyRefId,
        beneficiaryInfo
      } = req.body;

      // Validate required fields
      if (!category || !amount || !description || !transactionType ||
          !txnRef || !sessionId || !fromCurrency || !toCurrency || !senderInfo || !feeBreakdown) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: category, amount, description, transactionType, txnRef, sessionId, fromCurrency, toCurrency, senderInfo, feeBreakdown'
        });
        return;
      }

      // Validate category
      if (!Object.values(FinancialCategory).includes(category)) {
        res.status(400).json({
          success: false,
          error: 'Invalid financial category. Must be one of: LOAN, SAVINGS, MORTGAGE, COMMODITY, WALLET'
        });
        return;
      }

      // Validate senderInfo structure
      if (!senderInfo.full_name || !senderInfo.email || !senderInfo.phone) {
        res.status(400).json({
          success: false,
          error: 'senderInfo must include full_name, email, and phone'
        });
        return;
      }

      // Validate feeBreakdown structure
      if (feeBreakdown.payout_fee === undefined || feeBreakdown.merchant_commission === undefined) {
        res.status(400).json({
          success: false,
          error: 'feeBreakdown must include payout_fee and merchant_commission'
        });
        return;
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be a positive number'
        });
        return;
      }

      const request: FundRecordRequest = {
        recordId,
        category,
        amount,
        description,
        transactionType,
        txnRef,
        sessionId,
        fromCurrency,
        toCurrency,
        senderInfo,
        feeBreakdown,
        thirdPartyRefId,
        beneficiaryInfo
      };

      const result = await recordService.fundRecord(request);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in fundRecord', { error });
      next(error);
    }
  }

  /**
   * POST /api/v1/records/:recordId/debit
   * Debit a record in a specific financial category (DEBIT operation)
   */
  async debitRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;
      const {
        category,
        amount,
        description,
        transactionType,
        txnRef,
        sessionId,
        fromCurrency,
        toCurrency,
        senderInfo,
        feeBreakdown,
        thirdPartyRefId,
        beneficiaryInfo
      } = req.body;

      // Validate required fields
      if (!category || !amount || !description || !transactionType ||
          !txnRef || !sessionId || !fromCurrency || !toCurrency || !senderInfo || !feeBreakdown) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields: category, amount, description, transactionType, txnRef, sessionId, fromCurrency, toCurrency, senderInfo, feeBreakdown'
        });
        return;
      }

      // Validate category
      if (!Object.values(FinancialCategory).includes(category)) {
        res.status(400).json({
          success: false,
          error: 'Invalid financial category. Must be one of: LOAN, SAVINGS, MORTGAGE, COMMODITY, WALLET'
        });
        return;
      }

      // Validate senderInfo structure
      if (!senderInfo.full_name || !senderInfo.email || !senderInfo.phone) {
        res.status(400).json({
          success: false,
          error: 'senderInfo must include full_name, email, and phone'
        });
        return;
      }

      // Validate feeBreakdown structure
      if (feeBreakdown.payout_fee === undefined || feeBreakdown.merchant_commission === undefined) {
        res.status(400).json({
          success: false,
          error: 'feeBreakdown must include payout_fee and merchant_commission'
        });
        return;
      }

      // Validate amount
      if (typeof amount !== 'number' || amount <= 0) {
        res.status(400).json({
          success: false,
          error: 'Amount must be a positive number'
        });
        return;
      }

      const request: DebitRecordRequest = {
        recordId,
        category,
        amount,
        description,
        transactionType,
        txnRef,
        sessionId,
        fromCurrency,
        toCurrency,
        senderInfo,
        feeBreakdown,
        thirdPartyRefId,
        beneficiaryInfo
      };

      const result = await recordService.debitRecord(request);

      if (!result.success) {
        res.status(400).json(result);
        return;
      }

      res.status(201).json(result);
    } catch (error) {
      logger.error('Error in debitRecord', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/:recordId/category-summary
   * Get category-specific summary for a record
   */
  async getCategorySummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;

      const summary = await recordService.getCategorySummary(recordId);

      res.json({
        success: true,
        data: {
          summary,
          recordId
        }
      });
    } catch (error) {
      logger.error('Error in getCategorySummary', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/:recordId/analytics
   * Get comprehensive analytics summary for a record
   */
  async getAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { recordId } = req.params;
      const { startDate, endDate } = req.query;

      const options: any = {};
      if (startDate) {
        options.startDate = new Date(startDate as string);
      }
      if (endDate) {
        options.endDate = new Date(endDate as string);
      }

      const analytics = await recordService.getAnalytics(recordId, options);

      if (!analytics) {
        res.status(404).json({
          success: false,
          error: 'Record not found or analytics could not be generated'
        });
        return;
      }

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      logger.error('Error in getAnalytics', { error });
      next(error);
    }
  }

  /**
   * GET /api/v1/records/merchant/:userMerchantId/analytics
   * Get aggregated analytics for a merchant (includes all their users)
   */
  async getMerchantAnalytics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { userMerchantId } = req.params;
      const { startDate, endDate } = req.query;

      const options: any = {};
      if (startDate) {
        options.startDate = new Date(startDate as string);
      }
      if (endDate) {
        options.endDate = new Date(endDate as string);
      }

      const analytics = await recordService.getMerchantAnalytics(userMerchantId, options);

      if (!analytics) {
        res.status(404).json({
          success: false,
          error: 'Merchant not found or analytics could not be generated'
        });
        return;
      }

      res.json({
        success: true,
        data: { analytics }
      });
    } catch (error) {
      logger.error('Error in getMerchantAnalytics', { error });
      next(error);
    }
  }
}

export default new RecordController();
