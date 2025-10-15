import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { ProductService } from '../services/productService';
import { validate } from '../middleware/validation';
import { createProductSchema } from '../utils/validation';

const router = Router();
const productService = new ProductService();
const productController = new ProductController(productService);

router.post('/', productController.createProduct);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get('/app/:appId', productController.getProductsByAppId);
router.get('/:id/action', productController.checkProductAction);

export { router as productRoutes, productService };