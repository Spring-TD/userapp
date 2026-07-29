/**
 * Teams routes (mounted at /api/v1/team).
 * Merchant staff invited via /api/v1/invitations with a role_id.
 */
import { Router } from 'express';
import { TeamController } from '../controllers/teamController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.get('/members', authenticate, TeamController.listMembers);
router.put('/members/:userId/role', authenticate, TeamController.updateMemberRole);
router.put('/members/:userId/suspend', authenticate, TeamController.suspendMember);
router.put('/members/:userId/activate', authenticate, TeamController.activateMember);

export const teamRoutes = router;
