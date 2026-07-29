import { Router } from 'express';
import savingsAccountController from '../controllers/savingsAccountController';
import { validate } from '../middleware/validation';
import { requireWalletInternalToken } from '../middleware/walletInternalAuth';
import {
  createSavingsAccountSchema,
  savingsDepositSchema,
  savingsDepositWebhookSchema
} from '../utils/validation';

const router = Router();

router.post('/', validate(createSavingsAccountSchema), savingsAccountController.createSavingsAccount);
router.get('/:applicationId/deposit-details', savingsAccountController.getDepositDetails);
router.post(
  '/:applicationId/deposits',
  validate(savingsDepositSchema),
  savingsAccountController.deposit
);
router.post(
  '/internal/deposit-webhook',
  requireWalletInternalToken,
  validate(savingsDepositWebhookSchema),
  savingsAccountController.handleExternalDepositWebhook
);

export { router as savingsAccountRoutes };
