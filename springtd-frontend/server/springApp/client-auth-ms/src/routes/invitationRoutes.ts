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
