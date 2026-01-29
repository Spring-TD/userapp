import { Router } from 'express';
import { ContractOrderController } from '../controllers/contractOrderController';
import { authenticate } from '../middleware/auth';
import { validateCreateContractOrder, validateUpdateOrderStatus } from '../middleware/contractOrderValidation';
import { validateShareContract } from '../middleware/contractShareValidation';

const router = Router();
const contractOrderController = new ContractOrderController();

// Contract Order routes
router.get('/contract-types', contractOrderController.getContractTypes);
router.get('/contract-types/:type', contractOrderController.getContractTypeRequirements);
router.get('/verify/:reference', contractOrderController.verifyContractReference);
router.post('/', authenticate, validateCreateContractOrder, contractOrderController.createOrder);
router.get('/my-orders', authenticate, contractOrderController.getOrdersByUser);
router.get('/:id', contractOrderController.getOrderById);
router.post('/:id/share', authenticate, validateShareContract, contractOrderController.shareContractUrl);
router.get('/contract/:contractId', contractOrderController.getOrdersByContract);
router.patch('/:id/status', authenticate, validateUpdateOrderStatus, contractOrderController.updateOrderStatus);

export { router as contractOrderRoutes };
