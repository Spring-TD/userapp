import express from 'express';
import applicationController from '../controllers/applicationController';
import { requireAdmin, requireAdminOrMerchantApplicationList } from '../middleware/authMiddleware';

const router = express.Router();

// Apply for a mortgage
router.post('/apply', applicationController.applyForProduct);

// Admin or merchant: blacklisted mortgage applications (merchant-scoped)
router.get('/blacklisted', requireAdminOrMerchantApplicationList, applicationController.getBlacklistedMortgageApplications);

// Admin: blacklist a mortgage application
router.post('/:id/blacklist', requireAdmin, applicationController.blacklistMortgageApplication);

// Get user mortgages
router.get('/user/:userId', applicationController.getUserMortgageApplications);

// Get mortgage details by id (application id)
router.get('/:id', applicationController.getApplicationById);

export default router;
