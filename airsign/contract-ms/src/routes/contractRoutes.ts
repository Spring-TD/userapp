import { Router } from 'express';
import { ContractController } from '../controllers/contractController';
import { PublicContractController } from '../controllers/publicContractController';
import { authenticate } from '../middleware/auth';

const router = Router();
const contractController = new ContractController();
const publicContractController = new PublicContractController();

// Public route for initial contract creation (no auth required)
router.post('/public/create', contractController.createPublicContract);

// Public contract signing routes (no auth required)
router.post('/public/request-otp', publicContractController.requestOtp);
router.post('/public/verify-otp', publicContractController.verifyOtp);
router.get('/public/form/:formId', publicContractController.getContractForm);
router.post('/public/form/:formId/submit', publicContractController.submitContractForm);

// Contract routes
router.post('/', authenticate, contractController.createContract);
router.get('/', contractController.getAllContracts);
router.get('/:id', contractController.getContractById);
router.put('/:id', authenticate, contractController.updateContract);
router.delete('/:id', authenticate, contractController.deleteContract);
router.post('/:id/sign', authenticate, contractController.signContract);
router.get('/:id/status', contractController.getContractStatus);

export { router as contractRoutes };
