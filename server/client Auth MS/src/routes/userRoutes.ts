import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();

// User management routes
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.get('/info', UserController.getInfo);
router.post('/verify-info', UserController.verifyInfo);
router.put('/suspend', UserController.suspend);
router.put('/activate', UserController.activate);

export { router as userRoutes };