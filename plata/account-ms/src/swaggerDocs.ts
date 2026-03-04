/**
 * OpenAPI documentation for API Gateway (account-ms).
 * This service is a stateless proxy; requests are forwarded to backend microservices.
 */

/**
 * @openapi
 * /:
 *   get:
 *     summary: Gateway root
 *     description: Returns API Gateway info and available endpoints.
 *     responses:
 *       200:
 *         description: Gateway info
 * /health:
 *   get:
 *     summary: Health check
 *     description: Returns gateway health status.
 *     responses:
 *       200:
 *         description: OK
 * /api/v1/products:
 *   get:
 *     summary: Products API (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Product microservice.
 *     responses:
 *       200:
 *         description: Response from product service
 *   post:
 *     summary: Create product (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       201:
 *         description: Created by product service
 * /api/v1/configurations:
 *   get:
 *     summary: Configurations API (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Product microservice.
 *     responses:
 *       200:
 *         description: Response from product service
 *   post:
 *     summary: Create/update configuration (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       200:
 *         description: Response from product service
 * /api/v1/compliance:
 *   get:
 *     summary: Compliance/KYC API (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Compliance microservice.
 *     responses:
 *       200:
 *         description: Response from compliance service
 *   post:
 *     summary: Compliance submission (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       200:
 *         description: Response from compliance service
 * /api/v1/wallets:
 *   get:
 *     summary: Wallets API (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Wallet microservice.
 *     responses:
 *       200:
 *         description: Response from wallet service
 *   post:
 *     summary: Create wallet / funding (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       200:
 *         description: Response from wallet service
 * /api/v1/billing:
 *   get:
 *     summary: Billing API (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Billing microservice.
 *     responses:
 *       200:
 *         description: Response from billing service
 *   post:
 *     summary: Billing operations (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       200:
 *         description: Response from billing service
 * /api/v1/apps:
 *   get:
 *     summary: Apps API (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Create App microservice.
 *     responses:
 *       200:
 *         description: Response from create-app service
 *   post:
 *     summary: Create app (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       201:
 *         description: Response from create-app service
 * /api/v1/payments:
 *   get:
 *     summary: Payments API (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Payment microservice.
 *     responses:
 *       200:
 *         description: Response from payment service
 *   post:
 *     summary: Process payment (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       200:
 *         description: Response from payment service
 * /api/v1/auth:
 *   post:
 *     summary: Auth API (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Client Auth microservice (login, logout, refresh, etc.).
 *     responses:
 *       200:
 *         description: Response from client-auth service
 * /api/v1/registration:
 *   get:
 *     summary: Registration forms (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       200:
 *         description: Response from client-auth service
 *   post:
 *     summary: Register merchant/user/admin (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       201:
 *         description: Response from client-auth service
 * /api/v1/otp:
 *   post:
 *     summary: OTP generate/verify/resend (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Client Auth microservice.
 *     responses:
 *       200:
 *         description: Response from client-auth service
 * /api/v1/password:
 *   post:
 *     summary: Password forgot/reset/change (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Client Auth microservice.
 *     responses:
 *       200:
 *         description: Response from client-auth service
 * /api/v1/user:
 *   get:
 *     summary: User profile/list (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Client Auth microservice.
 *     responses:
 *       200:
 *         description: Response from client-auth service
 *   put:
 *     summary: Update user (proxied)
 *     tags: [Gateway - Proxied]
 *     responses:
 *       200:
 *         description: Response from client-auth service
 * /verify-email:
 *   get:
 *     summary: Verify email (proxied)
 *     tags: [Gateway - Proxied]
 *     description: Proxied to Client Auth microservice.
 *     responses:
 *       200:
 *         description: Response from client-auth service
 */
void 0;
