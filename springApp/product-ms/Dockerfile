# Stage 1: Build
FROM node:18-alpine AS builder
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY tsconfig*.json ./
COPY src ./src

# Build TypeScript
RUN npm run build

# Stage 2: Production
FROM node:18-alpine AS runner
WORKDIR /app

# Set production environment
ENV NODE_ENV=production

# Create non-root user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy package files and install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copy built application from builder
COPY --from=builder /app/dist ./dist

# OpenAPI spec (read at runtime by dist/config/swagger.js → /app/openapi.json)
COPY openapi.json ./openapi.json

# Change ownership to non-root user
RUN chown -R appuser:appgroup /app

# Switch to non-root user
USER appuser

# Must match fly.toml internal_port / PORT (default 4005)
EXPOSE 4005

# No Docker HEALTHCHECK: Fly.io uses [[http_service.checks]] in fly.toml. A duplicate
# Docker health probe can mark the container unhealthy and fight the Fly proxy.

# Start application
CMD ["node", "dist/index.js"]
