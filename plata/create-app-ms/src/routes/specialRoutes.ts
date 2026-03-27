/**
 * Special routes (mounted at /api/v1/special)
 * Service-to-service endpoints; all require x-api-key header.
 *
 * @openapi
 * /api/v1/special/apps:
 *   get:
 *     summary: Get all apps
 *     tags: [Special]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of apps
 * /api/v1/special/apps/{id}:
 *   get:
 *     summary: Get app by ID
 *     tags: [Special]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: App details
 * /api/v1/special/products:
 *   get:
 *     summary: Get all products
 *     tags: [Special]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of products
 * /api/v1/special/products/{id}:
 *   get:
 *     summary: Get product by ID
 *     tags: [Special]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product details
 * /api/v1/special/wallets/merchant/{merchantId}/balance/{walletType}:
 *   get:
 *     summary: Get merchant wallet balance
 *     tags: [Special - Wallets]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: walletType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wallet balance
 * /api/v1/special/wallets/merchant/{merchantId}/history/{walletType}:
 *   get:
 *     summary: Get merchant wallet history
 *     tags: [Special - Wallets]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: walletType
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Wallet history
 * /api/v1/special/users:
 *   get:
 *     summary: Get all users
 *     tags: [Special - Users]
 *     security:
 *       - apiKeyAuth: []
 *     responses:
 *       200:
 *         description: List of users
 *   post:
 *     summary: Create user and wallet
 *     tags: [Special - Users]
 *     security:
 *       - apiKeyAuth: []
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               name:
 *                 type: string
 *               merchantId:
 *                 type: string
 *     responses:
 *       201:
 *         description: User and wallet created
 * /api/v1/special/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Special - Users]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User details
 * /api/v1/special/wallets/user/{userId}:
 *   get:
 *     summary: Get user wallet
 *     tags: [Special - Wallets]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User wallet
 * /api/v1/special/wallets/users/{merchantId}:
 *   get:
 *     summary: Get all users wallets for merchant
 *     tags: [Special - Wallets]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: merchantId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of user wallets
 * /api/v1/special/wallets/user/{userId}/withdraw:
 *   post:
 *     summary: Withdraw from user wallet
 *     tags: [Special - Wallets]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               amount:
 *                 type: number
 *               currency:
 *                 type: string
 *     responses:
 *       200:
 *         description: Withdrawal result
 * /api/v1/special/products/{productId}/subscribers:
 *   get:
 *     summary: Get product subscribers
 *     tags: [Special]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of subscribers
 * /api/v1/special/users/{userId}/documents:
 *   post:
 *     summary: Submit docs for user
 *     tags: [Special - Users]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       201:
 *         description: Documents submitted
 * /api/v1/special/drive/users/{userId}:
 *   get:
 *     summary: Get drive by user
 *     tags: [Special - Drive]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User drive data
 * /api/v1/special/drive/products/{productId}:
 *   get:
 *     summary: Get drive by product
 *     tags: [Special - Drive]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product drive data
 * /api/v1/special/transactions/user/{userId}:
 *   get:
 *     summary: Get transaction history for user
 *     tags: [Special - Transactions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User transaction history
 * /api/v1/special/transactions/product/{productId}:
 *   get:
 *     summary: Get all transaction history by product
 *     tags: [Special - Transactions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Product transaction history
 * /api/v1/special/transactions/app/{appId}:
 *   get:
 *     summary: Get transaction history by app
 *     tags: [Special - Transactions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: appId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: App transaction history
 * /api/v1/special/subscriptions/users/{userId}/products/{productId}:
 *   post:
 *     summary: Subscribe user to product
 *     tags: [Special - Subscriptions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       201:
 *         description: User subscribed
 *   get:
 *     summary: Get user product subscription
 *     tags: [Special - Subscriptions]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Subscription details
 * /api/v1/special/applications/users/{userId}/products/{productId}:
 *   post:
 *     summary: Apply to product
 *     tags: [Special - Applications]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
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
 *     responses:
 *       201:
 *         description: Application submitted
 * /api/v1/special/applications/products/{productId}:
 *   get:
 *     summary: Get all product applications
 *     tags: [Special - Applications]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: productId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of applications with status and details
 * /api/v1/special/callbacks/users/{userId}:
 *   post:
 *     summary: Register callback for user (application status, wallet events)
 *     tags: [Special - Callbacks]
 *     security:
 *       - apiKeyAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               url:
 *                 type: string
 *               events:
 *                 type: array
 *                 items:
 *                   type: string
 *     responses:
 *       200:
 *         description: Callback registered
 */

