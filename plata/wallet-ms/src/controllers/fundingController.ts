import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services';
import { logger } from '../utils/logger';
import { validateInput, fundingCallbackSchema } from '../utils/validation';
import { MerchantWalletType } from '../models/Wallet';

// Define interfaces for the validated data
interface FundingCallbackData {
  walletId?: string; // Optional if userId + merchantId provided
  userId?: string; // For user wallet funding (alternative to walletId)
  amount: number;
  currency: string;
  transactionId: string;
  paymentMethod: string;
  status: string;
  description?: string;
  providerReference?: string;
  signature?: string; // For webhook authentication
  merchantId?: string; // For merchant wallet funding OR identifying user wallet
  appId?: string; // Optional app scope for merchant wallet funding
  merchantWalletType?: MerchantWalletType; // For merchant wallet funding
}

// In-memory store for processed transactions (prevent duplicates)
// In production, use Redis or database
const processedTransactions = new Set<string>();

export class FundingController {
  /**
   * POST /api/v1/wallets/funding/callback
   * Webhook endpoint for funding notifications from payment providers
   * This endpoint will be called by external payment providers when a funding transaction is completed
   */
  static async handleFundingCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const callbackData = req.body;
      
      logger.info('Received funding callback', {
        transactionId: callbackData.transactionId,
        walletId: callbackData.walletId,
        userId: callbackData.userId,
        merchantId: callbackData.merchantId,
        merchantWalletType: callbackData.merchantWalletType,
        amount: callbackData.amount,
        status: callbackData.status
      });
      
