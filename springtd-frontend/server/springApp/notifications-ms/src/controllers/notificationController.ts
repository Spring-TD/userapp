import { Request, Response } from 'express';
import notificationService from '../services/notificationService';
import { SendNotificationRequest } from '../types/notification';
import { ApiError } from '../middleware/errorHandler';

export class NotificationController {
  /**
   * Send notification
   * POST /api/v1/notifications/send
   */
  async sendNotification(req: Request, res: Response): Promise<void> {
    try {
      const request: SendNotificationRequest = req.body;
      const result = await notificationService.send(request);

      if (result.success) {
        res.status(200).json({
          success: true,
          message: result.message || 'Notification sent successfully',
          data: {
            id: result.id
          }
        });
      } else {
        res.status(500).json({
          success: false,
          error: result.error || 'Failed to send notification',
          data: {
            id: result.id
          }
        });
      }
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in sendNotification controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get notification status
   * GET /api/v1/notifications/:id/status
   */
  async getStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      if (!id) {
        throw new ApiError(400, 'Notification ID is required');
      }

      const notification = await notificationService.getNotificationStatus(id);

      if (!notification) {
        throw new ApiError(404, 'Notification not found');
      }

      res.json({
        success: true,
        data: {
          id: notification._id.toString(),
          status: notification.status,
          channel: notification.channel,
          recipient: notification.recipient,
          template: notification.template,
          sentAt: notification.sentAt,
          error: notification.error,
          createdAt: notification.createdAt
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getStatus controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get user notifications
   * GET /api/v1/notifications/user/:recipient
   */
  async getUserNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { recipient } = req.params;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      if (!recipient) {
        throw new ApiError(400, 'Recipient is required');
      }

      const result = await notificationService.getUserNotifications(recipient, limit, offset);

      res.json({
        success: true,
        data: {
          notifications: result.notifications.map(n => ({
            id: n._id.toString(),
            channel: n.channel,
            template: n.template,
            status: n.status,
            createdAt: n.createdAt,
            sentAt: n.sentAt
          })),
          total: result.total,
          limit,
          offset
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getUserNotifications controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  /**
   * Get all notifications (admin)
   * GET /api/v1/notifications
   */
  async getAllNotifications(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;

      const result = await notificationService.getAllNotifications(limit, offset);

      res.json({
        success: true,
        data: {
          notifications: result.notifications.map(n => ({
            id: n._id.toString(),
            channel: n.channel,
            recipient: n.recipient,
            template: n.template,
            status: n.status,
            createdAt: n.createdAt,
            sentAt: n.sentAt
          })),
          total: result.total,
          limit,
          offset
        }
      });
    } catch (error) {
      if (error instanceof ApiError) {
        res.status(error.statusCode).json({
          success: false,
          error: error.message
        });
        return;
      }

      console.error('Error in getAllNotifications controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }
}

export default new NotificationController();

