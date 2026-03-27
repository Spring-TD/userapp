import { config } from './environment';

export interface SwaggerServiceEntry {
  id: string;
  name: string;
  specUrl: string;
}

/** Minimal OpenAPI spec for the gateway itself (always available, no backend call). */
export const gatewaySpec = {
  openapi: '3.0.0',
  info: { title: 'Account MS (API Gateway)', version: '1.0.0', description: 'API Gateway – use the dropdown above to view other microservices\' API docs.' },
  paths: {
    '/': { get: { summary: 'Root', responses: { 200: { description: 'Service info' } } } },
    '/health': { get: { summary: 'Health check', responses: { 200: { description: 'OK' } } } },
  },
};

/**
 * All microservices that expose OpenAPI specs at /api-docs.json.
 * Gateway is listed first so the hub loads without requiring any backend to be up.
 */
export const swaggerServices: SwaggerServiceEntry[] = [
  { id: 'service-auth', name: 'Service Auth (SAMS)', specUrl: `${config.serviceAuthUrl}/api-docs.json` },
  { id: 'client-auth', name: 'Client Auth', specUrl: `${config.clientAuthServiceUrl}/api-docs.json` },
  { id: 'create-app', name: 'Create App', specUrl: `${config.createAppServiceUrl}/api-docs.json` },
  { id: 'compliance', name: 'Compliance', specUrl: `${config.complianceServiceUrl}/api-docs.json` },
  { id: 'wallet', name: 'Wallet', specUrl: `${config.walletServiceUrl}/api-docs.json` },
  { id: 'product', name: 'Product', specUrl: `${config.productServiceUrl}/api-docs.json` },
  { id: 'billing', name: 'Billing', specUrl: `${config.billingServiceUrl}/api-docs.json` },
  { id: 'payment', name: 'Payment', specUrl: `${config.paymentServiceUrl}/api-docs.json` },
  { id: 'notifications', name: 'Notifications', specUrl: `${config.notificationServiceUrl}/api-docs.json` },
];

export const getServiceById = (id: string): SwaggerServiceEntry | undefined =>
  swaggerServices.find((s) => s.id === id);
