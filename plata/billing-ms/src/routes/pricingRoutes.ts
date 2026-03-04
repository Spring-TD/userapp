/**
 * Pricing routes (mounted at /api/v1/billing/pricing). Admin-only.
 *
 * @openapi
 * /api/v1/billing/pricing/pricing-schedules:
 *   post:
 *     summary: Create pricing schedule
 *     tags: [Billing - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       201:
 *         description: Schedule created
 *   get:
 *     summary: List pricing schedules
 *     tags: [Billing - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Schedule list
 * /api/v1/billing/pricing/pricing-schedules/{id}:
 *   get:
 *     summary: Get pricing schedule by ID
 *     tags: [Billing - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Schedule details
 *   put:
 *     summary: Update pricing schedule
 *     tags: [Billing - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Updated
 * /api/v1/billing/pricing/pricing-schedules/{id}/cancel:
 *   post:
 *     summary: Cancel pricing schedule
 *     tags: [Billing - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cancelled
 * /api/v1/billing/pricing/pricing-schedules/{id}/pause:
 *   post:
 *     summary: Pause pricing schedule
 *     tags: [Billing - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Paused
 * /api/v1/billing/pricing/pricing-schedules/{id}/resume:
 *   post:
 *     summary: Resume pricing schedule
 *     tags: [Billing - Pricing]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Resumed
 * /api/v1/billing/pricing/pricing-schedules/trigger:
 *   post:
 *     summary: Manually trigger pricing process
 *     tags: [Billing - Pricing]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Triggered
 */
import { Router } from 'express';
import { PricingController } from '../controllers/PricingController';
import adminAuth from '../middleware/adminAuth';

const router = Router();

// Pricing schedule routes (protected by admin auth)
router.post('/pricing-schedules', adminAuth, PricingController.createPricingSchedule);
router.get('/pricing-schedules/:id', adminAuth, PricingController.getPricingSchedule);
router.get('/pricing-schedules', adminAuth, PricingController.listPricingSchedules);
router.put('/pricing-schedules/:id', adminAuth, PricingController.updatePricingSchedule);
router.post('/pricing-schedules/:id/cancel', adminAuth, PricingController.cancelPricingSchedule);
router.post('/pricing-schedules/:id/pause', adminAuth, PricingController.pausePricingSchedule);
router.post('/pricing-schedules/:id/resume', adminAuth, PricingController.resumePricingSchedule);

// Manual trigger route (protected by admin auth)
router.post('/pricing-schedules/trigger', adminAuth, PricingController.triggerPricingProcess);

export { router as pricingRoutes };