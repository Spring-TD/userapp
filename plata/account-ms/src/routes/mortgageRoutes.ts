import express from 'express';
import applicationController from '../controllers/applicationController';

const router = express.Router();

// Apply for a mortgage
router.post('/apply', applicationController.applyForProduct);

// Get mortgage details by id (application id)
router.get('/:id', applicationController.getApplicationById);

// Get user mortgages
router.get('/user/:userId', applicationController.getUserMortgageApplications);

export default router;
