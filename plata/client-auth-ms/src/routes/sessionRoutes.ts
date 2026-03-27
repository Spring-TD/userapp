/**
 * Session routes (mounted at /api/v1/sessions).
 *
 * @openapi
 * /api/v1/sessions:
 *   get:
 *     summary: Get active sessions
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of sessions
 * /api/v1/sessions/{sessionId}:
 *   delete:
 *     summary: Revoke session
 *     tags: [Sessions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sessionId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Session revoked
 */
import { Router } from 'express';
import { SessionController } from '../controllers/sessionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// active login session routes (protected)
router.get('/', authenticate, SessionController.getSessions);
router.delete('/:sessionId', authenticate, SessionController.revokeSession);

export { router as sessionRoutes };
