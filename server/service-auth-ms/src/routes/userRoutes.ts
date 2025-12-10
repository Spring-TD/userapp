import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate, adminOnly } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// User profile management routes
router.get('/list', UserController.getMerchantUsers);
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/:userId/status', UserController.updateStatus);

// Admin user management routes
router.get('/info/:userId', adminOnly, UserController.getInfo);
router.post('/verify-info/:userId', adminOnly, UserController.verifyInfo);
router.put('/suspend/:userId', adminOnly, UserController.suspend);
router.put('/activate/:userId', adminOnly, UserController.activate);

export { router as userRoutes };