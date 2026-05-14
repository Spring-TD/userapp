
import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';

const router = Router();

// active login session routes
router.get('/', SessionController.getSessions);
router.delete('/:sessionId', SessionController.revokeSession);

export { router as sessionRoutes };
