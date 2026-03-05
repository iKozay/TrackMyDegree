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

# ---------- Runtime stage ----------
FROM node:22-alpine

WORKDIR /app

RUN npm install -g serve

COPY --from=builder /app/ts-front-end/dist ./dist

EXPOSE 4173

USER node

CMD ["serve", "-s", "dist", "-l", "4173"]
