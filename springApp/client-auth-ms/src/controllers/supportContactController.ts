import { Request, Response } from 'express';
import { SupportContactService } from '../services/SupportContactService';
import { validateForm, supportContactCreateSchema, supportContactUpdateSchema } from '../utils/validation';

export class SupportContactController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const isMerchantOrAdmin =
        req.user?.userType === 'admin' || req.user?.userType === 'merchant';
      const includeAll = req.query.includeUnpublished === 'true' && isMerchantOrAdmin;

      const contacts = includeAll
        ? await SupportContactService.listAll(q)
        : await SupportContactService.listPublished(q);
      res.status(200).json({ success: true, data: { contacts } });
    } catch (error) {
      console.error('Error listing support contacts:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const allowUnpublished =
        req.user?.userType === 'admin' || req.user?.userType === 'merchant';
      const contact = await SupportContactService.getById(id, allowUnpublished);
      if (!contact) {
        res.status(404).json({ success: false, error: 'Support contact not found' });
        return;
      }
      res.status(200).json({ success: true, data: { contact } });
    } catch (error) {
      console.error('Error getting support contact:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validation = validateForm<{
        title: string;
        link_url: string;
        icon_type?: string;
        sort_order?: number;
        is_published?: boolean;
      }>(supportContactCreateSchema, req.body);

      if (validation.error) {
        res.status(400).json({ success: false, error: validation.error });
        return;
      }

      const contact = await SupportContactService.create(validation.value!);
      res.status(201).json({
        success: true,
        message: 'Support contact created',
        data: { contact },
      });
    } catch (error) {
      console.error('Error creating support contact:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!SupportContactService.isValidId(id)) {
        res.status(400).json({ success: false, error: 'Invalid support contact id' });
        return;
      }

      const validation = validateForm<{
        title?: string;
        link_url?: string;
        icon_type?: string;
        sort_order?: number;
        is_published?: boolean;
      }>(supportContactUpdateSchema, req.body);

      if (validation.error) {
        res.status(400).json({ success: false, error: validation.error });
        return;
      }

      const contact = await SupportContactService.update(id, validation.value || {});
      if (!contact) {
        res.status(404).json({ success: false, error: 'Support contact not found' });
        return;
      }
      res.status(200).json({
        success: true,
        message: 'Support contact updated',
        data: { contact },
      });
    } catch (error) {
      console.error('Error updating support contact:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!SupportContactService.isValidId(id)) {
        res.status(400).json({ success: false, error: 'Invalid support contact id' });
        return;
      }
      const deleted = await SupportContactService.remove(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Support contact not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'Support contact deleted' });
    } catch (error) {
      console.error('Error deleting support contact:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
