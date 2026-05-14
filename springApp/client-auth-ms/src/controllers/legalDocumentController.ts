import { Request, Response } from 'express';
import { LegalDocumentType } from '../models/LegalDocumentModel';
import { LegalDocumentService } from '../services/LegalDocumentService';
import {
  legalDocumentCreateSchema,
  legalDocumentUpdateSchema,
  validateForm,
} from '../utils/validation';

function parseLegalDocumentType(value: unknown): LegalDocumentType | undefined {
  if (value === LegalDocumentType.TERMS_OF_SERVICE) return LegalDocumentType.TERMS_OF_SERVICE;
  if (value === LegalDocumentType.PRIVACY_POLICY) return LegalDocumentType.PRIVACY_POLICY;
  return undefined;
}

export class LegalDocumentController {
  static async list(req: Request, res: Response): Promise<void> {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const type = parseLegalDocumentType(req.query.document_type);
      if (req.query.document_type !== undefined && !type) {
        res.status(400).json({
          success: false,
          error: 'document_type must be terms_of_service or privacy_policy',
        });
        return;
      }

      const isMerchantOrAdmin = req.user?.userType === 'admin' || req.user?.userType === 'merchant';
      const includeUnpublished = req.query.includeUnpublished === 'true' && isMerchantOrAdmin;

      const documents = await LegalDocumentService.list(type, q, includeUnpublished);
      res.status(200).json({ success: true, data: { documents } });
    } catch (error) {
      console.error('Error listing legal documents:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const allowUnpublished = req.user?.userType === 'admin' || req.user?.userType === 'merchant';
      const document = await LegalDocumentService.getById(id, allowUnpublished);

      if (!document) {
        res.status(404).json({ success: false, error: 'Legal document not found' });
        return;
      }

      res.status(200).json({ success: true, data: { document } });
    } catch (error) {
      console.error('Error getting legal document:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const validation = validateForm<{
        document_type: LegalDocumentType;
        title: string;
        effective_date: Date;
        content: string;
        sort_order?: number;
        is_published?: boolean;
      }>(legalDocumentCreateSchema, req.body);

      if (validation.error) {
        res.status(400).json({ success: false, error: validation.error });
        return;
      }

      const document = await LegalDocumentService.create(validation.value!);
      res.status(201).json({
        success: true,
        message: 'Legal document created',
        data: { document },
      });
    } catch (error) {
      console.error('Error creating legal document:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async update(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!LegalDocumentService.isValidId(id)) {
        res.status(400).json({ success: false, error: 'Invalid legal document id' });
        return;
      }

      const validation = validateForm<{
        document_type?: LegalDocumentType;
        title?: string;
        effective_date?: Date;
        content?: string;
        sort_order?: number;
        is_published?: boolean;
      }>(legalDocumentUpdateSchema, req.body);

      if (validation.error) {
        res.status(400).json({ success: false, error: validation.error });
        return;
      }

      const document = await LegalDocumentService.update(id, validation.value || {});
      if (!document) {
        res.status(404).json({ success: false, error: 'Legal document not found' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Legal document updated',
        data: { document },
      });
    } catch (error) {
      console.error('Error updating legal document:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }

  static async remove(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!LegalDocumentService.isValidId(id)) {
        res.status(400).json({ success: false, error: 'Invalid legal document id' });
        return;
      }

      const deleted = await LegalDocumentService.remove(id);
      if (!deleted) {
        res.status(404).json({ success: false, error: 'Legal document not found' });
        return;
      }

      res.status(200).json({ success: true, message: 'Legal document deleted' });
    } catch (error) {
      console.error('Error deleting legal document:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  }
}
