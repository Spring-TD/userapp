
import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Get active sessions
router.get('/', authenticate, SessionController.getSessions);

// Revoke session
router.delete('/:sessionId', authenticate, SessionController.revokeSession);

export { router as sessionRoutes };
