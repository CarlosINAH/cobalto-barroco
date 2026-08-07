# Multi-stage build for the Cobalto Barroco Next.js app.
# Produces a small linux/arm64 image (UGREEN DH2300 / RK3576) using Next standalone output.

# 1) Install dependencies (with dev deps — needed to build)
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# 2) Build the app
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# 3) Minimal runtime image
FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
# public assets and the standalone server + static files
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
# Runs as root on purpose: the app persists its JSON DB to the bind-mounted
# /data volume, whose host folder on the UGREEN NAS is root-owned. Running as a
# non-root uid caused "EACCES: permission denied, open '/data/cobalto.json.tmp'"
# and broke every write (Personal seed, inventory, projects, profile, messages).
EXPOSE 3000
CMD ["node", "server.js"]
