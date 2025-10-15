import { Request, Response } from 'express';
import { ProductService } from '../services/productService';
import { CreateProductRequest, UpdateProductRequest } from '../types/product';
import { ApiError } from '../middleware/errorHandler';
import { validateInput, createProductSchema, updateProductSchema } from '../utils/validation';

interface TypedRequest<T> extends Request {
  body: T;
}

export class ProductController {
  private productService: ProductService;

  constructor(productService: ProductService) {
    this.productService = productService;
  }

  createProduct = async (req: TypedRequest<CreateProductRequest>, res: Response): Promise<void> => {
    try {
      // Validate input using Joi schema
      const { error, value } = validateInput<CreateProductRequest>(createProductSchema, req.body);
      
      if (error) {
        throw new ApiError(400, error);
      }

      // Ensure value is not undefined
      if (!value) {
        throw new ApiError(500, 'Validation returned no value');
      }

      const product = await this.productService.createProduct(value);
      
      res.status(201).json({
        success: true,
        message: 'Product created successfully',
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
      
      console.error('Error in createProduct controller:', error);
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
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'Product ID is required');
      }

      // Validate input using Joi schema
      const { error, value } = validateInput<UpdateProductRequest>(updateProductSchema, req.body);
      
      if (error) {
        throw new ApiError(400, error);
      }

      // Ensure value is not undefined
      if (!value) {
        throw new ApiError(500, 'Validation returned no value');
      }

      const product = await this.productService.updateProduct(id, value);
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      res.json({
        success: true,
        message: 'Product updated successfully',
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
      
      console.error('Error in updateProduct controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

  deleteProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'Product ID is required');
      }

      const deleted = await this.productService.deleteProduct(id);
      
      if (!deleted) {
        throw new ApiError(404, 'Product not found');
      }

      res.json({
        success: true,
        message: 'Product deleted successfully'
      });
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

  getProductsByAppId = async (req: Request, res: Response): Promise<void> => {
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
}