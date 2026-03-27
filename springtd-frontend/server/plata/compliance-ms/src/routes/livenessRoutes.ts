import { Router } from 'express';
import { LivenessController } from '../controllers/livenessController';

const router = Router();

// Webhook endpoint for liveness test results
// This endpoint will be called by the third-party provider
router.post('/webhook', LivenessController.handleLivenessResult);

// Endpoint to manually check liveness test results
router.get('/status/:providerReference', LivenessController.checkLivenessStatus);

// Endpoint to generate a new liveness test URL for a shareholder
router.post('/generate/:shareholderId', LivenessController.generateLivenessTest);

export { router as livenessRoutes };