import { Router } from 'express';
import { requireInternalToken } from '../middleware/internalAuth';
import { GatewayInternalController } from '../controllers/gatewayInternalController';

const router = Router();

router.post('/verify', requireInternalToken, GatewayInternalController.verify);
router.post(
  '/merchants/:merchantId/ip-whitelist',
  requireInternalToken,
  GatewayInternalController.addMerchantIpWhitelist
);

export const internalGatewayRoutes = router;
