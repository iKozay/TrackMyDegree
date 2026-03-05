# ---------- Build stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY tsconfig.base.json ./
COPY shared ./shared

COPY Back-End/src/package*.json ./Back-End/src/
COPY Back-End/src/tsconfig.json ./Back-End/src/
COPY Back-End/src ./Back-End/src

WORKDIR /app/Back-End/src

RUN npm ci

RUN npm run build

# ---------- Runtime stage ----------
FROM node:22-alpine

WORKDIR /app

COPY Back-End/src/package*.json ./

RUN npm ci --omit=dev --ignore-scripts

COPY --from=builder /app/Back-End/src/dist ./dist

RUN mkdir -p /app/data /app/tmp/pdf-uploads \
    && chown -R node:node /app/data /app/tmp/pdf-uploads

EXPOSE 8000

USER node

CMD ["node", "dist/Back-End/src/index.js"]