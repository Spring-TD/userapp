/**
 * SAMS Routes
 * Service Authentication Microservice routing configuration
 */

import { Router } from 'express';
import { ServiceController } from '../controllers/serviceController';
import { WhitelistController } from '../controllers/whitelistController';
import { CredentialController } from '../controllers/credentialController';
// Import auth middleware - for now, we'll make SAMS endpoints publicly accessible
// In production, you'd want to add authentication middleware
// import { authenticate } from '../middleware/auth';

const router = Router();

// Service Management Routes
// POST /api/v1/services/create - Create new service
router.post('/create', ServiceController.createService);

// GET /api/v1/services - Get all services
router.get('/', ServiceController.getAllServices);

// GET /api/v1/services/health - Get system health
router.get('/health', ServiceController.getSystemHealth);

// GET /api/v1/services/:serviceId - Get specific service
router.get('/:serviceId', ServiceController.getServiceById);

// Service IP Whitelist Routes
// POST /api/v1/services/:serviceId/whitelist-ip - Whitelist IPs
router.post('/:serviceId/whitelist-ip', WhitelistController.whitelistIPs);

// GET /api/v1/services/:serviceId/whitelist-ip - Get whitelisted IPs
router.get('/:serviceId/whitelist-ip', WhitelistController.getWhitelistedIPs);

// POST /api/v1/services/:serviceId/check-ip - Check IP access
router.post('/:serviceId/check-ip', WhitelistController.checkIPAccess);

// Service Credential Routes
// POST /api/v1/services/:serviceId/credentials - Create credentials
router.post('/:serviceId/credentials', CredentialController.createCredential);

// GET /api/v1/services/:serviceId/credentials - Get service credentials
router.get('/:serviceId/credentials', CredentialController.getServiceCredentials);

export { router as samsRoutes };