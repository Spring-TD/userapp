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
 * /api/v1/products/sub-merchant-activations:
 *   post:
 *     summary: Upsert sub-merchant product activation status
 *     description: >
 *       Gateway-only endpoint for external platforms to report that a sub-merchant activated
 *       or deactivated a product from Plata's catalog. Requires PLATA_PUBLIC_KEY and
 *       PLATA_SECRET_KEY at the gateway.
 *     tags: [Products]
 * /api/v1/products/sub-merchant-usage-events:
 *   post:
 *     summary: Upsert external user usage-start event
 *     description: >
 *       Gateway-only endpoint for external platforms to report that an external user started
 *       using a product that a sub-merchant turned on. Product-ms stores source-of-truth data
 *       and mirrors identity projection to client-auth-ms via internal endpoint.
 *     tags: [Products]
 * /api/v1/products/sub-merchants/merchant-dashboard:
 *   get:
 *     summary: Sub-merchant merchant dashboard list (aggregated row per sub-merchant)
 *     description: >
 *       Returns dashboard rows for the authenticated merchant creator, scoped by appId.
 *       Aggregates activation status and usage-event metrics for each sub-merchant.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, deactivated] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: skip
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated dashboard rows
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Merchant access required
 * /api/v1/products/sub-merchants/customers-dashboard:
 *   get:
 *     summary: Sub-merchant customers dashboard list (aggregated row per external user)
 *     description: >
 *       Returns dashboard rows for external users under sub-merchants for the authenticated
 *       merchant creator, scoped by appId.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: appId
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: subMerchantId
 *         schema: { type: string }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100, default: 20 }
 *       - in: query
 *         name: skip
 *         schema: { type: integer, minimum: 0, default: 0 }
 *     responses:
 *       200:
 *         description: Paginated customer dashboard rows
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Merchant access required
 * /api/v1/products/applications:
 *   post:
 *     summary: Create immutable user product application snapshot
 *     tags: [Products]
 *   get:
 *     summary: List application snapshots (scoped query required)
 *     tags: [Products]
 * /api/v1/products/applications/me/loan-workflow:
 *   get:
 *     summary: List LOAN/MORTGAGE applications for loan workflow (originating merchant only)
 *     tags: [Products - Loan workflow]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: loanWorkflowStatus
 *         schema:
 *           type: string
 *           enum: [requested, under_review, approved, declined, blacklisted]
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: skip
 *         schema: { type: integer }
 * /api/v1/products/applications/{applicationId}/loan-workflow:
 *   patch:
 *     summary: Set loan workflow status (originating product merchant only)
 *     tags: [Products - Loan workflow]
 *     security:
 *       - bearerAuth: []
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
 * /api/v1/products/app/{appId}/product-overview/by-type/{productType}:
 *   get:
 *     summary: Product overview drill-down (per configured product)
 *     description: >
 *       Table rows for one category (e.g. LOAN): each configured product with customerCount, capitalAmount,
 *       issuedAmount, repaymentAmount (same semantics as the category card on product-overview). COMMODITY
 *       also returns inventoryAmount and salesAmount; repaymentAmount is COGS. Requires Bearer JWT (merchant).
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productType
 *         required: true
 *         schema:
 *           type: string
 *           enum: [LOAN, MORTGAGE, SAVINGS, INVESTMENT, COMMODITY]
 *     responses:
 *       200:
 *         description: Payload with products[] and totals (distinctCustomerCount, summed money fields)
 *       400:
 *         description: Invalid product type
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Merchant access required
 * /api/v1/products/app/{appId}/product-overview:
 *   get:
 *     summary: Product overview (dashboard aggregates)
 *     description: >
 *       Single round-trip summary for an app. Requires Bearer JWT (merchant). Category money fields map to
 *       different UI labels by `type` (lending vs savings/investment vs commodity). Amounts are read from
 *       `contractSnapshot` where present; headline `totalSavings` / `totalInterest` sum SAVINGS+INVESTMENT
 *       deposit and interest-paid fields. Headline `totalTransactions` uses create-app-ms transaction stats.
 *       For COMMODITY, `repaymentAmount` is used as COGS.
 *     tags: [Products]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Overview payload with schemaVersion, headline, byCategory
 *       401:
 *         description: Authentication required
 *       403:
 *         description: Merchant access required
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
 * /api/v1/products/upload-document-template:
 *   post:
 *     summary: Upload requirement document template (DigitalOcean Spaces)
 *     description: >
 *       Upload a document template (PDF/DOC/DOCX) and store returned URL in
 *       `requirements.otherRequirements[].templateFileUrl` for rows with `contentType=document_template`.
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
 *         description: Template uploaded successfully
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
import { authenticateJwt, requireMerchantCreator } from '../middleware/auth';
import { requireVerifiedGatewayMerchant } from '../middleware/gatewayMerchantAuth';
import { SubMerchantProductActivationController } from '../controllers/subMerchantProductActivationController';
import { SubMerchantProductActivationService } from '../services/subMerchantProductActivationService';
import { SubMerchantProductUsageEventController } from '../controllers/subMerchantProductUsageEventController';
import { SubMerchantProductUsageEventService } from '../services/subMerchantProductUsageEventService';
import { ExternalProductApplicationController } from '../controllers/externalProductApplicationController';
import { ExternalProductApplicationService } from '../services/externalProductApplicationService';
import { ExternalApplicationServicingController } from '../controllers/externalApplicationServicingController';
import { ExternalApplicationServicingService } from '../services/externalApplicationServicingService';
import {
  createProductSchema,
  selectProductTypeSchema,
  createProductAfterTypeSchema,
  updateProductSchema,
  createUserProductApplicationSchema,
  listUserProductApplicationsQuerySchema,
  listLoanWorkflowQuerySchema,
  patchLoanWorkflowBodySchema,
  subMerchantProductActivationBodySchema,
  subMerchantProductUsageEventBodySchema,
  listSubMerchantMerchantDashboardQuerySchema,
  listSubMerchantCustomersDashboardQuerySchema,
  externalProductAccountBodySchema,
  externalProductApplicationBodySchema,
  externalLoanOfferResponseBodySchema
} from '../utils/validation';
import { getMaxTemplateUploadSizeBytes, getMaxUploadSizeBytes } from '../services/spacesService';
import { registerConfigurationOptionsRoutes } from './registerConfigurationOptions';

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxUploadSizeBytes() },
});

const templateUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: getMaxTemplateUploadSizeBytes() },
});

const productService = new ProductService();
const productController = new ProductController(productService);
const userProductApplicationService = new UserProductApplicationService();
const userProductApplicationController = new UserProductApplicationController(
  userProductApplicationService
);
const configurationController = new ConfigurationController();
const subMerchantProductActivationService = new SubMerchantProductActivationService();
const subMerchantProductActivationController = new SubMerchantProductActivationController(
  subMerchantProductActivationService
);
const subMerchantProductUsageEventService = new SubMerchantProductUsageEventService();
const subMerchantProductUsageEventController = new SubMerchantProductUsageEventController(
  subMerchantProductUsageEventService
);
const externalProductApplicationService = new ExternalProductApplicationService(
  userProductApplicationService,
  subMerchantProductUsageEventService
);
const externalProductApplicationController = new ExternalProductApplicationController(
  externalProductApplicationService
);
const externalApplicationServicingService = new ExternalApplicationServicingService(
  userProductApplicationService
);
const externalApplicationServicingController = new ExternalApplicationServicingController(
  externalApplicationServicingService
);

/** Dropdown options for product forms — must be before `/:id` */
registerConfigurationOptionsRoutes(router, configurationController);

router.post('/', productController.createProduct);
router.post('/select-type', productController.selectProductType);
router.post('/create-after-type', productController.createProductAfterType);
router.get('/catalog', productController.getAllProducts);
router.get('/', productController.getAllProducts);
router.get('/types', productController.getProductTypes);
router.get('/types/:type/subtypes', productController.getProductSubTypes);

