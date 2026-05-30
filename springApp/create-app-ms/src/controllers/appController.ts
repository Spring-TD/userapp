import { Request, Response } from 'express';
import { buildDefaultAppUrl } from '../config/environment';
import { AppService } from '../services/appService';
import { AppPwaPublishService } from '../services/appPwaPublishService';
import { App, CreateAppRequest, UpdateAppRequest, TransactionQueryParams, DriveDocumentQueryParams } from '../types/app';
import { ApiError } from '../middleware/errorHandler';
import { WalletService } from '../services/walletService';
import { TransactionService } from '../services/transactionService';
import { DriveService } from '../services/driveService';
import {
  sendAppCreatedNotification,
  sendAppDeactivatedNotification,
  sendAppReactivatedNotification
} from '../services/notificationHelper';
import { buildProductOverview } from '../services/productOverviewService';
import {
  listCustomerApplicationsForApp,
  summarizeCustomerApplicationsForApp
} from '../services/customerApplicationsService';
import { assertLikelyMongoObjectId } from '../utils/mongoObjectId';
import { tryGetApiBaseUrl } from '../utils/requestBaseUrl';

declare const console: any;

// Extend Request interface to include user data
interface AuthenticatedRequest extends Request {
  body: any;
  params: Record<string, string>;
  headers: {
    authorization?: string;
    [key: string]: string | string[] | undefined;
  };
  user?: {
    userId: string;
    email: string;
    userType: string;
    userMerchantId?: string;
    iat?: number;
    exp?: number;
  };
}

interface TypedRequest<T> extends Request {
  body: T;
}

