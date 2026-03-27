import express from 'express';
import savingsController from '../controllers/savingsController';

const router = express.Router();

// Create savings account
router.post('/', savingsController.createSavingsAccount);

export default router;
