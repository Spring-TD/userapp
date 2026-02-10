import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// User profile management routes
router.get('/list', authenticate, UserController.listUsers);
router.get('/profile', authenticate, UserController.getProfile);
router.put('/profile', authenticate, UserController.updateProfile);
router.put('/:userId/status', authenticate, UserController.updateStatus);
router.post('/deactivate', authenticate, UserController.deactivate);
router.put('/callbacks', authenticate, UserController.updateCallbackUrls);

// Admin user management routes
router.get('/info/:userId', authenticate, UserController.getInfo);
router.post('/verify-info/:userId', authenticate, UserController.verifyInfo);
router.put('/suspend/:userId', authenticate, UserController.suspend);
router.put('/activate/:userId', authenticate, UserController.activate);

export { router as userRoutes };