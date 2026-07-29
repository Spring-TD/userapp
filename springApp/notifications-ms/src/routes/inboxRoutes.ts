import { Router } from 'express';
import inboxController from '../controllers/inboxController';
import { requireAccessToken } from '../middleware/requireAccessToken';
import { validate, inboxMarkReadSchema, inboxDeleteBulkSchema } from '../middleware/validation';

const router = Router();

router.use(requireAccessToken);

router.get('/unread-count', inboxController.unreadCount.bind(inboxController));
router.patch('/read', validate(inboxMarkReadSchema), inboxController.markReadBulk.bind(inboxController));
router.get('/', inboxController.listInbox.bind(inboxController));
router.patch('/:id/read', inboxController.markReadOne.bind(inboxController));
router.delete('/:id', inboxController.deleteOne.bind(inboxController));
router.delete('/', validate(inboxDeleteBulkSchema), inboxController.deleteBulk.bind(inboxController));

export default router;
