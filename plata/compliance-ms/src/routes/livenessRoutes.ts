/**
 * Liveness test routes (mounted at /api/v1/kyc/liveness).
 *
 * @openapi
 * /api/v1/kyc/liveness/webhook:
 *   post:
 *     summary: Liveness result webhook (provider callback)
 *     tags: [KYC - Liveness]
 *     responses:
 *       200:
 *         description: Webhook processed
 * /api/v1/kyc/liveness/status/{providerReference}:
 *   get:
 *     summary: Check liveness test status
 *     tags: [KYC - Liveness]
 *     parameters:
 *       - in: path
 *         name: providerReference
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liveness status
 * /api/v1/kyc/liveness/generate/{shareholderId}:
 *   post:
 *     summary: Generate liveness test URL for shareholder
 *     tags: [KYC - Liveness]
 *     parameters:
 *       - in: path
 *         name: shareholderId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liveness URL generated
 */
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