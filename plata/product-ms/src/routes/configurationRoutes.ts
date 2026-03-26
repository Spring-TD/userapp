/**
 * Legacy mount: `/api/v1/configurations/options/*` (same handlers as `/api/v1/products/options/*`).
 * Form values belong on discriminator paths (`about`, `structure`, `feesAndCharges`, `config` for INVESTMENT, etc.).
 *
 * @openapi
 * /api/v1/configurations/options/loan-tenure:
 *   get:
 *     summary: Get loan tenure options
 *     tags: [Configurations]
 */

import { Router } from 'express';
import { ConfigurationController } from '../controllers/configurationController';
import { registerConfigurationOptionsRoutes } from './registerConfigurationOptions';

const router = Router();
const configurationController = new ConfigurationController();
registerConfigurationOptionsRoutes(router, configurationController);

export { router as configurationRoutes };
