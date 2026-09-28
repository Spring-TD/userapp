import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger';
import { buildIntegratorProductSpec, INTEGRATOR_PRODUCTS } from './openapi/integratorProductSpecs';
import frontendPlataSpec from './config/frontendPlataSwagger';
import { config } from './config/environment';
import { setupProxies } from './middleware/proxyMiddleware';
import { merchantGatewayAuth } from './middleware/merchantGatewayAuth';
import { authSensitiveLimiter, generalApiLimiter } from './middleware/rateLimitMiddleware';
import { sessionActivityTouchMiddleware } from './middleware/sessionActivityTouchMiddleware';
import { getSpecUrls, handleSpecRequest } from './specHub';

const app = express();
const PORT = config.port;
let server: ReturnType<express.Express['listen']> | null = null;

app.set('trust proxy', 1);

// Middleware
app.use(helmet());
app.use(cors({
  origin: config.corsOrigins,
  methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'PLATA_PUBLIC_KEY',
    'PLATA_SECRET_KEY',
    'X-Requested-With'
  ],
  optionsSuccessStatus: 204
}));
app.use(morgan(config.logLevel));

app.use(authSensitiveLimiter);
app.use(generalApiLimiter);

// Merchant API key + IP policy (service-auth-ms) before upstream proxies
app.use(merchantGatewayAuth);

// Keep client-auth session idle clock in sync with real gateway API usage
app.use(sessionActivityTouchMiddleware);

// Setup Proxies (must be before body parser)
setupProxies(app);

// Body parsers (for any future local routes)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Root endpoint – confirms this is the gateway and which backends are used
app.get('/', (req, res) => {
  res.json({
    success: true,
    service: 'API Gateway',
    version: '1.0.0',
    status: 'running',
    description: 'Stateless gateway; routes /api/v1/* to backend services.',
    role: 'gateway',
    proxied: {
      registration: 'client-auth-ms',
      auth: 'client-auth-ms',
      otp: 'client-auth-ms',
      password: 'client-auth-ms',
      user: 'client-auth-ms',
      products: 'product-ms',
      wallets: 'wallet-ms',
      billing: 'billing-ms',
      payments: 'payment-ms',
      apps: 'create-app-ms',
      compliance: 'compliance-ms',
      keys: 'service-auth-ms',
    },
    endpoints: {
      health: '/health',
      apiDocs: '/api-docs',
      docs: '/docs',
      integratorGuides: {
        loan: '/docs/loan',
        mortgage: '/docs/mortgage',
        commodity: '/docs/commodity',
        savings: '/docs/savings',
        investment: '/docs/investment'
      },
      frontendPlata: '/frontendplata',
      openApiJson: '/docs/swagger.json',
      frontendPlataOpenApiJson: '/frontendplata/openapi.json'
    },
    timestamp: new Date().toISOString()
  });
});

// OpenAPI / Swagger documentation (hub: dropdown of all service specs)
const specBasePath = '/api-docs/specs';
const specUrls = getSpecUrls(specBasePath);

function mountSwaggerUi(
  mountPath: string,
  opts: {
    title: string;
    openapiUrl?: string;
    urls?: Array<{ name: string; url: string }>;
    primaryName?: string;
  }
) {
  const swaggerOptions: Record<string, unknown> = {
    docExpansion: 'list',
    defaultModelsExpandDepth: 1,
    persistAuthorization: true,
  };
  if (opts.urls?.length) {
    swaggerOptions.urls = opts.urls;
    if (opts.primaryName) swaggerOptions['urls.primaryName'] = opts.primaryName;
  } else if (opts.openapiUrl) {
    swaggerOptions.url = opts.openapiUrl;
  }
  const uiOpts = {
    customSiteTitle: opts.title,
    swaggerOptions,
    ...(opts.openapiUrl ? { swaggerUrl: opts.openapiUrl } : {}),
  };
  app.use(mountPath, swaggerUi.serveFiles(undefined, uiOpts), swaggerUi.setup(undefined, uiOpts));
}

app.get(`${specBasePath}/:serviceId`, (req, res, next) => {
  handleSpecRequest(req, res).catch(next);
});

function integratorDocsIndexHtml(): string {
  const links = INTEGRATOR_PRODUCTS.map(
    (product) =>
      `<li><a href="/docs/${product.slug}">${product.title}</a> — <code>/docs/${product.slug}</code></li>`
  ).join('');
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><title>Plata Merchant Integration Documentation</title></head>
<body>
  <h1>Plata Merchant Integration Documentation</h1>
  <p>Pick one product. Each guide is its own page, with how to fetch products, make them available, and send applications back.</p>
  <ul>${links}</ul>
</body>
</html>`;
}

app.get('/docs/:product/openapi.json', (req, res, next) => {
  const spec = buildIntegratorProductSpec(req.params.product);
  if (!spec) {
    next();
    return;
  }
  res.json(spec);
});

for (const product of INTEGRATOR_PRODUCTS) {
  mountSwaggerUi(`/docs/${product.slug}`, {
    title: `Plata Merchant Integration Documentation — ${product.title}`,
    openapiUrl: `/docs/${product.slug}/openapi.json`,
  });
}

/** Index of the five product guides. Do not mount Swagger on /docs itself — it would swallow /docs/loan. */
app.get('/docs', (_req, res) => {
  res.type('html').send(integratorDocsIndexHtml());
});

/** Combined spec kept for the API hub. Prefer the five product guides. */
app.get('/docs/swagger.json', (_req, res) => {
  res.json(swaggerSpec);
});

app.get('/api-docs.json', (_req, res) => {
  res.json(swaggerSpec);
});

/** Plata merchant dashboard API (Treasury & Settlements) — separate from integrator /docs */
app.get('/frontendplata/openapi.json', (_req, res) => {
  res.json(frontendPlataSpec);
});

/** Spec Hub for all services */
mountSwaggerUi('/api-docs', {
  title: 'Plata API Documentation',
  urls: specUrls,
  primaryName: 'Plata API (Merchant & Integrator)',
});

/** Plata merchant dashboard API */
mountSwaggerUi('/frontendplata', {
  title: 'Plata Frontend API',
  openapiUrl: '/frontendplata/openapi.json',
});

// Health check endpoint (no database)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'gateway'
  });
});

// 404 handler
app.use((req, res) => {
  console.log(`404 - Not Found: ${req.method} ${req.url}`);
  res.status(404).json({ error: 'Route not found', path: req.url, method: req.method });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// Graceful shutdown
const shutdown = () => {
  if (server) {
    server.close(() => {
      console.log('Process terminated');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  shutdown();
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  shutdown();
});

// Start server (no database connection)
if (process.env.NODE_ENV !== 'test') {
  server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`API Gateway listening on port ${PORT}`);
    console.log(`Environment: ${config.nodeEnv}`);
  });
}

export default app;
