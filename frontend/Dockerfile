# ---------- Build stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.base.json ./

# Copy shared module
COPY shared ./shared

# Copy frontend source
COPY frontend/package*.json ./frontend/
COPY frontend/tsconfig*.json ./frontend/
COPY frontend ./frontend

# Install workspace dependencies (this will link the shared module)
RUN npm ci --ignore-scripts

# Build shared module first
WORKDIR /app/shared
RUN npm run build

# Build frontend
WORKDIR /app/frontend

ARG VITE_DEPLOYMENT_VERSION
ENV VITE_DEPLOYMENT_VERSION=$VITE_DEPLOYMENT_VERSION

RUN npm run build

# ---------- serve deps stage ----------
FROM node:22-alpine AS serve-deps

WORKDIR /app

RUN npm init -y && npm install serve \
    && mkdir -p /app/dist \
    && chown -R 65532:65532 /app/node_modules /app/dist

# ---------- Runtime stage ----------
FROM gcr.io/distroless/nodejs22-debian12:nonroot

WORKDIR /app

COPY --from=serve-deps  --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=builder     --chown=65532:65532 /app/frontend/dist ./dist
COPY --chown=65532:65532 frontend/startup.js ./startup.js

EXPOSE 4173

CMD ["startup.js"]
