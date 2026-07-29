import { Router } from 'express';
import investmentAccountController from '../controllers/investmentAccountController';
import { validate } from '../middleware/validation';
import {
  createInvestmentAccountSchema,
  investmentDepositSchema
} from '../utils/validation';

const router = Router();

router.post('/', validate(createInvestmentAccountSchema), investmentAccountController.createInvestmentAccount);
router.get('/:applicationId/deposit-details', investmentAccountController.getDepositDetails);
router.post(
  '/:applicationId/deposits',
  validate(investmentDepositSchema),
  investmentAccountController.deposit
);

export { router as investmentAccountRoutes };
