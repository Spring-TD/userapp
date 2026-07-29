import { Request, Response } from 'express';
import crypto from 'crypto';
import { ProductService } from '../services/productService';
import { CreateProductRequest, UpdateProductRequest, SelectProductTypeRequest, CreateProductAfterTypeRequest } from '../types/product';
import { ApiError } from '../middleware/errorHandler';
import { validateInput, createProductSchema, updateProductSchema, selectProductTypeSchema, createProductAfterTypeSchema } from '../utils/validation';
import { getAccessTokenUser } from '../utils/gatewayUser';
import { sendProductConfigurationNotification } from '../services/notificationHelper';
import { getProductOverviewByTypeForApp, getProductOverviewForApp } from '../services/productOverviewService';
import { normalizeProductType } from '../utils/productType';
import { config } from '../config/environment';
import { ProductCatalogSyncScheduler } from '../services/productCatalogSyncScheduler';

interface TypedRequest<T> extends Request {
  body: T;
}

export class ProductController {
  private productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  // New endpoint for selecting product type after receiving create-app ID
  selectProductType = async (req: TypedRequest<SelectProductTypeRequest>, res: Response): Promise<void> => {
    try {
      // Product selection is handled in the server folder's product service
      // This service only handles fetching and merchant-specific configurations
      throw new ApiError(405, 'Product selection is not supported in this service. Use server/product-ms for product selection.');
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in selectProductType controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // New endpoint for creating product after type selection
  createProductAfterType = async (req: TypedRequest<CreateProductAfterTypeRequest>, res: Response): Promise<void> => {
    try {
      // Product creation is handled in the server folder's product service
      // This service only handles fetching and merchant-specific configurations
      throw new ApiError(405, 'Product creation is not supported in this service. Use server/product-ms for product creation.');
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in createProductAfterType controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  createProduct = async (req: TypedRequest<CreateProductRequest>, res: Response): Promise<void> => {
    try {
      // Product creation is handled in the server folder's product service
      // This service only handles fetching and merchant-specific configurations
      throw new ApiError(405, 'Product creation is not supported in this service. Use server/product-ms for product creation.');
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in createProduct controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getAllProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const products = await this.productService.getAllProducts();
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

  getProductById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'Product ID is required');
      }

      const product = await this.productService.getProductById(id);

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

  updateProduct = async (req: TypedRequest<UpdateProductRequest>, res: Response): Promise<void> => {
    try {
      // Product updates are handled in the server folder's product service
      // This service only handles merchant-specific configurations
      throw new ApiError(405, 'Product updates are not supported in this service. Use server/product-ms for product updates.');
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateProduct controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      // Product deletion is handled in the server folder's product service
      // This service only handles fetching and merchant-specific configurations
      throw new ApiError(405, 'Product deletion is not supported in this service. Use server/product-ms for product deletion.');
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in deleteProduct controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getProductsByMerchant = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;

      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }

      const products = await this.productService.getProductsByMerchant(appId);

      res.json({
        success: true,
        data: products
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getProductsByAppId controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /** GET /api/v1/products/app/:appId/product-overview — app-wide headline + category cards */
  getProductOverview = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;

      if (!appId?.trim()) {
        throw new ApiError(400, 'App ID is required');
      }

      const authHeader = req.headers.authorization;
      const data = await getProductOverviewForApp(appId.trim(), {
        bearerToken: typeof authHeader === 'string' ? authHeader : undefined
      });

      res.json({
        success: true,
        data
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

  /** GET /api/v1/products/app/:appId/product-overview/by-type/:productType — per-product category table */
  getProductOverviewByType = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, productType } = req.params;

      if (!appId?.trim()) {
        throw new ApiError(400, 'App ID is required');
      }

      let type;
      try {
        type = normalizeProductType(String(productType ?? ''));
      } catch {
        throw new ApiError(400, 'Invalid product type');
      }

      const data = await getProductOverviewByTypeForApp(appId.trim(), type);

      res.json({
        success: true,
        data
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getProductOverviewByType controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Check if product can be managed or configured based on status
  checkProductAction = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'Product ID is required');
      }

      const product = await this.productService.getProductById(id);

      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Determine action based on product status
      const action = product.status === 'complete' ? 'manage' : 'configure';

      res.json({
        success: true,
        data: {
          productId: product.id,
          status: product.status,
          allowedAction: action,
          message: `Product status is ${product.status}. You can ${action} this product.`
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

      console.error('Error in checkProductAction controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Manage product - allows editing/updating all product information for complete products
  manageProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      // Product management is handled in the server folder's product service
      // This service only handles merchant-specific configurations
      throw new ApiError(405, 'Product management is not supported in this service. Use server/product-ms for product management.');
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in manageProduct controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  /** Set which turned-on products are featured for the storefront (replaces previous featured set). */
  setAppFeaturedProducts = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId } = req.params;
      const { productIds } = req.body as { productIds?: unknown };

      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }

      const products = await this.productService.setFeaturedProductsForApp(appId, productIds);

      res.json({
        success: true,
        message: 'Featured products updated',
        data: products
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in setAppFeaturedProducts controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getPlataProductUpdatedWebhookStatus = async (_req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: {
        endpoint: '/api/v1/products/webhooks/plata/product-updated',
        events: ['product.updated'],
        signatureHeader: 'X-Plata-Signature',
        signatureRequired: Boolean(config.plataLoanWorkflowWebhookSecret)
      }
    });
  };

  handlePlataProductUpdatedWebhook = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!this.verifyPlataWebhookSignature(req)) {
        throw new ApiError(401, 'Invalid Plata webhook signature');
      }

      const root = req.body && typeof req.body === 'object' ? (req.body as Record<string, unknown>) : null;
      if (!root) {
        throw new ApiError(400, 'Webhook payload must be a JSON object');
      }

      const eventType = String(root.event ?? root.type ?? root.eventType ?? '').trim();
      if (eventType && eventType !== 'product.updated') {
        res.status(202).json({ success: true, ignored: true });
        return;
      }

      const data =
        root.data && typeof root.data === 'object' && !Array.isArray(root.data)
          ? (root.data as Record<string, unknown>)
          : root;
      const productId = String(
        data.productId ?? data.globalProductId ?? data.id ?? root.productId ?? ''
      ).trim();
      if (!productId) {
        throw new ApiError(400, 'productId is required');
      }

      const result = await this.productService.syncLocalClonesFromUpstreamProductId(productId);
      res.status(200).json({
        success: true,
        duplicate: false,
        data: result
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Error processing Plata product.updated webhook:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };

  getCatalogSyncSchedulerStatus = async (_req: Request, res: Response): Promise<void> => {
    res.json({
      success: true,
      data: ProductCatalogSyncScheduler.getInstance().getStatus()
    });
  };

  runCatalogSyncReconcile = async (req: Request, res: Response): Promise<void> => {
    try {
      const force = req.body?.force === true || req.query.force === 'true';
      const result = await ProductCatalogSyncScheduler.getInstance().runNow(force);
      res.json({ success: true, data: result });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({ success: false, error: error.message });
        return;
      }
      console.error('Error running product catalog reconcile:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  };

  private verifyPlataWebhookSignature(req: Request): boolean {
    const secret = config.plataLoanWorkflowWebhookSecret;
    if (!secret) {
      return true;
    }

    const incoming = req.get('x-plata-signature')?.trim();
    if (!incoming) {
      return false;
    }

    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;
    if (!rawBody) {
      return false;
    }

    const hexDigest = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const base64Digest = crypto.createHmac('sha256', secret).update(rawBody).digest('base64');
    return this.signatureMatches(incoming, hexDigest) || this.signatureMatches(incoming, base64Digest);
  }

  private signatureMatches(incoming: string, expectedDigest: string): boolean {
    const normalizedIncoming = incoming.replace(/^sha256=/i, '').trim();
    const expected = Buffer.from(expectedDigest);
    const actual = Buffer.from(normalizedIncoming);
    if (expected.length !== actual.length) {
      return false;
    }
    return crypto.timingSafeEqual(expected, actual);
  }

  // Toggle product activation for an app
  toggleProductActivation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, productId } = req.params;
      const { activate } = req.body;

      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }
      
      if (activate === undefined) {
        throw new ApiError(400, 'Activate flag is required');
      }

      const product = await this.productService.toggleProductActivation(appId, productId, activate);

      if (!product) {
        throw new ApiError(500, 'Failed to toggle product activation');
      }

      const gatewayUser = getAccessTokenUser(req);
      if (gatewayUser) {
        void sendProductConfigurationNotification({
          userId: gatewayUser.userId,
          email: gatewayUser.email,
          productId,
          productType: String(product.type),
          appId,
          action: activate ? 'activated' : 'deactivated'
        });
      }

      res.json({
        success: true,
        message: `Product ${activate ? 'activated' : 'deactivated'} successfully`,
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

      console.error('Error in toggleProductActivation controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Update app-specific product configuration (e.g., interest rate adjustments)
  updateMerchantProductConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, productId } = req.params;
      const configData = req.body;

      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const updatedConfig = await this.productService.updateMerchantProductConfiguration(appId, productId, configData);

      if (!updatedConfig) {
        throw new ApiError(404, 'App product not found');
      }

      const gatewayUser = getAccessTokenUser(req);
      if (gatewayUser) {
        void sendProductConfigurationNotification({
          userId: gatewayUser.userId,
          email: gatewayUser.email,
          productId: updatedConfig.id,
          productType: String(updatedConfig.type),
          appId: updatedConfig.appId,
          action: 'updated'
        });
      }

      res.json({
        success: true,
        message: 'App product configuration updated successfully',
        data: updatedConfig
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in updateAppProductConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Get app-specific product configuration
  getMerchantProductConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { appId, productId } = req.params;

      if (!appId) {
        throw new ApiError(400, 'App ID is required');
      }
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const config = await this.productService.getMerchantProductConfiguration(appId, productId);

      res.json({
        success: true,
        data: config
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getMerchantProductConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}