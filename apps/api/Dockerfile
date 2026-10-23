# ─────────────────────────────────────────────
# Stage 1: Builder
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json turbo.json tsconfig.base.json ./

# Copy all package manifests so npm workspaces can resolve deps
COPY apps/api/package.json          ./apps/api/
COPY apps/worker/package.json       ./apps/worker/
COPY apps/admin-web/package.json    ./apps/admin-web/
COPY packages/config/package.json   ./packages/config/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/domain/package.json   ./packages/domain/
COPY packages/i18n/package.json     ./packages/i18n/
COPY packages/sdk/package.json      ./packages/sdk/
COPY packages/ui-native/package.json ./packages/ui-native/
COPY packages/ui-tokens/package.json ./packages/ui-tokens/
COPY packages/ui-web/package.json   ./packages/ui-web/
COPY packages/utils/package.json    ./packages/utils/

# Install all dependencies (including devDeps needed for build)
RUN npm ci --ignore-scripts

# Copy source code
COPY apps/api/        ./apps/api/
COPY apps/worker/     ./apps/worker/
COPY packages/        ./packages/

# Generate Prisma client and build domain
RUN npm run --workspace=@mastara/database build 2>/dev/null || true
RUN npm run --workspace=@mastara/domain build
RUN npx --workspace=@mastara/database prisma generate 2>/dev/null || true

# Build the API
RUN npm run build --workspace=@mastara/api

# ─────────────────────────────────────────────
# Stage 2: Production
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production

# Copy root workspace manifests
COPY package.json package-lock.json ./

# Copy package manifests (needed for workspace resolution)
COPY apps/api/package.json          ./apps/api/
COPY apps/worker/package.json       ./apps/worker/
COPY apps/admin-web/package.json    ./apps/admin-web/
COPY packages/config/package.json   ./packages/config/
COPY packages/contracts/package.json ./packages/contracts/
COPY packages/database/package.json ./packages/database/
COPY packages/domain/package.json   ./packages/domain/
COPY packages/i18n/package.json     ./packages/i18n/
COPY packages/sdk/package.json      ./packages/sdk/
COPY packages/ui-native/package.json ./packages/ui-native/
COPY packages/ui-tokens/package.json ./packages/ui-tokens/
COPY packages/ui-web/package.json   ./packages/ui-web/
COPY packages/utils/package.json    ./packages/utils/

# Install production deps only
RUN npm ci --omit=dev --ignore-scripts

# Copy compiled output and Prisma client from builder
COPY --from=builder /app/apps/api/dist            ./apps/api/dist
COPY --from=builder /app/packages/domain/dist     ./packages/domain/dist
COPY --from=builder /app/node_modules/.prisma     ./node_modules/.prisma
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma

# Non-root user for security
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
USER appuser

EXPOSE 4001

# Use tini as PID 1 for proper signal handling
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/api/dist/main"]
