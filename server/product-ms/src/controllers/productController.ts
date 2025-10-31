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
      // Validate input using Joi schema
      const { error, value } = validateInput<SelectProductTypeRequest>(selectProductTypeSchema, req.body);
      
      if (error) {
        throw new ApiError(400, error);
      }

      // Ensure value is not undefined
      if (!value) {
        throw new ApiError(500, 'Validation returned no value');
      }

      const product = await this.productService.selectProductType(value);
      
      res.status(201).json({
        success: true,
        message: 'Product type selected successfully',
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
      // Validate input using Joi schema
      const { error, value } = validateInput<CreateProductAfterTypeRequest>(createProductAfterTypeSchema, req.body);
      
      if (error) {
        throw new ApiError(400, error);
      }

      // Ensure value is not undefined
      if (!value) {
        throw new ApiError(500, 'Validation returned no value');
      }

      const product = await this.productService.createProductAfterType(value);
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }
      
      res.status(200).json({
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
      
      console.error('Error in createProductAfterType controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  };

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

  // Manage product - allows editing/updating all product information for complete products
  manageProduct = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      if (!id) {
        throw new ApiError(400, 'Product ID is required');
      }

      // Get the product to check its status
      const product = await this.productService.getProductById(id);
      
      if (!product) {
        throw new ApiError(404, 'Product not found');
      }

      // Only allow management of complete products
      if (product.status !== 'complete') {
        throw new ApiError(403, 'Product must be complete to be managed. Current status: ' + product.status);
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

      // Update the product
      const updatedProduct = await this.productService.updateProduct(id, value);
      
      if (!updatedProduct) {
        throw new ApiError(404, 'Product not found');
      }

      res.json({
        success: true,
        message: 'Product managed successfully',
        data: updatedProduct
      });
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
}