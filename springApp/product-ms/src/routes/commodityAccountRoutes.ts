import { Router } from 'express';
import commodityAccountController from '../controllers/commodityAccountController';
import { validate } from '../middleware/validation';
import { applyCommodityAccountSchema, commodityWithdrawSchema } from '../utils/validation';

const router = Router();

router.post('/apply', validate(applyCommodityAccountSchema), commodityAccountController.applyForCommodity);
router.get('/:applicationId', commodityAccountController.getCommodityAccount);
router.post(
  '/:applicationId/withdraw',
  validate(commodityWithdrawSchema),
  commodityAccountController.withdraw
);

export { router as commodityAccountRoutes };
