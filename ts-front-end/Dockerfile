# ---------- Build stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY tsconfig.base.json ./
COPY shared ./shared

COPY ts-front-end/package*.json ./ts-front-end/
COPY ts-front-end/tsconfig*.json ./ts-front-end/
COPY ts-front-end ./ts-front-end

WORKDIR /app/ts-front-end

RUN npm ci

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
COPY --from=builder     --chown=65532:65532 /app/ts-front-end/dist ./dist
COPY --chown=65532:65532 ts-front-end/startup.js ./startup.js

EXPOSE 4173

CMD ["startup.js"]
