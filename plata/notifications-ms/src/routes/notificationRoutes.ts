/**
 * Notification routes (mounted at /api/v1/notifications)
 * Send email/SMS and query notification status and history.
 *
 * @openapi
 * /api/v1/notifications:
 *   get:
 *     summary: Get all notifications (admin)
 *     tags: [Notifications]
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated list of notifications
 * /api/v1/notifications/send:
 *   post:
 *     summary: Send notification
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - channel
 *               - recipient
 *               - template
 *               - data
 *             properties:
 *               channel:
 *                 type: string
 *                 enum: [email, sms]
 *               recipient:
 *                 type: string
 *                 description: Email address or phone number
 *               template:
 *                 type: string
 *                 description: Template identifier
 *               data:
 *                 type: object
 *                 description: Template variables (key-value)
 *               priority:
 *                 type: string
 *                 enum: [high, normal, low]
 *     responses:
 *       200:
 *         description: Notification sent; returns id
 *       400:
 *         description: Validation error
 * /api/v1/notifications/{id}/status:
 *   get:
 *     summary: Get notification status
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Status, channel, recipient, template, sentAt, error
 *       404:
 *         description: Notification not found
 * /api/v1/notifications/user/{recipient}:
 *   get:
 *     summary: Get notifications for a recipient
 *     tags: [Notifications]
 *     parameters:
 *       - in: path
 *         name: recipient
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *       - in: query
 *         name: offset
 *         schema:
 *           type: integer
 *           default: 0
 *     responses:
 *       200:
 *         description: Paginated notifications for the recipient
 */

import { Router } from 'express';
import notificationController from '../controllers/notificationController';
import { validate, sendNotificationSchema, sendEmailAndInAppSchema } from '../middleware/validation';

const router = Router();

// Email + in-app (same template)
router.post(
  '/send-dual',
  validate(sendEmailAndInAppSchema),
  notificationController.sendEmailAndInApp.bind(notificationController)
);

// Send notification
router.post('/send', validate(sendNotificationSchema), notificationController.sendNotification.bind(notificationController));

// Get notification status
router.get('/:id/status', notificationController.getStatus.bind(notificationController));

// Get user notifications
router.get('/user/:recipient', notificationController.getUserNotifications.bind(notificationController));

// Get all notifications (admin)
router.get('/', notificationController.getAllNotifications.bind(notificationController));

export default router;

