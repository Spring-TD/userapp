import { Request, Response } from 'express';
import notificationService from '../services/notificationService';
import { serializeInboxItem } from '../utils/inboxSerializer';
import { ApiError } from '../middleware/errorHandler';

export class InboxController {
  /** GET /api/v1/notifications/inbox */
  async listInbox(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.accessUser!.userId;
      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      const unreadOnly = req.query.unreadOnly === 'true';

      const result = await notificationService.getInbox(userId, limit, offset, unreadOnly);
      res.json({
        success: true,
        data: {
          notifications: result.notifications.map(serializeInboxItem),
          total: result.total,
          limit,
          offset
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /** GET /api/v1/notifications/inbox/unread-count */
  async unreadCount(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.accessUser!.userId;
      const unreadCount = await notificationService.getInAppUnreadCount(userId);
      res.json({ success: true, data: { unreadCount } });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /** PATCH /api/v1/notifications/inbox/read */
  async markReadBulk(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.accessUser!.userId;
      const ids = Array.isArray(req.body?.ids)
        ? (req.body.ids as unknown[]).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : undefined;
      const result = await notificationService.markInboxReadBulk(userId, ids);
      res.json({
        success: true,
        data: {
          modifiedCount: result.modifiedCount,
          readAt: result.readAt
        }
      });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /** PATCH /api/v1/notifications/inbox/:id/read */
  async markReadOne(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.accessUser!.userId;
      const { id } = req.params;
      const updated = await notificationService.markInboxRead(userId, id);
      if (!updated) {
        res.status(404).json({ success: false, error: 'Notification not found or already read' });
        return;
      }
      res.json({ success: true, data: serializeInboxItem(updated) });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /** DELETE /api/v1/notifications/inbox/:id */
  async deleteOne(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.accessUser!.userId;
      const { id } = req.params;
      const removed = await notificationService.deleteInboxItem(userId, id);
      if (!removed) {
        res.status(404).json({ success: false, error: 'Notification not found' });
        return;
      }
      res.json({ success: true, data: { id, deleted: true } });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  /** DELETE /api/v1/notifications/inbox */
  async deleteBulk(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.accessUser!.userId;
      const ids = Array.isArray(req.body?.ids)
        ? (req.body.ids as unknown[]).filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        : [];
      if (ids.length === 0) {
        res.status(400).json({ success: false, error: 'ids array is required and must not be empty' });
        return;
      }
      const deletedCount = await notificationService.deleteInboxItemsBulk(userId, ids);
      res.json({ success: true, data: { deletedCount, ids } });
    } catch (error) {
      this.handleError(res, error);
    }
  }

  private handleError(res: Response, error: unknown): void {
    if (error instanceof ApiError) {
      res.status(error.statusCode).json({ success: false, error: error.message });
      return;
    }
    console.error('Inbox controller error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
}

export default new InboxController();
