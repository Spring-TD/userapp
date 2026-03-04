/**
 * Product routes (mounted at /api/v1/products)
 * Loan, Savings, Mortgage, Commodity, Investment product CRUD and management.
 *
 * @openapi
 * /api/v1/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - type
 *               - appId
 *             properties:
 *               name:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 200
 *               description:
 *                 type: string
 *                 minLength: 1
 *                 maxLength: 1000
 *               type:
 *                 type: string
 *                 enum: [Loan, Mortgage, Savings, Commodity, Investment]
 *               appId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created
 * /api/v1/products/select-type:
 *   post:
 *     summary: Select product type (returns product stub)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - appId
 *               - type
 *             properties:
 *               appId:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [Loan, Mortgage, Savings, Commodity, Investment]
 *     responses:
 *       201:
 *         description: Product type selected
 * /api/v1/products/create-after-type:
 *   post:
 *     summary: Create product after type selection (complete product)
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productId
 *               - name
 *               - description
 *             properties:
 *               productId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product created
 * /api/v1/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 *       404:
 *         description: Product not found
 *   put:
 *     summary: Update product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *                 enum: [Loan, Mortgage, Savings, Commodity, Investment]
 *               status:
 *                 type: string
 *                 enum: [complete, incomplete]
 *               equityContribution:
 *                 type: number
 *               propertyValue:
 *                 type: number
 *               price:
 *                 type: number
 *               minimumQuantity:
 *                 type: number
 *               unitOfMeasure:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product updated
 *   delete:
 *     summary: Delete product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product deleted
 * /api/v1/products/app/{appId}:
 *   get:
 *     summary: Get products by app ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of products for app
 * /api/v1/products/{id}/action:
 *   get:
 *     summary: Check product action/status
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Action status
 * /api/v1/products/{id}/manage:
 *   put:
 *     summary: Manage product (update with validation)
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               status:
 *                 type: string
 *               equityContribution:
 *                 type: number
 *               propertyValue:
 *                 type: number
 *               price:
 *                 type: number
 *               minimumQuantity:
 *                 type: number
 *               unitOfMeasure:
 *                 type: string
 *     responses:
 *       200:
 *         description: Product managed
 */

import { Router } from 'express';
import { ProductController } from '../controllers/productController';
import { ProductService } from '../services/productService';
import { validate } from '../middleware/validation';
import { createProductSchema, selectProductTypeSchema, createProductAfterTypeSchema, updateProductSchema } from '../utils/validation';

const router = Router();
const productService = new ProductService();
const productController = new ProductController(productService);

router.post('/', productController.createProduct);
router.post('/select-type', productController.selectProductType);
router.post('/create-after-type', productController.createProductAfterType);
router.get('/', productController.getAllProducts);
router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get('/app/:appId', productController.getProductsByAppId);
router.get('/:id/action', productController.checkProductAction);
router.put('/:id/manage', validate(updateProductSchema), productController.manageProduct);

export { router as productRoutes, productService };