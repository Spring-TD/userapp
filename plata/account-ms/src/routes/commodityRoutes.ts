import express from 'express';
import commodityController from '../controllers/commodityController';

const router = express.Router();

// Buy commodity
router.post('/buy', commodityController.buyCommodity);

// Get commodity details
router.get('/:productId', commodityController.getCommodityDetails);

export default router;
