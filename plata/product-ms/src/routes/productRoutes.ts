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
 * /api/v1/products/types:
 *   get:
 *     summary: Get product types
 *     description: Returns allowed product discriminators (LOAN, MORTGAGE, SAVINGS, COMMODITY, INVESTMENT); legacy Title Case is accepted on write.
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of product types with value and label
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
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
 *                 enum: [LOAN, MORTGAGE, SAVINGS, COMMODITY, INVESTMENT]
 *               appId:
 *                 type: string
 *     responses:
 *       201:
 *         description: Product created
 * /api/v1/products/applications:
 *   post:
 *     summary: Create immutable user product application snapshot
 *     tags: [Products]
 *   get:
 *     summary: List application snapshots (scoped query required)
 *     tags: [Products]
 * /api/v1/products/applications/{applicationId}:
 *   get:
 *     summary: Get application snapshot by ID
 *     tags: [Products]
 * /api/v1/products/types/{type}/subtypes:
 *   get:
 *     summary: Get product subtypes for a given main type
 *     description: Returns subtypes for the discriminator in the path (e.g. LOAN, MORTGAGE).
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: [LOAN, MORTGAGE, SAVINGS, COMMODITY, INVESTMENT, Loan, Mortgage, Savings, Commodity, Investment]
 *     responses:
 *       200:
 *         description: List of product subtypes with value and label
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       value:
 *                         type: string
 *                       label:
 *                         type: string
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
 *                 enum: [LOAN, MORTGAGE, SAVINGS, COMMODITY, INVESTMENT]
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
 *                 enum: [LOAN, MORTGAGE, SAVINGS, COMMODITY, INVESTMENT]
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
 * /api/v1/products/upload-image:
 *   post:
 *     summary: Upload product image (DigitalOcean Spaces)
 *     description: >
 *       Upload a product image file to DigitalOcean Spaces via the backend. Returns a public URL
 *       Store the returned URL in LOAN `about.previewAssetUrl` or document `fileUrl` fields as needed.
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *               appId:
 *                 type: string
 *                 description: Optional app/merchant ID used for folder prefix.
 *     responses:
 *       200:
 *         description: Product image uploaded successfully
 *       400:
 *         description: Invalid file or request
 *       503:
 *         description: Spaces not configured on the server
 */

import { Router } from 'express';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore – type provided by @types/multer at runtime
import multer from 'multer';
import { ProductController } from '../controllers/productController';
import { UserProductApplicationController } from '../controllers/userProductApplicationController';
import { ConfigurationController } from '../controllers/configurationController';
import { ProductService } from '../services/productService';
import { UserProductApplicationService } from '../services/userProductApplicationService';
import { validate, validateQuery } from '../middleware/validation';
import {
  createProductSchema,
  selectProductTypeSchema,
  createProductAfterTypeSchema,
  updateProductSchema,
  createUserProductApplicationSchema,
  listUserProductApplicationsQuerySchema
} from '../utils/validation';
import { getMaxUploadSizeBytes } from '../services/spacesService';
import { registerConfigurationOptionsRoutes } from './registerConfigurationOptions';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxUploadSizeBytes() },
});

const productService = new ProductService();
const productController = new ProductController(productService);
const userProductApplicationService = new UserProductApplicationService();
const userProductApplicationController = new UserProductApplicationController(
  userProductApplicationService
);
const configurationController = new ConfigurationController();

/** Dropdown options for product forms — must be before `/:id` */
registerConfigurationOptionsRoutes(router, configurationController);

router.post('/', productController.createProduct);
router.post('/select-type', productController.selectProductType);
router.post('/create-after-type', productController.createProductAfterType);
router.get('/', productController.getAllProducts);
router.get('/types', productController.getProductTypes);
router.get('/types/:type/subtypes', productController.getProductSubTypes);

router.post(
  '/applications',
  validate(createUserProductApplicationSchema),
  userProductApplicationController.create
);
router.get(
  '/applications',
  validateQuery(listUserProductApplicationsQuerySchema),
  userProductApplicationController.list
);
router.get('/applications/:applicationId', userProductApplicationController.getById);

router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get('/app/:appId', productController.getProductsByAppId);
router.get('/:id/action', productController.checkProductAction);
router.put('/:id/manage', validate(updateProductSchema), productController.manageProduct);

// Product image upload (DigitalOcean Spaces) – single file in field "file"
router.post('/upload-image', upload.single('file'), productController.uploadProductImage);

export { router as productRoutes, productService };