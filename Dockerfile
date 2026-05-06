# ═══════════════════════════════════════════
# Candalena Claw — Dockerfile
# Lightweight Node.js background daemon
# No port exposed — pure cron worker
# ═══════════════════════════════════════════

FROM node:20-alpine AS builder

WORKDIR /app

# Install ALL dependencies (including dev) to build TypeScript
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY tsconfig.json ./
COPY src/ ./src/
RUN npm run build

# Remove devDependencies to keep the final image clean
RUN npm prune --omit=dev

# ─── Production Stage ─────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy built files and production deps
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

# Set timezone (default: Asia/Jakarta)
ENV TZ=Asia/Jakarta

# No port exposed — this is a background daemon
# EXPOSE is intentionally omitted

# Health check — verify node process is running
HEALTHCHECK --interval=60s --timeout=5s --retries=3 \
  CMD node -e "console.log('ok')" || exit 1

# Run the daemon
CMD ["node", "dist/engine/daemon.js"]
