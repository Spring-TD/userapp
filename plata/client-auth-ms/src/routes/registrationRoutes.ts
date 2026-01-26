import { Router } from 'express';
import { RegistrationController } from '../controllers/registrationController';

const router = Router();

router.get('/forms', RegistrationController.getRegistrationForms);
router.post('/merchant', RegistrationController.registerMerchant);
router.post('/user', RegistrationController.registerUser);
router.post('/admin', RegistrationController.registerAdmin);

export { router as registrationRoutes };