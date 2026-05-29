import { Express } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from '../config/environment';
import { TenantRequest } from '../types/tenant';

export const setupProxies = (app: Express) => {
    // Helper to create proxy options
    const createOptions = (target: string, pathPrefix?: string): Options => ({
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
                if (!tenant) {
                    return;
                }
                proxyReq.setHeader('x-tenant-app-id', tenant.appId);
                proxyReq.setHeader('x-tenant-merchant-id', tenant.merchantId);
                proxyReq.setHeader('x-tenant-subdomain', tenant.subdomain);
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

    app.use(
        '/api/v1/applications',
        createProxyMiddleware(createOptions(config.productServiceUrl, '/api/v1/applications'))
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
        createProxyMiddleware(createOptions(config.walletServiceUrl))
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

    // Notification Service Proxy
    app.use(
        '/api/v1/notifications',
        createProxyMiddleware(createOptions(config.notificationServiceUrl))
    );

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
    app.use(
        '/api/v1/user',
        createProxyMiddleware(createOptions(clientAuthTarget, '/api/v1/user'))
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
};
