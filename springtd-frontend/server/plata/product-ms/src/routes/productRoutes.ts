import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { ProductService } from '../services/productService';
import { validate } from '../middleware/validation';
import { createProductSchema, selectProductTypeSchema, createProductAfterTypeSchema, updateProductSchema } from '../utils/validation';

const router = Router();
const productService = new ProductService();
const productController = new ProductController(productService);

router.post('/', productController.createProduct);
router.post('/select-type', productController.selectProductType);
router.post('/create-after-type', productController.createProductAfterType);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get('/app/:appId', productController.getProductsByAppId);
router.get('/:id/action', productController.checkProductAction);
router.put('/:id/manage', validate(updateProductSchema), productController.manageProduct);

export { router as productRoutes, productService };