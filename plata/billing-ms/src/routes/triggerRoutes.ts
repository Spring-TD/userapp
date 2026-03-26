/**
 * Billing trigger routes (mounted at /api/v1/billing/billing). Event hooks for other services.
 *
 * @openapi
 * /api/v1/billing/billing/triggers/product-created:
 *   post:
 *     summary: Handle product created event
 *     tags: [Billing - Triggers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event handled
 * /api/v1/billing/billing/triggers/wallet-funded:
 *   post:
 *     summary: Handle wallet funded event
 *     tags: [Billing - Triggers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event handled
 * /api/v1/billing/billing/triggers/merchant-users-count:
 *   post:
 *     summary: Handle merchant users count event
 *     tags: [Billing - Triggers]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Event handled
 */
import { Router } from 'express';
import { TriggerController } from '../controllers/TriggerController';

const router = Router();

// Trigger event routes
// These routes would be called by other services when events occur
router.post('/triggers/product-created', TriggerController.handleProductCreated);
router.post('/triggers/wallet-funded', TriggerController.handleWalletFunded);
router.post('/triggers/merchant-users-count', TriggerController.handleMerchantUsersCount);

export { router as triggerRoutes };