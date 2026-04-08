import { Express } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from '../config/environment';

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
        // We don't need on: proxyReq here if we mount this BEFORE body-parser
    });

    // Product Service Proxy
    app.use(
        '/api/v1/products',
        createProxyMiddleware(createOptions(config.productServiceUrl))
    );

    app.use(
        '/api/v1/configurations',
        createProxyMiddleware(createOptions(config.productServiceUrl))
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
    app.use('/verify-email', createProxyMiddleware(createOptions(clientAuthTarget)));
};
