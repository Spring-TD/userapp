import express from 'express';
import accountController from '../controllers/accountController';

const router = express.Router();

// Create a new account
router.post('/accounts', accountController.createAccount);

// Get account by ID
router.get('/accounts/:id', accountController.getAccountById);

// Get accounts by user ID
router.get('/users/:userId/accounts', accountController.getAccountsByUserId);

// Update account balance
router.patch('/accounts/:id/balance', accountController.updateAccountBalance);

// Delete account
router.delete('/accounts/:id', accountController.deleteAccount);

// Check billing status
router.post('/users/:userId/billing-check', accountController.checkBillingStatus);

export default router;