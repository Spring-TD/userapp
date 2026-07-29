import { Request, Response } from 'express';
import { SpecialService } from '../services/specialService';
import { TransactionService } from '../services/transactionService';
import { ApiError } from '../middleware/errorHandler';

interface TypedRequest<T> extends Request {
  body: T;
}

export class SpecialController {
  static createAppTransaction = async (req: TypedRequest<any>, res: Response): Promise<void> => {
    try {
      const transactionData = req.body;
      if (!transactionData?.appId) {
        throw new ApiError(400, 'App ID is required');
      }
      if (typeof transactionData.amount !== 'number') {
        throw new ApiError(400, 'Transaction amount is required');
      }

      // #region agent log
      try { console.log('DEBUG-AADE8C ' + JSON.stringify({ hypothesisId: 'H2', location: 'create-app-ms/controllers/specialController.ts:21', message: 'store-B mirror write received', data: { appId: transactionData.appId, provider: transactionData.provider, providerReference: transactionData.providerReference, amount: transactionData.amount, type: transactionData.type } })); } catch (_e) {}
      // #endregion
      const transaction = await TransactionService.createOrUpdateProviderTransaction(transactionData);

      res.status(201).json({
        success: true,
        message: 'App transaction recorded successfully',
        data: transaction
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in createAppTransaction controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 1. Get all App
  static getAllApps = async (req: Request, res: Response): Promise<void> => {
    try {
      const apps = await SpecialService.getAllApps();
      res.json({
        success: true,
        data: apps
      });
    } catch (error) {
      console.error('Error in getAllApps controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /** Apps eligible for platform monthly Billing-wallet charges (internal, JWT_SECRET). */
  static getBillingTargets = async (_req: Request, res: Response): Promise<void> => {
    try {
      const apps = await SpecialService.getAllApps();
      const targets = apps
        .filter((app) => app.status === 'active' && app.merchantId?.trim() && app.id?.trim())
        .map((app) => ({
          appId: app.id,
          merchantId: app.merchantId,
          appName: app.name,
          status: app.status
        }));

      res.json({
        success: true,
        data: { apps: targets }
      });
    } catch (error) {
      console.error('Error in getBillingTargets controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 2. Get app by id
  static getAppById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const app = await SpecialService.getAppById(id);
      
      if (!app) {
        throw new ApiError(404, 'App not found');
      }

      res.json({
        success: true,
        data: app
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getAppById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 3. Get all Product
  static getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const products = await SpecialService.getAllProducts();
      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      console.error('Error in getAllProducts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 4. Get product by ID
  static getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'Product ID is required');
      }

      const product = await SpecialService.getProductById(id);
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      res.json({
        success: true,
        data: product
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getProductById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 5. Get merchant Wallet balance
  static getMerchantWalletBalance = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId, walletType } = req.params;
      
      if (!merchantId) {
        throw new ApiError(400, 'Merchant ID is required');
      }
      
      if (!walletType) {
        throw new ApiError(400, 'Wallet type is required');
      }

      const wallet = await SpecialService.getMerchantWalletBalance(merchantId, walletType);
      
      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getMerchantWalletBalance controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 6. Get merchant Wallet history
  static getMerchantWalletHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId, walletType } = req.params;
      
      if (!merchantId) {
        throw new ApiError(400, 'Merchant ID is required');
      }
      
      if (!walletType) {
        throw new ApiError(400, 'Wallet type is required');
      }

      const transactions = await SpecialService.getMerchantWalletHistory(merchantId, walletType);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getMerchantWalletHistory controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 7. Create user → create a wallet
  static createUserAndWallet = async (req: TypedRequest<any>, res: Response): Promise<void> => {
    try {
      const userData = req.body;

      if (!userData) {
        throw new ApiError(400, 'User data is required');
      }

      const result = await SpecialService.createUserAndWallet(userData);

      res.status(201).json({
        success: true,
        message: 'User and wallet created successfully',
        data: result
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in createUserAndWallet controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 8. Get all users
  static getAllUsers = async (req: Request, res: Response): Promise<void> => {
    try {
      const users = await SpecialService.getAllUsers();
      res.json({
        success: true,
        data: users
      });
    } catch (error) {
      console.error('Error in getAllUsers controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 9. Get user details by ID
  static getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'User ID is required');
      }

      const user = await SpecialService.getUserById(id);
      
      if (!user) {
        throw new ApiError(404, 'User not found');
      }

      res.json({
        success: true,
        data: user
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getUserById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 10. Get user's wallet
  static getUserWallet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        throw new ApiError(400, 'User ID is required');
      }

      const wallet = await SpecialService.getUserWallet(userId);
      
      if (!wallet) {
        throw new ApiError(404, 'Wallet not found');
      }

      res.json({
        success: true,
        data: wallet
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getUserWallet controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 11. Get all users wallet
  static getAllUsersWallet = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;
      
      if (!merchantId) {
        throw new ApiError(400, 'Merchant ID is required');
      }

      const wallets = await SpecialService.getAllUsersWallet(merchantId);

      res.json({
        success: true,
        data: wallets
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getAllUsersWallet controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 12. Get product's users subscribers →by product Id
  static getProductSubscribers = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const subscribers = await SpecialService.getProductSubscribers(productId);

      res.json({
        success: true,
        data: subscribers
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getProductSubscribers controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 13. Withdraw from user's wallet
  static withdrawFromUserWallet = async (req: TypedRequest<{amount: number, description: string}>, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { amount, description } = req.body;
      
      if (!userId) {
        throw new ApiError(400, 'User ID is required');
      }
      
      if (!amount) {
        throw new ApiError(400, 'Amount is required');
      }
      
      if (!description) {
        throw new ApiError(400, 'Description is required');
      }

      const wallet = await SpecialService.withdrawFromUserWallet(userId, amount, description);
      
      if (!wallet) {
        throw new ApiError(404, 'Wallet not found or withdrawal failed');
      }

      res.json({
        success: true,
        message: 'Withdrawal successful',
        data: wallet
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in withdrawFromUserWallet controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 14. Submit docs for a user
  static submitDocsForUser = async (req: TypedRequest<any>, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const documentData = req.body;
      
      if (!userId) {
        throw new ApiError(400, 'User ID is required');
      }
      
      if (!documentData) {
        throw new ApiError(400, 'Document data is required');
      }

      const document = await SpecialService.submitDocsForUser(userId, documentData);
      
      if (!document) {
        throw new ApiError(400, 'Failed to submit document');
      }

      res.status(201).json({
        success: true,
        message: 'Document submitted successfully',
        data: document
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in submitDocsForUser controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 15. Get Drive by user
  static getDriveByUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        throw new ApiError(400, 'User ID is required');
      }

      const documents = await SpecialService.getDriveByUser(userId);

      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getDriveByUser controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 16. Get Drive by products
  static getDriveByProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const documents = await SpecialService.getDriveByProducts(productId);

      res.json({
        success: true,
        data: documents
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getDriveByProducts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 17. Get transaction history for a user
  static getTransactionHistoryForUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      
      if (!userId) {
        throw new ApiError(400, 'User ID is required');
      }

      const transactions = await SpecialService.getTransactionHistoryForUser(userId);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getTransactionHistoryForUser controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 18. get all transaction history by product
  static getAllTransactionHistoryByProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const transactions = await SpecialService.getAllTransactionHistoryByProduct(productId);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getAllTransactionHistoryByProduct controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 19. get transaction history by app
  static getTransactionHistoryByApp = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      
      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }

      const transactions = await SpecialService.getTransactionHistoryByApp(appId);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getTransactionHistoryByApp controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 20. Subscribe a user to a product
  static subscribeUserToProduct = async (req: TypedRequest<any>, res: Response): Promise<void> => {
    try {
      const { userId, productId } = req.params;
      const subscriptionData = req.body;
      
      if (!userId) {
        throw new ApiError(400, 'User ID is required');
      }
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const subscription = await SpecialService.subscribeUserToProduct(userId, productId);
      
      if (!subscription) {
        throw new ApiError(400, 'Failed to subscribe user to product');
      }

      res.status(201).json({
        success: true,
        message: 'User subscribed to product successfully',
        data: subscription
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in subscribeUserToProduct controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 21. Get user's product subscription
  static getUserProductSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId, productId } = req.params;
      
      if (!userId) {
        throw new ApiError(400, 'User ID is required');
      }
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const subscription = await SpecialService.getUserProductSubscription(userId, productId);
      
      if (!subscription) {
        throw new ApiError(404, 'Subscription not found');
      }

      res.json({
        success: true,
        data: subscription
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getUserProductSubscription controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 22. Apply to product
  static applyToProduct = async (req: TypedRequest<any>, res: Response): Promise<void> => {
    try {
      const { userId, productId } = req.params;
      const applicationData = req.body;
      
      if (!userId) {
        throw new ApiError(400, 'User ID is required');
      }
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }
      
      if (!applicationData) {
        throw new ApiError(400, 'Application data is required');
      }

      const application = await SpecialService.applyToProduct(userId, productId, applicationData);
      
      if (!application) {
        throw new ApiError(400, 'Failed to apply to product');
      }

      res.status(201).json({
        success: true,
        message: 'Application submitted successfully',
        data: application
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in applyToProduct controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 23. Get all product application → status, details
  static getAllProductApplications = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const applications = await SpecialService.getAllProductApplications(productId);

      res.json({
        success: true,
        data: applications
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getAllProductApplications controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // 24. Register callback → user application status, user's wallet events
  static registerCallback = async (req: TypedRequest<{eventType: string, callbackUrl: string}>, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;
      const { eventType, callbackUrl } = req.body;
      
      if (!userId) {
        throw new ApiError(400, 'User ID is required');
      }
      
      if (!eventType) {
        throw new ApiError(400, 'Event type is required');
      }
      
      if (!callbackUrl) {
        throw new ApiError(400, 'Callback URL is required');
      }

      const callback = await SpecialService.registerCallback(userId, eventType, callbackUrl);
      
      if (!callback) {
        throw new ApiError(400, 'Failed to register callback');
      }

      res.status(201).json({
        success: true,
        message: 'Callback registered successfully',
        data: callback
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in registerCallback controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}