export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly pwaPublishService: AppPwaPublishService
  ) {}

  private isMerchantUser(req: Request): boolean {
    const userType = (req.user?.userType || '').toLowerCase();
    return userType === 'merchant';
  }

  private getRequestMerchantId(req: Request): string | undefined {
    return req.user?.userMerchantId || req.user?.userId;
  }

  private assertMerchantOwnsApp(req: Request, app: App): void {
    if (!this.isMerchantUser(req)) {
      return;
    }
    const merchantIds = [req.user?.userMerchantId, req.user?.userId].filter(
      (value): value is string => Boolean(value)
    );
    if (merchantIds.length === 0 || !merchantIds.includes(app.merchantId)) {
      throw new ApiError(403, 'You can only view your own apps');
    }
  }

  private assertMerchantOwnsMerchantPath(req: Request, merchantIdFromPath: string): void {
    if (!this.isMerchantUser(req)) {
      return;
    }
    const merchantIds = [req.user?.userMerchantId, req.user?.userId].filter(
      (value): value is string => Boolean(value)
    );
    if (merchantIds.length === 0 || !merchantIds.includes(merchantIdFromPath)) {
      throw new ApiError(403, 'You can only view your own apps');
    }
  }

  createApp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const appData: CreateAppRequest = req.body;
      
      // Extract merchantId from authenticated user
      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }
      
      // For merchants, use their merchant ID; for admins, allow specifying merchant ID in request
      const merchantId = this.isMerchantUser(req)
        ? req.user.userMerchantId || req.user.userId 
        : appData.merchantId || req.user.userId;

      if (!merchantId) {
        throw new ApiError(400, 'Merchant ID is required');
      }

      // Override merchantId in appData with the authenticated user's merchantId
      const appDataWithMerchantId = {
        ...appData,
        merchantId
      };

      const app = await this.appService.createApp(appDataWithMerchantId);
      const authHeader = req.headers.authorization;

      void sendAppCreatedNotification({
        userId: req.user.userId,
        email: req.user.email,
        appName: app.name,
        merchantName: merchantId,
        detail: app.subdomain ? `Default URL: ${buildDefaultAppUrl(app.subdomain)}` : ''
      });

      // Create merchant internal wallets for this app (Billing, KYC, Settlement)
      const merchantWalletsResult = await WalletService.createAllMerchantWallets(app.id, authHeader, app.name);
      // App creation succeeds even if wallet provisioning fails; handle retries separately.
      if (!merchantWalletsResult.success) {
        console.error(`Failed to create merchant wallets for app ${app.id}:`, merchantWalletsResult.error);
      }
      
      res.status(201).json({
        success: true,
        message: 'App created successfully',
        data: {
          app: {
            ...app,
            ...(app.subdomain
              ? { defaultAppUrl: buildDefaultAppUrl(app.subdomain) }
              : {})
          },
          merchantWallets: merchantWalletsResult
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in createApp controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getAppById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const app = await this.appService.getAppById(id);
      
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

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

  resolveAppBySubdomain = async (req: Request, res: Response): Promise<void> => {
    try {
      const { subdomain } = req.params;
      if (!subdomain) {
        throw new ApiError(400, 'Subdomain is required');
      }

      const app = await this.appService.getAppBySubdomain(subdomain);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      if (app.status === 'suspended') {
        throw new ApiError(410, 'App is suspended');
      }

      const apiBase = tryGetApiBaseUrl(req);
      const { pwaManifest, pwaInstall } = await this.pwaPublishService.getResolvePwaPayload(app.id, apiBase);

      res.json({
        success: true,
        data: {
          id: app.id,
          merchantId: app.merchantId,
          subdomain: app.subdomain,
          status: app.status,
          defaultAppUrl: app.subdomain ? buildDefaultAppUrl(app.subdomain) : undefined,
          ...(pwaManifest ? { pwaManifest } : {}),
          ...(pwaInstall ? { pwaInstall } : {})
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in resolveAppBySubdomain controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getAppsByMerchantId = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId } = req.params;
      
      if (!merchantId) {
        throw new ApiError(400, 'Merchant ID is required');
      }
      this.assertMerchantOwnsMerchantPath(req, merchantId);

      const apps = await this.appService.getAppsByMerchantId(merchantId);

      res.json({
        success: true,
        data: apps
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getAppsByMerchantId controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  updateApp = async (req: TypedRequest<UpdateAppRequest>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const updateData: UpdateAppRequest = req.body;

      const app = await this.appService.updateApp(id, updateData);
      
      if (!app) {
        throw new ApiError(404, 'App not found');
      }

      res.json({
        success: true,
        message: 'App updated successfully',
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
      
      console.error('Error in updateApp controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  deleteApp = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const existing = await this.appService.getAppById(id);
      if (!existing) {
        throw new ApiError(404, 'App not found');
      }

      const deleted = await this.appService.deleteApp(id);
      
      if (!deleted) {
        throw new ApiError(404, 'App not found');
      }

      if (req.user?.userId && req.user?.email) {
        void sendAppDeactivatedNotification({
          userId: req.user.userId,
          email: req.user.email,
          appName: existing.name,
          merchantName: existing.merchantId,
          action: 'deleted'
        });
      }

      res.json({
        success: true,
        message: 'App deleted successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in deleteApp controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  updateAppStatus = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      if (!req.user) {
        throw new ApiError(401, 'Authentication required');
      }
      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }
      if (!status || (status !== 'active' && status !== 'suspended')) {
        throw new ApiError(400, 'Status must be "active" or "suspended"');
      }

      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      const merchantIds = [req.user.userMerchantId, req.user.userId].filter(
        (value): value is string => Boolean(value)
      );
      if (this.isMerchantUser(req) && !merchantIds.includes(app.merchantId)) {
        throw new ApiError(403, 'You can only update status for your own apps');
      }

      const updatedApp = await this.appService.updateAppStatus(id, status);
      if (updatedApp && req.user.userId && req.user.email) {
        if (status === 'suspended') {
          void sendAppDeactivatedNotification({
            userId: req.user.userId,
            email: req.user.email,
            appName: updatedApp.name,
            merchantName: updatedApp.merchantId,
            action: 'suspended'
          });
        } else {
          void sendAppReactivatedNotification({
            userId: req.user.userId,
            email: req.user.email,
            appName: updatedApp.name,
            merchantName: updatedApp.merchantId
          });
        }
      }
      res.json({
        success: true,
        message: `App ${status} successfully`,
        data: updatedApp
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      console.error('Error in updateAppStatus controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  addProductKey = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { productKey } = req.body;
      
      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!productKey) {
        throw new ApiError(400, 'Product key is required');
      }

      const app = await this.appService.addProductKey(id, productKey);
      
      if (!app) {
        throw new ApiError(404, 'App not found');
      }

      res.json({
        success: true,
        message: 'Product key added successfully',
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
      
      console.error('Error in addProductKey controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getProductKeys = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const productKeys = await this.appService.getProductKeys(id);

      res.json({
        success: true,
        data: productKeys
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getProductKeys controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getManifestFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);
      res.json({
        success: true,
        data: {
          manifestUrls: app.manifestUrls || [],
          manifestKeys: app.manifestKeys || []
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Error in getManifestFiles controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };

  uploadManifestFiles = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);
      const files = (req as Request & { files?: Express.Multer.File[] }).files;
      if (!Array.isArray(files) || files.length === 0) {
        throw new ApiError(400, 'Manifest file(s) are required (multipart field name: files)');
      }
      const updated = await this.appService.uploadManifestFiles(
        id,
        files.map((file) => ({
          buffer: file.buffer,
          mimetype: file.mimetype,
          originalname: file.originalname
        }))
      );
      res.json({
        success: true,
        message: 'Manifest file(s) uploaded and saved on app',
        data: updated
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Error in uploadManifestFiles controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };

  replaceManifestFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, manifestIndex: manifestIndexParam } = req.params;
      if (!id || manifestIndexParam === undefined) {
        throw new ApiError(400, 'App ID and manifest index are required');
      }
      const manifestIndex = parseInt(manifestIndexParam, 10);
      if (Number.isNaN(manifestIndex) || manifestIndex < 0) {
        throw new ApiError(400, 'manifestIndex must be a non-negative integer');
      }
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);
      const file = (req as Request & { file?: Express.Multer.File }).file;
      if (!file?.buffer) {
        throw new ApiError(400, 'Manifest file is required (multipart field name: file)');
      }
      const updated = await this.appService.replaceManifestFile(id, manifestIndex, {
        buffer: file.buffer,
        mimetype: file.mimetype,
        originalname: file.originalname
      });
      res.json({
        success: true,
        message: 'Manifest file replaced',
        data: updated
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Error in replaceManifestFile controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };

  deleteManifestFile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, manifestIndex: manifestIndexParam } = req.params;
      if (!id || manifestIndexParam === undefined) {
        throw new ApiError(400, 'App ID and manifest index are required');
      }
      const manifestIndex = parseInt(manifestIndexParam, 10);
      if (Number.isNaN(manifestIndex) || manifestIndex < 0) {
        throw new ApiError(400, 'manifestIndex must be a non-negative integer');
      }
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);
      const updated = await this.appService.deleteManifestFile(id, manifestIndex);
      res.json({
        success: true,
        message: 'Manifest file deleted',
        data: updated
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Error in deleteManifestFile controller:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };

  getAppWallets = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const authHeader = req.headers.authorization;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

      const merchantWallets = await WalletService.getAllMerchantWallets(app.merchantId, app.id, authHeader);
      if (!merchantWallets.success) {
        throw new ApiError(400, merchantWallets.error || 'Failed to fetch app wallets');
      }

      res.json({
        success: true,
        data: {
          appId: app.id,
          merchantId: app.merchantId,
          wallets: merchantWallets.data?.wallets || []
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getAppWallets controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getAllApps = async (req: Request, res: Response): Promise<void> => {
    try {
      let apps = await this.appService.getAllApps();
      if (this.isMerchantUser(req)) {
        const merchantIds = [req.user?.userMerchantId, req.user?.userId].filter(
          (value): value is string => Boolean(value)
        );
        apps = apps.filter((app) => merchantIds.includes(app.merchantId));
      }

      res.json({
        success: true,
        data: apps
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getAllApps controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Transaction endpoints
  getTransactions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        page,
        limit,
        type,
        status,
        startDate,
        endDate,
        productId
      } = req.query as Record<string, unknown>;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      // Validate app exists
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

      // Prepare query parameters
      const queryParams: TransactionQueryParams = {};
      if (page !== undefined && page !== '') queryParams.page = parseInt(String(page), 10);
      if (limit !== undefined && limit !== '') queryParams.limit = parseInt(String(limit), 10);
      if (typeof type === 'string') queryParams.type = type as 'credit' | 'debit';
      if (typeof status === 'string') {
        queryParams.status = status as 'pending' | 'completed' | 'failed' | 'cancelled';
      }
      if (typeof startDate === 'string') queryParams.startDate = startDate;
      if (typeof endDate === 'string') queryParams.endDate = endDate;
      if (typeof productId === 'string' && productId.trim()) {
        queryParams.productId = productId.trim();
      }

      const transactions = await TransactionService.getTransactionsByAppId(id, queryParams);

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
      
      console.error('Error in getTransactions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getTransactionStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      // Validate app exists
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

      const stats = await TransactionService.getTransactionStats(id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getTransactionStats controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Merchant dashboard: consolidated payload for one activated product (config + applications + scoped transactions).
   */
  getProductOverview = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { appId, productId } = req.params;
      const txPageRaw = req.query.transactionPage ?? req.query.txPage;
      const txLimitRaw = req.query.transactionLimit ?? req.query.txLimit;
      const transactionPage =
        txPageRaw !== undefined ? Number.parseInt(String(txPageRaw), 10) : undefined;
      const transactionLimit =
        txLimitRaw !== undefined ? Number.parseInt(String(txLimitRaw), 10) : undefined;

      if (!appId?.trim()) {
        throw new ApiError(400, 'App ID is required');
      }
      if (!productId?.trim()) {
        throw new ApiError(400, 'Product ID is required');
      }

      assertLikelyMongoObjectId(appId.trim(), 'App ID');
      assertLikelyMongoObjectId(productId.trim(), 'Product ID');

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new ApiError(401, 'Bearer token required');
      }

      const app = await this.appService.getAppById(appId.trim());
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

      const adminHdr = req.headers['x-admin-id'];
      const adminId = Array.isArray(adminHdr) ? adminHdr[0] : adminHdr;

      const overview = await buildProductOverview({
        appId: appId.trim(),
        productIdPath: productId.trim(),
        authorization: authHeader,
        adminId: adminId?.trim() || undefined,
        transactionPage: Number.isFinite(transactionPage) ? transactionPage : undefined,
        transactionLimit: Number.isFinite(transactionLimit) ? transactionLimit : undefined
      });

      res.json({
        success: true,
        data: overview
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getProductOverview controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Merchant dashboard: all applications for one customer on one app.
   */
  getCustomerApplications = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { appId, userId } = req.params;
      if (!appId?.trim() || !userId?.trim()) {
        throw new ApiError(400, 'App ID and user ID are required');
      }

      assertLikelyMongoObjectId(appId.trim(), 'App ID');

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new ApiError(401, 'Bearer token required');
      }

      const app = await this.appService.getAppById(appId.trim());
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

      const adminHdr = req.headers['x-admin-id'];
      const adminId = Array.isArray(adminHdr) ? adminHdr[0] : adminHdr;
      const productType =
        typeof req.query.productType === 'string' ? req.query.productType : undefined;
      const status = typeof req.query.status === 'string' ? req.query.status : undefined;

      const applications = await listCustomerApplicationsForApp({
        appId: appId.trim(),
        userId: userId.trim(),
        authorization: authHeader,
        adminId: adminId?.trim() || undefined,
        productType,
        status
      });

      res.json({
        success: true,
        data: {
          appId: appId.trim(),
          userId: userId.trim(),
          applications
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getCustomerApplications controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Merchant dashboard: application status counts for one customer on one app.
   */
  getCustomerApplicationsSummary = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { appId, userId } = req.params;
      if (!appId?.trim() || !userId?.trim()) {
        throw new ApiError(400, 'App ID and user ID are required');
      }

      assertLikelyMongoObjectId(appId.trim(), 'App ID');

      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) {
        throw new ApiError(401, 'Bearer token required');
      }

      const app = await this.appService.getAppById(appId.trim());
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

      const adminHdr = req.headers['x-admin-id'];
      const adminId = Array.isArray(adminHdr) ? adminHdr[0] : adminHdr;
      const productType =
        typeof req.query.productType === 'string' ? req.query.productType : undefined;

      const summary = await summarizeCustomerApplicationsForApp({
        appId: appId.trim(),
        userId: userId.trim(),
        authorization: authHeader,
        adminId: adminId?.trim() || undefined,
        productType
      });

      res.json({
        success: true,
        data: {
          appId: appId.trim(),
          userId: userId.trim(),
          summary
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getCustomerApplicationsSummary controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Drive endpoints
  uploadDocument = async (req: TypedRequest<Omit<import('../types/app').DriveDocument, 'id' | 'uploadedAt'>>, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const documentData = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      // Validate app exists
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }

      // Add appId to document data
      const fullDocumentData = {
        ...documentData,
        appId: id
      };

      const document = await DriveService.uploadDocument(fullDocumentData);

      res.status(201).json({
        success: true,
        message: 'Document uploaded successfully',
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
      
      console.error('Error in uploadDocument controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getDocuments = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        page,
        limit,
        userId,
        fileType,
        status,
        startDate,
        endDate
      } = req.query as any;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      // Validate app exists
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

      // Prepare query parameters
      const queryParams: DriveDocumentQueryParams = {};
      if (page) queryParams.page = parseInt(page);
      if (limit) queryParams.limit = parseInt(limit);
      if (userId) queryParams.userId = userId as string;
      if (fileType) queryParams.fileType = fileType as string;
      if (status) queryParams.status = status as 'pending' | 'verified' | 'rejected';
      if (startDate) queryParams.startDate = startDate as string;
      if (endDate) queryParams.endDate = endDate as string;

      const documents = await DriveService.getDocumentsByAppId(id, queryParams);

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
      
      console.error('Error in getDocuments controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getDocumentById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, documentId } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!documentId) {
        throw new ApiError(400, 'Document ID is required');
      }

      // Validate app exists
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

      const document = await DriveService.getDocumentById(documentId);
      
      if (!document) {
        throw new ApiError(404, 'Document not found');
      }

      // Ensure document belongs to this app
      if (document.appId !== id) {
        throw new ApiError(403, 'Document does not belong to this app');
      }

      res.json({
        success: true,
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
      
      console.error('Error in getDocumentById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  updateDocument = async (req: TypedRequest<Partial<import('../types/app').DriveDocument>>, res: Response): Promise<void> => {
    try {
      const { id, documentId } = req.params;
      const updateData = req.body;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!documentId) {
        throw new ApiError(400, 'Document ID is required');
      }

      // Validate app exists
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }

      const document = await DriveService.updateDocument(documentId, updateData);
      
      if (!document) {
        throw new ApiError(404, 'Document not found');
      }

      // Ensure document belongs to this app
      if (document.appId !== id) {
        throw new ApiError(403, 'Document does not belong to this app');
      }

      res.json({
        success: true,
        message: 'Document updated successfully',
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
      
      console.error('Error in updateDocument controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  deleteDocument = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id, documentId } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      if (!documentId) {
        throw new ApiError(400, 'Document ID is required');
      }

      // Validate app exists
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }

      const document = await DriveService.getDocumentById(documentId);
      
      if (!document) {
        throw new ApiError(404, 'Document not found');
      }

      // Ensure document belongs to this app
      if (document.appId !== id) {
        throw new ApiError(403, 'Document does not belong to this app');
      }

      const deleted = await DriveService.deleteDocument(documentId);
      
      if (!deleted) {
        throw new ApiError(404, 'Document not found');
      }

      res.json({
        success: true,
        message: 'Document deleted successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in deleteDocument controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getDocumentStats = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'App ID is required');
      }

      // Validate app exists
      const app = await this.appService.getAppById(id);
      if (!app) {
        throw new ApiError(404, 'App not found');
      }
      this.assertMerchantOwnsApp(req, app);

      const stats = await DriveService.getDocumentStats(id);

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getDocumentStats controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Special endpoint that can only be accessed with special keys
   * Gets all apps with additional metadata
   */
  getAppsWithMetadata = async (req: Request, res: Response): Promise<void> => {
    try {
      // This endpoint provides additional metadata that regular users shouldn't see
      const apps = await this.appService.getAllAppsWithMetadata();

      res.json({
        success: true,
        data: apps,
        metadata: {
          totalApps: apps.length,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getAppsWithMetadata controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /**
   * Special endpoint for bulk operations
   */
  bulkUpdateApps = async (req: Request, res: Response): Promise<void> => {
    try {
      const { updates } = req.body;

      if (!updates || !Array.isArray(updates)) {
        throw new ApiError(400, 'Invalid bulk update data provided');
      }

      const results = await this.appService.bulkUpdateApps(updates);

      res.json({
        success: true,
        message: `Successfully updated ${results.successCount} apps, failed to update ${results.failedCount} apps`,
        data: results
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in bulkUpdateApps controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}