import { Router } from 'express';
import { SpecialController } from '../controllers/specialController';
import { apiKeyAuth } from '../middleware/apiKeyAuth';

const router = Router();

// 1. Get all App
router.get('/apps', apiKeyAuth, SpecialController.getAllApps);

// 2. Get app by id
router.get('/apps/:id', apiKeyAuth, SpecialController.getAppById);

// 3. Get all Product
router.get('/products', apiKeyAuth, SpecialController.getAllProducts);

// 4. Get product by ID
router.get('/products/:id', apiKeyAuth, SpecialController.getProductById);

// 5. Get merchant Wallet balance
router.get('/wallets/merchant/:merchantId/balance/:walletType', apiKeyAuth, SpecialController.getMerchantWalletBalance);

// 6. Get merchant Wallet history
router.get('/wallets/merchant/:merchantId/history/:walletType', apiKeyAuth, SpecialController.getMerchantWalletHistory);

// 7. Create user → create a wallet
router.post('/users', apiKeyAuth, SpecialController.createUserAndWallet);

// 8. Get all user
router.get('/users', apiKeyAuth, SpecialController.getAllUsers);

// 9. Get user details by ID
router.get('/users/:id', apiKeyAuth, SpecialController.getUserById);

// 10. Get user's wallet
router.get('/wallets/user/:userId', apiKeyAuth, SpecialController.getUserWallet);

// 11. Get all users wallet
router.get('/wallets/users/:merchantId', apiKeyAuth, SpecialController.getAllUsersWallet);

// 12. Get product's users subscribers →by product Id
router.get('/products/:productId/subscribers', apiKeyAuth, SpecialController.getProductSubscribers);

// 13. Withdraw from user's wallet
router.post('/wallets/user/:userId/withdraw', apiKeyAuth, SpecialController.withdrawFromUserWallet);

// 14. Submit docs for a user
router.post('/users/:userId/documents', apiKeyAuth, SpecialController.submitDocsForUser);

// 15. Get Drive by user
router.get('/drive/users/:userId', apiKeyAuth, SpecialController.getDriveByUser);

// 16. Get Drive by products
router.get('/drive/products/:productId', apiKeyAuth, SpecialController.getDriveByProducts);

// 17. Get transaction history for a user
router.get('/transactions/user/:userId', apiKeyAuth, SpecialController.getTransactionHistoryForUser);

// 18. get all transaction history by product
router.get('/transactions/product/:productId', apiKeyAuth, SpecialController.getAllTransactionHistoryByProduct);

// 19. get transaction history by app
router.get('/transactions/app/:appId', apiKeyAuth, SpecialController.getTransactionHistoryByApp);

// 20. Subscribe a user to a product
router.post('/subscriptions/users/:userId/products/:productId', apiKeyAuth, SpecialController.subscribeUserToProduct);

// 21. Get user's product subscription
router.get('/subscriptions/users/:userId/products/:productId', apiKeyAuth, SpecialController.getUserProductSubscription);

// 22. Apply to product
router.post('/applications/users/:userId/products/:productId', apiKeyAuth, SpecialController.applyToProduct);

// 23. Get all product application → status, details
router.get('/applications/products/:productId', apiKeyAuth, SpecialController.getAllProductApplications);

// 24. Register callback → user application status, user's wallet events
router.post('/callbacks/users/:userId', apiKeyAuth, SpecialController.registerCallback);

export { router as specialRoutes };