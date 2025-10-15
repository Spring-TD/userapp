import { Request, Response, NextFunction } from 'express';
import { WalletService } from '../services';
import { logger } from '../utils/logger';
import { validateInput, fundingCallbackSchema } from '../utils/validation';
import { MerchantWalletType } from '../models/Wallet';

// Define interfaces for the validated data
interface FundingCallbackData {
  walletId: string;
  amount: number;
  currency: string;
  transactionId: string;
  paymentMethod: string;
  status: string;
  description?: string;
  providerReference?: string;
  signature?: string; // For webhook authentication
  merchantId?: string; // For merchant wallet funding
  merchantWalletType?: MerchantWalletType; // For merchant wallet funding
}

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
      
      const { walletId, amount, transactionId, status, description, providerReference, merchantId, merchantWalletType } = value!;
      
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
        const merchantWalletResult = await WalletService.getMerchantWalletByType(merchantId, merchantWalletType);
        if (!merchantWalletResult.success || !merchantWalletResult.wallet) {
          logger.error('Failed to find merchant wallet for funding', {
            merchantId,
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
          
          // In a production environment, you might want to return a different status
          // to have the provider retry the callback
          res.status(500).json({
            success: false,
            error: result.error
          });
          return;
        }
        
        logger.info('Merchant wallet balance updated from funding callback', {
          walletId: merchantWalletResult.wallet.id,
          merchantId,
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
            merchantWalletType,
            newMainBalance: result.wallet?.mainBalance,
            newLedgerBalance: result.wallet?.ledgerBalance
          }
        });
        return;
      }
      
      // Handle user wallet funding (existing functionality)
      // In a real implementation, you would also:
      // 1. Verify the signature to ensure the callback is authentic
      // 2. Check if this transaction has already been processed
      // 3. Validate the wallet exists
      
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
        
        // In a production environment, you might want to return a different status
        // to have the provider retry the callback
        res.status(500).json({
          success: false,
          error: result.error
        });
        return;
      }
      
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
          newLedgerBalance: result.wallet?.ledgerBalance
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