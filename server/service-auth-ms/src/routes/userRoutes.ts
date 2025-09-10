import { Router } from 'express';
import { UserController } from '../controllers/userController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All user routes require authentication
router.use(authenticate);

// User profile management routes
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);

// Admin user management routes
router.get('/info/:userId', UserController.getInfo);
router.post('/verify-info/:userId', UserController.verifyInfo);
router.put('/suspend/:userId', UserController.suspend);
router.put('/activate/:userId', UserController.activate);

export { router as userRoutes };