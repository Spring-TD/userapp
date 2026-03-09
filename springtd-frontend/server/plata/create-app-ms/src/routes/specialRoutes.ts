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