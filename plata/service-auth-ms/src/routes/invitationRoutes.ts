
import { Router } from 'express';
import { InvitationController } from '../controllers/invitationController';
import { authenticate, merchantOnly } from '../middleware/auth';

const router = Router();

// Merchant endpoints - require auth and merchant role
router.post('/', authenticate, merchantOnly, InvitationController.createInvitation);
router.get('/', authenticate, merchantOnly, InvitationController.getInvitations);

// Public endpoints (for invited users)
router.get('/validate/:token', InvitationController.validateInvitation);
router.post('/accept', InvitationController.acceptInvitation);

export const invitationRoutes = router;
