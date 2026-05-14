import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { ApiError } from '../middleware/errorHandler';
import { 
  CreateProductConfigurationRequest, 
  UpdateProductConfigurationRequest 
} from '../types/productConfiguration';
import { getAccessTokenUser } from '../utils/gatewayUser';
import { sendProductConfigurationNotification } from '../services/notificationHelper';

interface TypedRequest<T> extends Request {
  body: T;
}

export class ConfigurationController {
  private productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  createProductConfiguration = async (req: TypedRequest<CreateProductConfigurationRequest>, res: Response): Promise<void> => {
    try {
      const configData: CreateProductConfigurationRequest = req.body;
      
      // Validate required fields
      if (!configData.productId || !configData.productType) {
        throw new ApiError(400, 'Product ID and Product Type are required');
      }

      // For now, use a default app ID since this is not provided in the request
      const appId = 'default-app';
      const configuration = await this.productService.createProductConfiguration(configData, appId);

      const gatewayUser = getAccessTokenUser(req);
      if (gatewayUser) {
        const catalog = await this.productService.getProductById(configData.productId);
        void sendProductConfigurationNotification({
          userId: gatewayUser.userId,
          email: gatewayUser.email,
          productId: configData.productId,
          productType: catalog ? String(catalog.type) : configData.productType,
          appId,
          action: 'created'
        });
      }
      
      res.status(201).json({
        success: true,
        message: 'Product configuration created successfully',
        data: configuration
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in createProductConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  getProductConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const configuration = await this.productService.getProductConfiguration(productId);
      
      if (!configuration) {
        throw new ApiError(404, 'Product configuration not found');
      }

      res.json({
        success: true,
        data: configuration
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in getProductConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  updateProductConfiguration = async (req: TypedRequest<UpdateProductConfigurationRequest>, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const updateData: UpdateProductConfigurationRequest = req.body;

      const configuration = await this.productService.updateProductConfiguration(productId, updateData);
      
      if (!configuration) {
        throw new ApiError(404, 'Product configuration not found');
      }

      const gatewayUser = getAccessTokenUser(req);
      if (gatewayUser) {
        const catalog = await this.productService.getProductById(productId);
        const appId =
          'appId' in configuration && typeof (configuration as { appId?: string }).appId === 'string'
            ? (configuration as { appId: string }).appId
            : 'default-app';
        void sendProductConfigurationNotification({
          userId: gatewayUser.userId,
          email: gatewayUser.email,
          productId,
          productType: catalog ? String(catalog.type) : 'unknown',
          appId,
          action: 'updated'
        });
      }

      res.json({
        success: true,
        message: 'Product configuration updated successfully',
        data: configuration
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in updateProductConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  deleteProductConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { productId } = req.params;
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const existing = await this.productService.getProductConfiguration(productId);
      const catalog = await this.productService.getProductById(productId);

      const deleted = await this.productService.deleteProductConfiguration(productId);
      
      if (!deleted) {
        throw new ApiError(404, 'Product configuration not found');
      }

      const gatewayUser = getAccessTokenUser(req);
      if (gatewayUser && catalog && existing && 'appId' in existing) {
        void sendProductConfigurationNotification({
          userId: gatewayUser.userId,
          email: gatewayUser.email,
          productId,
          productType: String(catalog.type),
          appId: existing.appId,
          action: 'deleted'
        });
      }

      res.json({
        success: true,
        message: 'Product configuration deleted successfully'
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }
      
      console.error('Error in deleteProductConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };
}