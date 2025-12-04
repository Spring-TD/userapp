import express from 'express';
import applicationController from '../controllers/applicationController';
import { requireAdmin } from '../middleware/authMiddleware';

const router = express.Router();

// Apply for a product
router.post('/apply', applicationController.applyForProduct);

// Admin: Approve application
router.post('/:id/approve', requireAdmin, applicationController.approveApplication);

// Admin: Reject application
router.post('/:id/reject', requireAdmin, applicationController.rejectApplication);

// Admin: Get all applications
router.get('/', requireAdmin, applicationController.getAllApplications);

// Admin: Get pending applications
router.get('/pending', requireAdmin, applicationController.getPendingApplications);

// Get user applications
router.get('/user/:userId', applicationController.getUserApplications);

// Get application by ID
router.get('/:id', applicationController.getApplicationById);

export default router;
