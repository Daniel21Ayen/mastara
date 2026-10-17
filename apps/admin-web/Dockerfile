# ─────────────────────────────────────────────
# Stage 1: Dependencies
# ─────────────────────────────────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copy root workspace manifests
COPY package.json package-lock.json turbo.json tsconfig.base.json ./

# Copy all package manifests
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

RUN npm ci --ignore-scripts

# ─────────────────────────────────────────────
# Stage 2: Builder
# ─────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/package.json ./package.json

COPY apps/admin-web/ ./apps/admin-web/
COPY packages/       ./packages/
COPY tsconfig.base.json ./

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Build requires NEXT_PUBLIC_API_URL at build time
ARG NEXT_PUBLIC_API_URL=http://localhost:4001
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL

RUN npm run build --workspace=@mastara/admin-web

# ─────────────────────────────────────────────
# Stage 3: Production runner
# ─────────────────────────────────────────────
FROM node:20-alpine AS production

RUN apk add --no-cache tini

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3001

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

# Copy standalone Next.js output (requires `output: 'standalone'` in next.config.ts)
COPY --from=builder --chown=appuser:appgroup /app/apps/admin-web/.next/standalone ./
COPY --from=builder --chown=appuser:appgroup /app/apps/admin-web/.next/static     ./apps/admin-web/.next/static
COPY --from=builder --chown=appuser:appgroup /app/apps/admin-web/public           ./apps/admin-web/public

USER appuser

EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/admin-web/server.js"]
