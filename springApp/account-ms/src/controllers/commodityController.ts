import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/environment';
import productService from '../services/productService';
import type { TenantRequest } from '../types/tenant';

function forwardHeaders(req: Request): Record<string, string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const authorization = req.get('authorization');
  if (authorization) headers.Authorization = authorization;

  const tenant = (req as TenantRequest).tenant;
  if (tenant) {
    headers['x-tenant-app-id'] = tenant.appId;
    headers['x-tenant-merchant-id'] = tenant.merchantId;
    headers['x-tenant-subdomain'] = tenant.subdomain;
  }

  return headers;
}

class CommodityController {
  /**
   * Legacy buy path — enrolls in crowdfunding commodity (apply + immediate fund + Plata account).
   * Prefer POST /api/v1/commodity-accounts/apply for new integrations.
   */
  async buyCommodity(req: Request, res: Response): Promise<Response> {
    try {
      const {
        userId,
        productId,
        amount,
        currency,
        email,
        quantity,
        applicantName,
        phone,
        bvn,
        merchantId,
        appId,
        country,
        requirementSubmissions
      } = req.body;

      if (!userId || !productId || !currency) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: userId, productId, currency'
        });
      }

      const product = await productService.getProductInfo(productId);
      if (!product) {
        return res.status(404).json({ success: false, error: 'Product not found' });
      }
      const productType = String(product.type || '').trim().toUpperCase();
      if (productType !== 'COMMODITY') {
        return res.status(400).json({ success: false, error: 'Product is not a commodity' });
      }

      const resolvedQuantity =
        quantity != null
          ? Number(quantity)
          : amount != null && product.price
            ? Math.max(1, Math.round(Number(amount) / Number(product.price)))
            : undefined;

      const response = await axios.post(
        `${config.productServiceUrl}/api/v1/commodity-accounts/apply`,
        {
          userId,
          productId,
          currency,
          email,
          quantity: resolvedQuantity,
          applicantName,
          phone,
          bvn,
          merchantId,
          appId,
          country,
          requirementSubmissions
        },
        {
          headers: forwardHeaders(req),
          timeout: parseInt(process.env.PRODUCT_SERVICE_HTTP_TIMEOUT_MS || '60000', 10),
          validateStatus: () => true
        }
      );

      return res.status(response.status).json(response.data);
    } catch (error: unknown) {
      console.error('Error in buyCommodity:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return res.status(500).json({ success: false, error: message });
    }
  }

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

      if (String(product.type || '').trim().toUpperCase() !== 'COMMODITY') {
        return res.status(400).json({ success: false, error: 'Product is not a commodity' });
      }

      return res.status(200).json({
        success: true,
        data: product
      });
    } catch (error: unknown) {
      console.error('Error in getCommodityDetails:', error);
      const message = error instanceof Error ? error.message : 'Internal server error';
      return res.status(500).json({ success: false, error: message });
    }
  }
}

export default new CommodityController();
