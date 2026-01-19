import { Router } from 'express';
import { ConfigurationController } from '../controllers/configurationController';
import { productService } from './productRoutes';

const router = Router();
const configurationController = new ConfigurationController(productService);

router.post('/', configurationController.createProductConfiguration);
router.get('/:productId', configurationController.getProductConfiguration);
router.put('/:productId', configurationController.updateProductConfiguration);
router.delete('/:productId', configurationController.deleteProductConfiguration);

export { router as configurationRoutes };