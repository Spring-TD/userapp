/**
 * Support contact routes (mounted at /api/v1/support-contacts).
 *
 * Public: GET list (published only) and GET by id, optional `q` search on title/link.
 * Merchant or admin: POST, PUT, DELETE; GET ?includeUnpublished=true; GET by id includes unpublished when Bearer is merchant/admin.
 *
 * @openapi
 * /api/v1/support-contacts:
 *   get:
 *     summary: List support contacts
 *     tags: [SupportContact]
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: includeUnpublished
 *         schema: { type: string, enum: ['true'] }
 *     responses:
 *       200:
 *         description: List of contacts
 *   post:
 *     summary: Create support contact (merchant or admin)
 *     tags: [SupportContact]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Created
 * /api/v1/support-contacts/{id}:
 *   get:
 *     summary: Get support contact by id
 *     tags: [SupportContact]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Contact
 *       404:
 *         description: Not found
 *   put:
 *     summary: Update support contact (merchant or admin)
 *     tags: [SupportContact]
 *     security:
 *       - bearerAuth: []
 *   delete:
 *     summary: Delete support contact (merchant or admin)
 *     tags: [SupportContact]
 *     security:
 *       - bearerAuth: []
 */
import { Router } from 'express';
import { SupportContactController } from '../controllers/supportContactController';
import { authenticate, merchantOrAdmin, optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.get('/', optionalAuthenticate, SupportContactController.list);
router.get('/:id', optionalAuthenticate, SupportContactController.getById);

router.post('/', authenticate, merchantOrAdmin, SupportContactController.create);
router.put('/:id', authenticate, merchantOrAdmin, SupportContactController.update);
router.delete('/:id', authenticate, merchantOrAdmin, SupportContactController.remove);

export { router as supportContactRoutes };