/** Integrator reports sub-merchant (their merchant) toggling a catalog product — requires gateway + PLATA keys */
router.post(
  '/sub-merchant-activations',
  requireVerifiedGatewayMerchant,
  validate(subMerchantProductActivationBodySchema),
  subMerchantProductActivationController.upsert
);
router.post(
  '/sub-merchant-usage-events',
  requireVerifiedGatewayMerchant,
  validate(subMerchantProductUsageEventBodySchema),
  subMerchantProductUsageEventController.upsert
);
router.get(
  '/sub-merchants/merchant-dashboard',
  authenticateJwt,
  requireMerchantCreator,
  validateQuery(listSubMerchantMerchantDashboardQuerySchema),
  subMerchantProductActivationController.getMerchantDashboard
);
router.get(
  '/sub-merchants/customers-dashboard',
  authenticateJwt,
  requireMerchantCreator,
  validateQuery(listSubMerchantCustomersDashboardQuerySchema),
  subMerchantProductUsageEventController.getCustomerDashboard
);

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
router.get(
  '/applications/me/loan-workflow',
  authenticateJwt,
  requireMerchantCreator,
  validateQuery(listLoanWorkflowQuerySchema),
  userProductApplicationController.listLoanWorkflow
);
router.patch(
  '/applications/:applicationId/loan-workflow',
  authenticateJwt,
  requireMerchantCreator,
  validate(patchLoanWorkflowBodySchema),
  userProductApplicationController.patchLoanWorkflow
);
router.get('/applications/:applicationId', userProductApplicationController.getById);

/** Merchant API-key external apply / servicing — must be before `/:id` */
router.post(
  '/external-accounts',
  requireVerifiedGatewayMerchant,
  validate(externalProductAccountBodySchema),
  externalProductApplicationController.createAccount
);
router.post(
  '/external-applications',
  requireVerifiedGatewayMerchant,
  validate(externalProductApplicationBodySchema),
  externalProductApplicationController.submit
);
router.get(
  '/external-applications/:applicationId',
  requireVerifiedGatewayMerchant,
  externalApplicationServicingController.getStatus
);
router.get(
  '/external-applications/:applicationId/offer',
  requireVerifiedGatewayMerchant,
  externalApplicationServicingController.getOffer
);
router.post(
  '/external-applications/:applicationId/offer',
  requireVerifiedGatewayMerchant,
  validate(externalLoanOfferResponseBodySchema),
  externalApplicationServicingController.respondToOffer
);
router.get(
  '/external-applications/:applicationId/account',
  requireVerifiedGatewayMerchant,
  externalApplicationServicingController.getAccount
);
router.get(
  '/external-applications/:applicationId/repayment-schedule',
  requireVerifiedGatewayMerchant,
  externalApplicationServicingController.getRepaymentSchedule
);

router.get('/:id', productController.getProductById);
router.put('/:id', productController.updateProduct);
router.delete('/:id', productController.deleteProduct);
router.get(
  '/app/:appId/product-overview/by-type/:productType',
  authenticateJwt,
  requireMerchantCreator,
  productController.getProductOverviewByType
);
router.get(
  '/app/:appId/product-overview',
  authenticateJwt,
  requireMerchantCreator,
  productController.getProductOverview
);
router.get('/app/:appId', productController.getProductsByAppId);
router.get('/:id/action', productController.checkProductAction);
router.put('/:id/manage', validate(updateProductSchema), productController.manageProduct);

// Product image upload (DigitalOcean Spaces) – single file in field "file"
router.post('/upload-image', upload.single('file'), productController.uploadProductImage);
// Loan/Mortgage document template upload (DigitalOcean Spaces) – single file in field "file"
router.post(
  '/upload-document-template',
  templateUpload.single('file'),
  productController.uploadDocumentTemplate
);

export { router as productRoutes, productService };