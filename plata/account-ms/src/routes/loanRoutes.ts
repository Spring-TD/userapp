import express from 'express';
import applicationController from '../controllers/applicationController';

const router = express.Router();

// Apply for a loan (alias for applyForProduct)
router.post('/apply', applicationController.applyForProduct);

// Get loan details by loan_id (alias for getApplicationById)
// Note: In this system, key loan details are in the application until approved
router.get('/:id', applicationController.getApplicationById);

// Get all user's loans (applications)
router.get('/user/:userId', applicationController.getUserLoanApplications);

export default router;
