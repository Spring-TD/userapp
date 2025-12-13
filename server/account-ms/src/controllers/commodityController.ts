import { Request, Response } from 'express';
import applicationService, { ApplyForProductInput } from '../services/applicationService';
import productService from '../services/productService';

class CommodityController {
    // Buy commodity (Apply for product)
    async buyCommodity(req: Request, res: Response): Promise<Response> {
        try {
            const { userId, productId, amount, currency, email } = req.body;

            if (!userId || !productId || !amount || !currency) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: userId, productId, amount, currency'
                });
            }

            // Verify product is a commodity
            const product = await productService.getProductInfo(productId);
            if (!product) {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }
            if (product.type !== 'Commodity') {
                return res.status(400).json({ success: false, error: 'Product is not a commodity' });
            }

            const result = await applicationService.applyForProduct({
                userId,
                productId,
                amount,
                currency,
                email
            });

            return res.status(201).json(result);
        } catch (error: any) {
            console.error('Error in buyCommodity:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }

    // Get commodity details
    async getCommodityDetails(req: Request, res: Response): Promise<Response> {
        try {
            const { productId } = req.params;
            if (!productId) {
                return res.status(400).json({ success: false, error: 'Product ID is required' });
            }

            const product = await productService.getProductInfo(productId);

            if (!product) {
                return res.status(404).json({ success: false, error: 'Product not found' });
            }

            if (product.type !== 'Commodity') {
                return res.status(400).json({ success: false, error: 'Product is not a commodity' });
            }

            return res.status(200).json({
                success: true,
                data: product
            });
        } catch (error: any) {
            console.error('Error in getCommodityDetails:', error);
            return res.status(500).json({
                success: false,
                error: error.message || 'Internal server error'
            });
        }
    }
}

export default new CommodityController();
