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