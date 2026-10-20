import type { Request } from 'express';
import type { ClientRequest } from 'http';
import type { Options } from 'http-proxy-middleware';
import { Express } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { config } from '../config/environment';

function forwardGatewayMerchantHeaders(proxyReq: ClientRequest, req: Request): void {
  if (req.gatewayMerchantAuth) {
    proxyReq.setHeader('X-Merchant-Id', req.gatewayMerchantAuth.merchantId);
    proxyReq.setHeader('X-Api-Key-Id', req.gatewayMerchantAuth.apiKeyId);
    proxyReq.setHeader('X-Gateway-Verified', '1');
    if (req.gatewayMerchantAuth.merchantName) {
      proxyReq.setHeader('X-Merchant-Name', req.gatewayMerchantAuth.merchantName);
    }
    if (req.gatewayMerchantAuth.environment) {
      proxyReq.setHeader('X-Gateway-Environment', req.gatewayMerchantAuth.environment);
    }
  }
}

function proxied(pathFilter: NonNullable<Options['pathFilter']>, target: string) {
  return createProxyMiddleware({
    pathFilter,
    target,
    changeOrigin: true,
    on: {
      proxyReq: (proxyReq, req) => {
        forwardGatewayMerchantHeaders(proxyReq, req as Request);
      },
    },
  });
}

export const setupProxies = (app: Express) => {
  app.use(proxied(['/api/v1/products', '/api/v1/configurations'], config.productServiceUrl));

  app.use(proxied(['/api/v1/compliance', '/api/v1/kyc'], config.complianceServiceUrl));

  app.use(proxied('/api/v1/wallets', config.walletServiceUrl));

  /** Plata merchant dashboard Treasury / Withdrawals / Settlements console (wallet-ms). */
  app.use(proxied('/api/v1/frontend-plata', config.walletServiceUrl));

  app.use(proxied('/api/v1/billing', config.billingServiceUrl));

  app.use(proxied('/api/v1/apps', config.createAppServiceUrl));

  app.use(proxied('/api/v1/payments', config.paymentServiceUrl));

  /** Merchant API key CRUD (Bearer JWT) — service-auth-ms */
  app.use(proxied('/api/v1/keys', config.serviceAuthUrl));

  app.use(
    proxied(
      [
        '/api/v1/auth',
        '/api/v1/registration',
        '/api/v1/otp',
        '/api/v1/password',
        '/api/v1/user',
        '/api/v1/roles',
        '/verify-email',
      ],
      config.clientAuthServiceUrl
    )
  );
};
