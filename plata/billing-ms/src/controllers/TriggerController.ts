import { Request, Response } from 'express';
import { 
  PricingService, 
  ProductCreatedEvent, 
  WalletFundingEvent, 
  MerchantUsersCountEvent 
} from '../services/pricingService';

export class TriggerController {
  /**
   * Handle product created event
   * POST /api/v1/billing/triggers/product-created
   */
  static async handleProductCreated(req: Request, res: Response) {
    try {
      const eventData: ProductCreatedEvent = req.body;
      
      // Validate required fields
      if (!eventData.productId || !eventData.merchantId || !eventData.createdAt) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: productId, merchantId, and createdAt are required'
        });
        return;
      }
      
      // Process the event
      await PricingService.handleProductCreatedEvent(eventData);
      
      res.status(200).json({
        success: true,
        message: 'Product created event processed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing product created event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle wallet funding event
   * POST /api/v1/billing/triggers/wallet-funded
   */
  static async handleWalletFunded(req: Request, res: Response) {
    try {
      const eventData: WalletFundingEvent = req.body;
      
      // Validate required fields
      if (!eventData.walletId || !eventData.amount || !eventData.fundingMethod || !eventData.transactionId || !eventData.createdAt) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: walletId, amount, fundingMethod, transactionId, and createdAt are required'
        });
        return;
      }
      
      // Process the event
      await PricingService.handleWalletFundingEvent(eventData);
      
      res.status(200).json({
        success: true,
        message: 'Wallet funding event processed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing wallet funding event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Handle merchant users count event
   * POST /api/v1/billing/triggers/merchant-users-count
   */
  static async handleMerchantUsersCount(req: Request, res: Response) {
    try {
      const eventData: MerchantUsersCountEvent = req.body;
      
      // Validate required fields
      if (!eventData.merchantId || eventData.currentUsersCount === undefined || !eventData.newUserId || !eventData.createdAt) {
        res.status(400).json({
          success: false,
          message: 'Missing required fields: merchantId, currentUsersCount, newUserId, and createdAt are required'
        });
        return;
      }
      
      // Process the event
      await PricingService.handleMerchantUsersCountEvent(eventData);
      
      res.status(200).json({
        success: true,
        message: 'Merchant users count event processed successfully'
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error processing merchant users count event',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}