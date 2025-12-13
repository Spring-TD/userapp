import { Router } from 'express';
import { UserController } from '../controllers/userController';

const router = Router();

// User profile management routes
router.get('/list', UserController.listUsers);
router.get('/profile', UserController.getProfile);
router.put('/profile', UserController.updateProfile);
router.put('/:userId/status', UserController.updateStatus);
router.post('/deactivate', UserController.deactivate);

// Admin user management routes
router.get('/info/:userId', UserController.getInfo);
router.post('/verify-info/:userId', UserController.verifyInfo);
router.put('/suspend/:userId', UserController.suspend);
router.put('/activate/:userId', UserController.activate);

export { router as userRoutes };