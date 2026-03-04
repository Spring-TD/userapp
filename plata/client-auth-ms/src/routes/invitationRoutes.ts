/**
 * Invitation routes (mounted at /api/v1/invitations).
 *
 * @openapi
 * /api/v1/invitations:
 *   post:
 *     summary: Create invitation
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Invitation created
 *   get:
 *     summary: Get invitations
 *     tags: [Invitations]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of invitations
 * /api/v1/invitations/validate/{token}:
 *   get:
 *     summary: Validate invitation token
 *     tags: [Invitations]
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Token validation result
 * /api/v1/invitations/accept:
 *   post:
 *     summary: Accept invitation
 *     tags: [Invitations]
 *     responses:
 *       200:
 *         description: Invitation accepted
 */
import { Router } from 'express';
import { InvitationController } from '../controllers/invitationController';

const router = Router();

// Merchant endpoints
router.post('/', InvitationController.createInvitation);
router.get('/', InvitationController.getInvitations);

// Public endpoints (for invited users)
router.get('/validate/:token', InvitationController.validateInvitationToken);
router.post('/accept', InvitationController.acceptInvitation);

export const invitationRoutes = router;
