import { Express, RequestHandler } from 'express';
import http from 'http';
import type { ClientRequest } from 'http';
import type { Request } from 'express';
import { createProxyMiddleware, Options, RequestHandler as ProxyRequestHandler } from 'http-proxy-middleware';
import { config } from '../config/environment';
import { TenantRequest } from '../types/tenant';

type ProxySetupOptions = {
  userListAppScopeMiddleware?: RequestHandler;
};

export type ProxySetupResult = {
  notificationsProxy: ProxyRequestHandler;
};

function forwardGatewayMerchantHeaders(proxyReq: ClientRequest, req: Request): void {
  if (req.gatewayMerchantAuth) {
    proxyReq.setHeader('X-Merchant-Id', req.gatewayMerchantAuth.merchantId);
    proxyReq.setHeader('X-Merchant-Name', req.gatewayMerchantAuth.merchantName);
    proxyReq.setHeader('X-Api-Key-Id', req.gatewayMerchantAuth.apiKeyId);
    proxyReq.setHeader('X-Gateway-Environment', req.gatewayMerchantAuth.environment);
    proxyReq.setHeader('X-Gateway-Verified', '1');
  }
}

export const setupProxies = (app: Express, options: ProxySetupOptions = {}): ProxySetupResult => {
    // Helper to create proxy options
    const createOptions = (target: string, pathPrefix?: string, forwardGateway = false): Options => ({
        target,
        changeOrigin: true,
        // When mounting `app.use('/api/v1/auth', proxy)`, Express strips the mount path
        // from `req.url` before handing it to the proxy. `client-auth-ms` expects the
        // `/api/v1/auth` prefix, so we re-add it via `pathRewrite`.
        pathRewrite: pathPrefix
            ? { '^/': `${pathPrefix}/` }
            : {},
        on: {
            proxyReq: (proxyReq, req) => {
                const tenant = (req as TenantRequest).tenant;
                if (tenant) {
                    proxyReq.setHeader('x-tenant-app-id', tenant.appId);
                    proxyReq.setHeader('x-tenant-merchant-id', tenant.merchantId);
                    proxyReq.setHeader('x-tenant-subdomain', tenant.subdomain);
                    if (tenant.appName) {
                        proxyReq.setHeader('x-tenant-app-name', tenant.appName);
                    }
                }

                if (forwardGateway) {
                    forwardGatewayMerchantHeaders(proxyReq, req as Request);
                }

                const headerAppId = [
                    req.headers['x-app-id'],
                    req.headers['x-selected-app-id'],
                    req.headers['x-dashboard-app-id']
                ]
                    .map((value) => (Array.isArray(value) ? value[0] : value))
                    .find((value) => typeof value === 'string' && value.trim());

                if (headerAppId && !proxyReq.path.includes('appId=')) {
                    const separator = proxyReq.path.includes('?') ? '&' : '?';
                    proxyReq.path = `${proxyReq.path}${separator}appId=${encodeURIComponent(headerAppId.trim())}`;
                }
            }
        },
        // We don't need on: proxyReq here if we mount this BEFORE body-parser
    });

    // Product Service Proxy
    app.use(
        '/api/v1/products',
        createProxyMiddleware(createOptions(config.productServiceUrl, '/api/v1/products'))
    );

    app.use(
        '/api/v1/configurations',
        createProxyMiddleware(createOptions(config.productServiceUrl, '/api/v1/configurations'))
    );

    // Backward-compatible alias:
    // POST /api/v1/applications/:id/guarantor-kyc -> product-ms /api/v1/applications/:id/guarantors
    // Must be mounted before the generic /api/v1/applications proxy.
    app.use(
        '/api/v1/applications/:applicationId/guarantor-kyc',
        createProxyMiddleware({
            target: config.productServiceUrl,
            changeOrigin: true,
            pathRewrite: (path) => path.replace(/\/guarantor-kyc$/, '/guarantors'),
            on: {
                proxyReq: (proxyReq, req) => {
                    const tenant = (req as TenantRequest).tenant;
                    if (tenant) {
                        proxyReq.setHeader('x-tenant-app-id', tenant.appId);
                        proxyReq.setHeader('x-tenant-merchant-id', tenant.merchantId);
                        proxyReq.setHeader('x-tenant-subdomain', tenant.subdomain);
                        if (tenant.appName) {
                            proxyReq.setHeader('x-tenant-app-name', tenant.appName);
                        }
                    }
                }
            }
        })
    );

    app.use(
        '/api/v1/applications',
        createProxyMiddleware(createOptions(config.productServiceUrl, '/api/v1/applications', true))
    );

    app.use(
        '/api/v1/savings-accounts',
        createProxyMiddleware(createOptions(config.productServiceUrl, '/api/v1/savings-accounts'))
    );

    app.use(
        '/api/v1/investment-accounts',
        createProxyMiddleware(createOptions(config.productServiceUrl, '/api/v1/investment-accounts'))
    );

    app.use(
        '/api/v1/commodity-accounts',
        createProxyMiddleware(createOptions(config.productServiceUrl, '/api/v1/commodity-accounts'))
    );

    // Compliance Service Proxy
    app.use(
        '/api/v1/compliance',
        createProxyMiddleware(createOptions(config.complianceServiceUrl, '/api/v1/compliance'))
    );
    app.use(
        '/api/v1/kyc',
        createProxyMiddleware(createOptions(config.complianceServiceUrl, '/api/v1/kyc'))
    );

    // Wallet Service Proxy
    app.use(
        '/api/v1/wallets',
        createProxyMiddleware(createOptions(config.walletServiceUrl, '/api/v1/wallets'))
    );

    // Billing Service Proxy
    app.use(
        '/api/v1/billing',
        createProxyMiddleware(createOptions(config.billingServiceUrl))
    );

    // Create App Service Proxy
    app.use(
        '/api/v1/apps',
        // Preserve `/api/v1/apps` prefix for the upstream.
        // Without pathRewrite, Express strips the mount path so create-app-ms receives `/`
        // and returns its root status payload instead of the apps handler.
        createProxyMiddleware(
            createOptions(config.createAppServiceUrl, '/api/v1/apps')
        )
    );

    // Payment Service Proxy
    app.use(
        '/api/v1/payments',
        createProxyMiddleware(createOptions(config.paymentServiceUrl))
    );

    // Notification Service Proxy (HTTP + WebSocket for inbox realtime)
    const notificationsProxy = createProxyMiddleware({
      ...createOptions(config.notificationServiceUrl, '/api/v1/notifications'),
      ws: true
    });
    app.use('/api/v1/notifications', notificationsProxy);

    // Client Auth Service Proxy
    const clientAuthTarget = config.clientAuthServiceUrl;

    app.use(
        '/api/v1/auth',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/auth'))
    );
    app.use(
        '/api/v1/registration',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/registration'))
    );
    app.use(
        '/api/v1/otp',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/otp'))
    );
    app.use(
        '/api/v1/password',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/password'))
    );
    const userProxy = createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/user'));
    if (options.userListAppScopeMiddleware) {
        app.use('/api/v1/user', options.userListAppScopeMiddleware, userProxy);
    } else {
        app.use('/api/v1/user', userProxy);
    }
    app.use(
        '/api/v1/roles',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/roles'))
    );
    app.use(
        '/api/v1/invitations',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/invitations'))
    );
    app.use(
        '/api/v1/team',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/team'))
    );
    app.use(
        '/api/v1/faqs',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/faqs'))
    );
    app.use(
        '/api/v1/support-contacts',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/support-contacts'))
    );
    app.use(
        '/api/v1/legal-documents',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/legal-documents'))
    );
    app.use('/verify-email', createProxyMiddleware(createOptions(clientAuthTarget)));

    return { notificationsProxy };
};
