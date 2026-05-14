/**
 * FAQ routes (mounted at /api/v1/faqs).
 *
 * Public: GET list (published only) and GET by id (published only), optional `q` search.
 * Merchant or admin (Bearer): POST, PUT, DELETE; GET with `?includeUnpublished=true` lists all; GET by id can return unpublished when authenticated as merchant or admin.
 *
 * @openapi
 * /api/v1/faqs:
 *   get:
 *     summary: List FAQs
 *     tags: [FAQ]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: Case-insensitive search on question and answer
 *       - in: query
 *         name: includeUnpublished
 *         schema: { type: string, enum: ['true'] }
 *         description: When true and caller is merchant or admin, include unpublished rows
 *     responses:
 *       200:
 *         description: List of FAQs
 *   post:
 *     summary: Create FAQ (merchant or admin)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 * /api/v1/faqs/{id}:
 *   get:
 *     summary: Get FAQ by id
 *     tags: [FAQ]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: FAQ
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update FAQ (merchant or admin)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Updated
 *   delete:
 *     summary: Delete FAQ (merchant or admin)
 *     tags: [FAQ]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Deleted
 */
import { Router } from 'express';
import { FaqController } from '../controllers/faqController';
import { authenticate, merchantOrAdmin, optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuthenticate, FaqController.list);
router.get('/:id', optionalAuthenticate, FaqController.getById);

router.post('/', authenticate, merchantOrAdmin, FaqController.create);
router.put('/:id', authenticate, merchantOrAdmin, FaqController.update);
router.delete('/:id', authenticate, merchantOrAdmin, FaqController.remove);

export { router as faqRoutes };
