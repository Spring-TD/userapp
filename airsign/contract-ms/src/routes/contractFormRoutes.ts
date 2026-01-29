import { Router } from 'express';
import { ContractFormController } from '../controllers/contractFormController';
import { authenticate } from '../middleware/auth';
import { validateCreateContractForm, validateUpdateContractForm } from '../middleware/contractFormValidation';

const router = Router();
const contractFormController = new ContractFormController();

// Contract Form routes
router.post('/', authenticate, validateCreateContractForm, contractFormController.createForm);
router.get('/my-forms', authenticate, contractFormController.getFormsByUser);
router.get('/my-signed-contracts', authenticate, contractFormController.getSignedContractsByUser);
router.get('/my-contracts-pdf', authenticate, contractFormController.downloadUserContractsPDF);
router.get('/status/:status', contractFormController.getFormsByStatus);
router.get('/order/:orderId', contractFormController.getFormByOrderId);
router.get('/:id', contractFormController.getFormById);
router.get('/:id/pdf', contractFormController.downloadContractPDF);
router.put('/:id', authenticate, validateUpdateContractForm, contractFormController.updateForm);
router.post('/:id/submit', authenticate, contractFormController.submitForm);
router.delete('/:id', authenticate, contractFormController.deleteForm);

export { router as contractFormRoutes };
