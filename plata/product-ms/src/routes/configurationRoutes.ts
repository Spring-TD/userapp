/**
 * Configuration routes (mounted at /api/v1/configurations)
 * Product-specific configuration (Loan, Mortgage, Savings, Commodity, Investment).
 *
 * @openapi
 * /api/v1/configurations:
 *   post:
 *     summary: Create product configuration
 *     tags: [Configurations]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - productType
 *               - configuration
 *             properties:
 *               productId:
 *                 type: string
 *               productType:
 *                 type: string
 *                 description: Loan, Mortgage, Savings, Commodity, or Investment
 *               configuration:
 *                 type: object
 *                 description: Type-specific config (purpose, amounts, rates, etc.)
 *     responses:
 *       201:
 *         description: Configuration created
 *       400:
 *         description: Product ID and Product Type required
 * /api/v1/configurations/{productId}:
 *   get:
 *     summary: Get product configuration
 *     tags: [Configurations]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration for product
 *       404:
 *         description: Product configuration not found
 *   put:
 *     summary: Update product configuration
 *     tags: [Configurations]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               configuration:
 *                 type: object
 *                 description: Partial type-specific config to merge
 *     responses:
 *       200:
 *         description: Configuration updated
 *   delete:
 *     summary: Delete product configuration
 *     tags: [Configurations]
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Configuration deleted
 */

import { Router } from 'express';
import { ConfigurationController } from '../controllers/configurationController';
import { productService } from './productRoutes';

const router = Router();
const configurationController = new ConfigurationController(productService);

router.post('/', configurationController.createProductConfiguration);
router.get('/:productId', configurationController.getProductConfiguration);
router.put('/:productId', configurationController.updateProductConfiguration);
router.delete('/:productId', configurationController.deleteProductConfiguration);

export { router as configurationRoutes };