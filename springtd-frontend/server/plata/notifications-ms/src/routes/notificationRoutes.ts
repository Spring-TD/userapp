import { Router } from 'express';
import notificationController from '../controllers/notificationController';
import { validate, sendNotificationSchema } from '../middleware/validation';

const router = Router();

// Send notification
router.post('/send', validate(sendNotificationSchema), notificationController.sendNotification.bind(notificationController));

// Get notification status
router.get('/:id/status', notificationController.getStatus.bind(notificationController));

// Get user notifications
router.get('/user/:recipient', notificationController.getUserNotifications.bind(notificationController));

// Get all notifications (admin)
router.get('/', notificationController.getAllNotifications.bind(notificationController));

export default router;

