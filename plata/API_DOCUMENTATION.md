# API Documentation (OpenAPI / Swagger)

Each microservice in the **plata** folder exposes interactive API docs at **`/api-docs`** using **swagger-jsdoc** and **swagger-ui-express**.

## How it works

1. **swagger-jsdoc** scans your route files (and any file listed in `config/swagger.ts` under `apis`) for JSDoc comments containing `@openapi`.
2. It builds an OpenAPI 3.0 specification from those comments.
3. **swagger-ui-express** serves Swagger UI at `/api-docs`, so you can view and try the APIs in the browser.

## Viewing docs

With a microservice running (e.g. `npm run dev` in that service), open:

- **Service Auth (SAMS):** `http://localhost:3000/api-docs`
- **Client Auth:** `http://localhost:3001/api-docs`
- **Product MS:** `http://localhost:3005/api-docs`
- **Compliance:** `http://localhost:3003/api-docs`
- **Wallet:** `http://localhost:3004/api-docs`
- **Create App:** `http://localhost:3002/api-docs`
- **Billing:** `http://localhost:3006/api-docs`
- **Payment:** `http://localhost:3007/api-docs`
- **Notifications:** `http://localhost:3008/api-docs`
- **Account / Gateway:** `http://localhost:3008/api-docs` 

(Adjust host/port if your services use different values.)

## Adding or updating API docs

Document an endpoint by adding a **JSDoc block with `@openapi`** above the route or in the same file. Use the **full path** as registered in the app (e.g. `/api/v1/products`, `/api/v1/user/profile`).

### Example (in a route file)

```ts
/**
 * @openapi
 * /api/v1/products:
 *   get:
 *     summary: Get all products
 *     tags: [Products]
 *     responses:
 *       200:
 *         description: List of products
 *   post:
 *     summary: Create product
 *     tags: [Products]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *     responses:
 *       201:
 *         description: Product created
 */
router.get('/', ...);
router.post('/', ...);
```

### Path parameters

```yaml
/api/v1/products/{id}:
  get:
    summary: Get product by ID
    parameters:
      - in: path
        name: id
        required: true
        schema:
          type: string
    responses:
      200:
        description: Product details
```

### Bearer auth (when your service uses JWT)

The base spec in `config/swagger.ts` already defines `bearerAuth`. Use it in the operation:

```yaml
/api/v1/keys:
  get:
    summary: List API keys
    security:
      - bearerAuth: []
    responses:
      200:
        description: List of API keys
```

## Per-service setup

- **Config:** `src/config/swagger.ts` – OpenAPI `info`, `servers`, `components.securitySchemes`, and `apis` (files/globs to scan).
- **Mount:** In `src/index.ts`, Swagger UI is mounted with:
  `app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));`
- **Scan pattern:** Routes are scanned via a glob like `routes/**/*.ts` (or `*.js` when running compiled). The gateway (account-ms) uses a single `swaggerDocs.ts` file instead of a routes folder.

## References

- [OpenAPI 3.0](https://swagger.io/specification/)
- [swagger-jsdoc](https://github.com/Surnet/swagger-jsdoc)
- [swagger-ui-express](https://github.com/scottie1984/swagger-ui-express)
