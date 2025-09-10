>>>>>>> 61b77a379aa21ff00899f7fb6df7b19f71b6190b

const router = Router();

// Password management routes
router.post('/forgot', PasswordController.forgot);
router.post('/reset', PasswordController.reset);
<<<<<<< HEAD
router.put('/change', authenticate, PasswordController.change);
router.put('/change', PasswordController.change);
>>>>>>> 61b77a379aa21ff00899f7fb6df7b19f71b6190b

export { router as passwordRoutes };
import { Router } from 'express';
import { PasswordController } from '../controllers/passwordController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Password management routes
router.post('/forgot', PasswordController.forgot);
router.post('/reset', PasswordController.reset);
router.put('/change', authenticate, PasswordController.change);

export { router as passwordRoutes };
=======
>>>>>>> 61b77a379aa21ff00899f7fb6df7b19f71b6190b

const router = Router();

// Password management routes
router.post('/forgot', PasswordController.forgot);
router.post('/reset', PasswordController.reset);
<<<<<<< HEAD
router.put('/change', authenticate, PasswordController.change);
=======
router.put('/change', PasswordController.change);
>>>>>>> 61b77a379aa21ff00899f7fb6df7b19f71b6190b

export { router as passwordRoutes };