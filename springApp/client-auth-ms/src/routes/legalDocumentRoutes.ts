/**
 * Legal document routes (mounted at /api/v1/legal-documents).
 *
 * Covers terms of service and privacy policy summary content.
 *
 * Public: GET list and GET by id (published only).
 * Merchant or admin: POST, PUT, DELETE and include unpublished content.
 *
 * @openapi
 * /api/v1/legal-documents:
 *   get:
 *     summary: List legal documents
 *     tags: [LegalDocument]
 *     parameters:
 *       - in: query
 *         name: document_type
 *         schema: { type: string, enum: [terms_of_service, privacy_policy] }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: includeUnpublished
 *         schema: { type: string, enum: ['true'] }
 *   post:
 *     summary: Create legal document (merchant or admin)
 *     tags: [LegalDocument]
 *     security:
 *       - bearerAuth: []
 * /api/v1/legal-documents/{id}:
 *   get:
 *     summary: Get legal document by id
 *     tags: [LegalDocument]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *   put:
 *     summary: Update legal document (merchant or admin)
 *     tags: [LegalDocument]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Delete legal document (merchant or admin)
 *     tags: [LegalDocument]
 *     security:
 *       - bearerAuth: []
 */
import { Router } from 'express';
import { LegalDocumentController } from '../controllers/legalDocumentController';
import { authenticate, merchantOrAdmin, optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuthenticate, LegalDocumentController.list);
router.get('/:id', optionalAuthenticate, LegalDocumentController.getById);

router.post('/', authenticate, merchantOrAdmin, LegalDocumentController.create);
router.put('/:id', authenticate, merchantOrAdmin, LegalDocumentController.update);
router.delete('/:id', authenticate, merchantOrAdmin, LegalDocumentController.remove);

export { router as legalDocumentRoutes };
