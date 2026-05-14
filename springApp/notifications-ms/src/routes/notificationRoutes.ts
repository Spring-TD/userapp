/**
 * Notification routes (mounted at /api/v1/notifications)
 * Send email, SMS, or in-app; dual email+in-app; query status and history.
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
 *     summary: Send notification (email, SMS, or in-app)
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
 *                 enum: [email, sms, in_app]
 *               recipient:
 *                 type: string
 *                 description: Email (email), E.164 phone (sms), or user id (in_app)
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
 *         description: Notification sent or in-app saved; returns id
 *       400:
 *         description: Validation error
 *       500:
 *         description: Send failed (id may still be returned in body)
 * /api/v1/notifications/send-dual:
 *   post:
 *     summary: Send same template as email and in-app
 *     description: Requires template email files and {name}.in-app.json
 *     tags: [Notifications]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - userId
 *               - email
 *               - template
 *               - data
 *             properties:
 *               userId:
 *                 type: string
 *                 description: End-user id for in-app inbox
 *               email:
 *                 type: string
 *                 format: email
 *               template:
 *                 type: string
 *               data:
 *                 type: object
 *               priority:
 *                 type: string
 *                 enum: [high, normal, low]
 *     responses:
 *       200:
 *         description: data.inApp and data.email per-channel results; error if either failed
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
 *     description: Optional channel filter; in_app items include data (inAppTitle, inAppBody)
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
 *       - in: query
 *         name: channel
 *         schema:
 *           type: string
 *           enum: [email, sms, in_app]
 *         description: Filter by channel
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

