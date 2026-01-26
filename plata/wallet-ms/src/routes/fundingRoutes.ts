import { Router } from 'express';
import { FundingController } from '../controllers/fundingController';

const router = Router();

// Webhook endpoint for funding notifications
// This endpoint will be called by external payment providers
router.post('/callback', FundingController.handleFundingCallback);

// Endpoint to manually check funding status
router.get('/status/:transactionId', FundingController.checkFundingStatus);

export { router as fundingRoutes };