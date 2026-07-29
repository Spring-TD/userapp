import { Router } from 'express';
import { ConfigurationController } from '../controllers/configurationController';
import { productService } from './productRoutes';
import platformApplicationOptionsController from '../controllers/platformApplicationOptionsController';
import { registerPlatformApplicationOptionsRoutes } from './registerPlatformApplicationOptionsRoutes';

const router = Router();
const configurationController = new ConfigurationController(productService);

/** Legacy alias: same handlers as `/api/v1/products/options/*`. */
registerPlatformApplicationOptionsRoutes(router, platformApplicationOptionsController);

router.post('/', configurationController.createProductConfiguration);
router.get('/:productId', configurationController.getProductConfiguration);
router.put('/:productId', configurationController.updateProductConfiguration);
router.delete('/:productId', configurationController.deleteProductConfiguration);

export { router as configurationRoutes };