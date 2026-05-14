FROM node:18-alpine AS builder

WORKDIR /app

# Install all deps (including dev) for TypeScript build
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

FROM node:18-alpine AS runner

WORKDIR /app

# Install only production dependencies for runtime image
COPY package*.json ./
RUN npm ci --omit=dev

# Copy compiled output and required runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/healthcheck.js ./healthcheck.js

EXPOSE 4008

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node healthcheck.js

CMD ["npm", "start"]