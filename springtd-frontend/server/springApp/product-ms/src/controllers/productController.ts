import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { CreateProductRequest, UpdateProductRequest, SelectProductTypeRequest, CreateProductAfterTypeRequest } from '../types/product';
import { ApiError } from '../middleware/errorHandler';
import { validateInput, createProductSchema, updateProductSchema, selectProductTypeSchema, createProductAfterTypeSchema } from '../utils/validation';

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

  // Toggle product activation for a merchant
  toggleProductActivation = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId, productId } = req.params;
      const { activate } = req.body;

      if (!merchantId) {
        throw new ApiError(400, 'Merchant ID is required');
      }
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }
      
      if (activate === undefined) {
        throw new ApiError(400, 'Activate flag is required');
      }

      const result = await this.productService.toggleProductActivation(merchantId, productId, activate);

      if (!result) {
        throw new ApiError(500, 'Failed to toggle product activation');
      }

      res.json({
        success: true,
        message: `Product ${activate ? 'activated' : 'deactivated'} successfully`,
        data: { productId, merchantId, isActive: activate }
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

  // Update merchant-specific product configuration (e.g., interest rate adjustments)
  updateMerchantProductConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId, productId } = req.params;
      const configData = req.body;

      if (!merchantId) {
        throw new ApiError(400, 'Merchant ID is required');
      }
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const updatedConfig = await this.productService.updateMerchantProductConfiguration(merchantId, productId, configData);

      if (!updatedConfig) {
        throw new ApiError(500, 'Failed to update merchant product configuration');
      }

      res.json({
        success: true,
        message: 'Merchant product configuration updated successfully',
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

      console.error('Error in updateMerchantProductConfiguration controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  // Get merchant-specific product configuration
  getMerchantProductConfiguration = async (req: Request, res: Response): Promise<void> => {
    try {
      const { merchantId, productId } = req.params;

      if (!merchantId) {
        throw new ApiError(400, 'Merchant ID is required');
      }
      
      if (!productId) {
        throw new ApiError(400, 'Product ID is required');
      }

      const config = await this.productService.getMerchantProductConfiguration(merchantId, productId);

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