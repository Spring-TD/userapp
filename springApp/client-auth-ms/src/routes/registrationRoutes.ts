/**
 * Registration routes (mounted at /api/v1/registration).
 *
 * @openapi
 * /api/v1/registration/forms:
 *   get:
 *     summary: Get registration forms
 *     tags: [Registration]
 *     responses:
 *       200:
 *         description: Registration forms
 * /api/v1/registration/merchant:
 *   post:
 *     summary: Register merchant
 *     tags: [Registration]
 *     responses:
 *       201:
 *         description: Merchant registered
 * /api/v1/registration/user:
 *   post:
 *     summary: Register user
 *     tags: [Registration]
 *     responses:
 *       201:
 *         description: User registered
 * /api/v1/registration/admin:
 *   post:
 *     summary: Register admin
 *     tags: [Registration]
 *     responses:
 *       201:
 *         description: Admin registered
 */
import { Router } from 'express';
import { RegistrationController } from '../controllers/registrationController';

const router = Router();

router.get('/forms', RegistrationController.getRegistrationForms);
router.post('/merchant', RegistrationController.registerMerchant);
router.post('/user', RegistrationController.registerUser);
router.post('/admin', RegistrationController.registerAdmin);

export { router as registrationRoutes };