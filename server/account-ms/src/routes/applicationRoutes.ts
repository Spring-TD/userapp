import express from 'express';
import applicationController from '../controllers/applicationController';

const router = express.Router();

// Apply for a product
router.post('/apply', applicationController.applyForProduct);

// Admin: Approve application
router.post('/:id/approve', applicationController.approveApplication);

// Admin: Reject application
router.post('/:id/reject', applicationController.rejectApplication);

// Admin: Get all applications
router.get('/', applicationController.getAllApplications);

// Admin: Get pending applications
router.get('/pending', applicationController.getPendingApplications);

// Get user applications
router.get('/user/:userId', applicationController.getUserApplications);

// Get application by ID
router.get('/:id', applicationController.getApplicationById);

export default router;
