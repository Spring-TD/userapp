import { Request, Response } from 'express';
import { FaqService } from '../services/FaqService';
import { validateForm, faqCreateSchema, faqUpdateSchema } from '../utils/validation';

export class FaqController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const isMerchantOrAdmin =
        req.user?.userType === 'admin' || req.user?.userType === 'merchant';
      const includeAll = req.query.includeUnpublished === 'true' && isMerchantOrAdmin;

      const faqs = includeAll ? await FaqService.listAll(q) : await FaqService.listPublished(q);
      res.status(200).json({ success: true, data: { faqs } });
    } catch (error) {
      console.error('Error listing FAQs:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const allowUnpublished =
        req.user?.userType === 'admin' || req.user?.userType === 'merchant';
      const faq = await FaqService.getById(id, allowUnpublished);
      if (!faq) {
        res.status(404).json({ success: false, error: 'FAQ not found' });
        return;
      }
      res.status(200).json({ success: true, data: { faq } });
    } catch (error) {
      console.error('Error getting FAQ:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validation = validateForm<{
        question: string;
        answer: string;
        sort_order?: number;
        is_published?: boolean;
      }>(faqCreateSchema, req.body);

      if (validation.error) {
        res.status(400).json({ success: false, error: validation.error });
        return;
      }

      const faq = await FaqService.create(validation.value!);
      res.status(201).json({ success: true, message: 'FAQ created', data: { faq } });
    } catch (error) {
      console.error('Error creating FAQ:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!FaqService.isValidId(id)) {
        res.status(400).json({ success: false, error: 'Invalid FAQ id' });
        return;
      }

      const validation = validateForm<{
        question?: string;
        answer?: string;
        sort_order?: number;
        is_published?: boolean;
      }>(faqUpdateSchema, req.body);

      if (validation.error) {
        res.status(400).json({ success: false, error: validation.error });
        return;
      }

      const faq = await FaqService.update(id, validation.value || {});
      if (!faq) {
        res.status(404).json({ success: false, error: 'FAQ not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'FAQ updated', data: { faq } });
    } catch (error) {
      console.error('Error updating FAQ:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!FaqService.isValidId(id)) {
        res.status(400).json({ success: false, error: 'Invalid FAQ id' });
        return;
      }
      const deleted = await FaqService.remove(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'FAQ not found' });
        return;
      }
      res.status(200).json({ success: true, message: 'FAQ deleted' });
    } catch (error) {
      console.error('Error deleting FAQ:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
