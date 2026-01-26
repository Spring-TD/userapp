import { Router } from 'express';
import { ContractController } from '../controllers/contractController';
import { authenticate } from '../middleware/auth';

const router = Router();
const contractController = new ContractController();

// Contract routes
router.post('/', authenticate, contractController.createContract);
router.get('/', contractController.getAllContracts);
router.get('/:id', contractController.getContractById);
router.put('/:id', authenticate, contractController.updateContract);
router.delete('/:id', authenticate, contractController.deleteContract);
router.post('/:id/sign', authenticate, contractController.signContract);
router.get('/:id/status', contractController.getContractStatus);

export { router as contractRoutes };
