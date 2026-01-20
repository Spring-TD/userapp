import { Express } from 'express';
import { createProxyMiddleware, Options } from 'http-proxy-middleware';
import { config } from '../config/environment';

export const setupProxies = (app: Express) => {
    // Helper to create proxy options
    const createOptions = (target: string): Options => ({
        target,
        changeOrigin: true,
        pathRewrite: {
            // We keep the path as is
        },
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
        createProxyMiddleware(createOptions(config.complianceServiceUrl))
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
        createProxyMiddleware(createOptions(config.createAppServiceUrl))
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

    app.use('/api/v1/auth', createProxyMiddleware(createOptions(clientAuthTarget)));
    app.use('/api/v1/registration', createProxyMiddleware(createOptions(clientAuthTarget)));
    app.use('/api/v1/otp', createProxyMiddleware(createOptions(clientAuthTarget)));
    app.use('/api/v1/password', createProxyMiddleware(createOptions(clientAuthTarget)));
    app.use('/api/v1/user', createProxyMiddleware(createOptions(clientAuthTarget)));
    app.use('/verify-email', createProxyMiddleware(createOptions(clientAuthTarget)));
};