      // Validate input data
      const { error, value } = validateInput<FundingCallbackData>(fundingCallbackSchema, callbackData);
      if (error) {
        logger.warn('Funding callback validation failed', { error });
        res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: error
        });
        return;
      }
      
      const { walletId, userId, amount, transactionId, status, description, providerReference, merchantId, appId, merchantWalletType } = value!;
      
      // Check for duplicate transaction
      if (processedTransactions.has(transactionId)) {
        logger.warn('Duplicate funding callback received', {
          transactionId,
          walletId,
          userId,
          merchantId
        });
        
        res.status(200).json({
          success: true,
          message: 'Transaction already processed',
          duplicate: true
        });
        return;
      }
      
      // Verify the callback is for a successful transaction
      if (status !== 'SUCCESS' && status !== 'COMPLETED') {
        logger.info('Funding callback received for non-successful transaction', {
          transactionId,
          status
        });
        
        res.status(200).json({
          success: true,
          message: 'Callback received but transaction not successful'
        });
        return;
      }
      
      // Handle merchant wallet funding
      if (merchantId && merchantWalletType) {
        logger.info('Processing merchant wallet funding', {
          merchantId,
          merchantWalletType,
          amount,
          transactionId
        });
        
        // Get the specific merchant wallet
        const merchantWalletResult = await WalletService.getMerchantWalletByType(merchantId, merchantWalletType, appId);
        if (!merchantWalletResult.success || !merchantWalletResult.wallet) {
          logger.error('Failed to find merchant wallet for funding', {
            merchantId,
            appId,
            merchantWalletType,
            transactionId
          });
          
          res.status(404).json({
            success: false,
            error: `Merchant ${merchantWalletType} wallet not found`
          });
          return;
        }
        
        // Credit the merchant wallet
        const result = await WalletService.updateWalletBalance(
          merchantWalletResult.wallet.id,
          amount,
          description || `Funding via ${providerReference || 'external provider'} for ${merchantWalletType} wallet`
        );
        
        if (!result.success) {
          logger.error('Failed to update merchant wallet balance from funding callback', {
            walletId: merchantWalletResult.wallet.id,
            amount,
            error: result.error
          });
          
          res.status(500).json({
            success: false,
            error: result.error
          });
          return;
        }
        
        // Mark transaction as processed
        processedTransactions.add(transactionId);
        
        logger.info('Merchant wallet balance updated from funding callback', {
          walletId: merchantWalletResult.wallet.id,
          merchantId,
          appId,
          merchantWalletType,
          amount,
          newMainBalance: result.wallet?.mainBalance,
          newLedgerBalance: result.wallet?.ledgerBalance,
          transactionId
        });
        
        // Send acknowledgment to the payment provider
        res.status(200).json({
          success: true,
          message: 'Merchant wallet funding callback processed successfully',
          data: {
            walletId: merchantWalletResult.wallet.id,
            merchantId,
            appId,
            merchantWalletType,
            newMainBalance: result.wallet?.mainBalance,
            newLedgerBalance: result.wallet?.ledgerBalance,
            transactionId
          }
        });
        return;
      }
      
      // Handle user wallet funding by userId + merchantId
      if (userId && merchantId && !walletId) {
        logger.info('Processing user wallet funding by userId', {
          userId,
          merchantId,
          amount,
          transactionId
        });
        
        // Get the user wallet
        const userWalletResult = await WalletService.getUserWallet(userId);
        if (!userWalletResult.success || !userWalletResult.wallet) {
          logger.error('Failed to find user wallet for funding', {
            userId,
            merchantId,
            transactionId
          });
          
          res.status(404).json({
            success: false,
            error: 'User wallet not found'
          });
          return;
        }
        
        // Verify the wallet belongs to the specified merchant
        if (userWalletResult.wallet.merchantId !== merchantId) {
          logger.error('User wallet does not belong to specified merchant', {
            userId,
            walletMerchantId: userWalletResult.wallet.merchantId,
            requestedMerchantId: merchantId,
            transactionId
          });
          
          res.status(400).json({
            success: false,
            error: 'User wallet does not belong to the specified merchant'
          });
          return;
        }
        
        // Credit the user wallet
        const result = await WalletService.updateWalletBalance(
          userWalletResult.wallet.id,
          amount,
          description || `Funding via ${providerReference || 'external provider'}`
        );
        
        if (!result.success) {
          logger.error('Failed to update user wallet balance from funding callback', {
            walletId: userWalletResult.wallet.id,
            userId,
            merchantId,
            amount,
            error: result.error
          });
          
          res.status(500).json({
            success: false,
            error: result.error
          });
          return;
        }
        
        // Mark transaction as processed
        processedTransactions.add(transactionId);
        
        logger.info('User wallet balance updated from funding callback', {
          walletId: userWalletResult.wallet.id,
          userId,
          merchantId,
          amount,
          newMainBalance: result.wallet?.mainBalance,
          newLedgerBalance: result.wallet?.ledgerBalance,
          transactionId
        });
        
        // Send acknowledgment to the payment provider
        res.status(200).json({
          success: true,
          message: 'User wallet funding callback processed successfully',
          data: {
            walletId: userWalletResult.wallet.id,
            userId,
            merchantId,
            newMainBalance: result.wallet?.mainBalance,
            newLedgerBalance: result.wallet?.ledgerBalance,
            transactionId
          }
        });
        return;
      }
      
      // Handle user wallet funding by walletId (existing functionality)
      if (!walletId) {
        logger.error('Missing required fields for funding', {
          walletId,
          userId,
          merchantId,
          merchantWalletType,
          transactionId
        });
        
        res.status(400).json({
          success: false,
          error: 'Either walletId or (userId + merchantId) or (merchantId + merchantWalletType) must be provided'
        });
        return;
      }
      
      // For this implementation, we'll just credit the wallet
      const result = await WalletService.updateWalletBalance(
        walletId,
        amount,
        description || `Funding via ${providerReference || 'external provider'}`
      );
      
      if (!result.success) {
        logger.error('Failed to update wallet balance from funding callback', {
          walletId,
          amount,
          error: result.error
        });
        
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }
      
      // Mark transaction as processed
      processedTransactions.add(transactionId);
      
      logger.info('Wallet balance updated from funding callback', {
        walletId,
        amount,
        newMainBalance: result.wallet?.mainBalance,
        newLedgerBalance: result.wallet?.ledgerBalance,
        transactionId
      });
      
      // Send acknowledgment to the payment provider
      res.status(200).json({
        success: true,
        message: 'Funding callback processed successfully',
        data: {
          walletId,
          newMainBalance: result.wallet?.mainBalance,
          newLedgerBalance: result.wallet?.ledgerBalance,
          transactionId
        }
      });
      return;
    } catch (error) {
      logger.error('Error processing funding callback', {
        error: error instanceof Error ? error.message : 'Unknown error',
        body: req.body
      });
      
      next(error);
    }
  }
  
  /**
   * GET /api/v1/wallets/funding/status/:transactionId
   * Endpoint to manually check funding status
   * This could be called by the frontend to check the status of a funding transaction
   */
  static async checkFundingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { transactionId } = req.params;
      
      if (!transactionId) {
        res.status(400).json({
          success: false,
          error: 'Transaction ID is required'
        });
        return;
      }
      
      logger.info('Checking funding status', {
        transactionId
      });
      
      // In a real implementation, you would query your database or the payment provider
      // to get the actual status of the funding transaction
      
      // For this mock implementation, we'll return a success response
      res.status(200).json({
        success: true,
        data: {
          transactionId,
          status: 'COMPLETED',
          message: 'Funding transaction completed successfully'
        }
      });
      return;
    } catch (error) {
      logger.error('Error checking funding status', {
        transactionId: req.params.transactionId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      
      next(error);
    }
  }
}