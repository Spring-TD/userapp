import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { ProductService } from '../services/productService';
import { validate } from '../middleware/validation';
import { createProductSchema, selectProductTypeSchema, createProductAfterTypeSchema, updateProductSchema } from '../utils/validation';
import platformApplicationOptionsController from '../controllers/platformApplicationOptionsController';
import { registerPlatformApplicationOptionsRoutes } from './registerPlatformApplicationOptionsRoutes';
import { requireWalletInternalToken } from '../middleware/walletInternalAuth';

const router = Router();
const productService = new ProductService();
const productController = new ProductController(productService);

registerPlatformApplicationOptionsRoutes(router, platformApplicationOptionsController);

// POST routes are disabled for this service - product creation happens in server/product-ms
// router.post('/', productController.createProduct);
// router.post('/select-type', productController.selectProductType);
// router.post('/create-after-type', productController.createProductAfterType);
router.get('/webhooks/plata/product-updated', productController.getPlataProductUpdatedWebhookStatus);
router.post('/webhooks/plata/product-updated', productController.handlePlataProductUpdatedWebhook);
router.get('/internal/catalog-sync/status', productController.getCatalogSyncSchedulerStatus);
router.post(
  '/internal/catalog-sync/reconcile',
  requireWalletInternalToken,
  productController.runCatalogSyncReconcile
);
router.get('/', productController.getAllProducts);
router.put('/featured/:appId', productController.setAppFeaturedProducts);
router.put('/toggle/:appId/:productId', productController.toggleProductActivation);
router.put('/config/:appId/:productId', productController.updateMerchantProductConfiguration);
router.get('/config/:appId/:productId', productController.getMerchantProductConfiguration);
router.get('/app/:appId/product-overview/by-type/:productType', productController.getProductOverviewByType);
router.get('/app/:appId/product-overview', productController.getProductOverview);
router.get('/app/:appId', productController.getProductsByMerchant);
router.get('/merchant/:appId', productController.getProductsByMerchant);
router.get('/:id/action', productController.checkProductAction);
router.put('/:id/manage', validate(updateProductSchema), productController.manageProduct);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);

export { router as productRoutes, productService };