# ---------- Build stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

COPY tsconfig.base.json ./
COPY shared ./shared

COPY Back-End/src/package*.json ./Back-End/src/
COPY Back-End/src/tsconfig.json ./Back-End/src/
COPY Back-End/src ./Back-End/src

WORKDIR /app/Back-End/src

RUN npm ci --ignore-scripts

RUN npx ts-patch install -s

RUN npm run build

# ---------- Deps stage ----------
# Runs npm ci and creates writable data dirs; distroless has no shell so this
# must happen here before the final COPY.
FROM node:22-alpine AS deps

WORKDIR /app

COPY Back-End/src/package*.json ./

RUN npm ci --omit=dev --ignore-scripts \
    && mkdir -p /app/data /app/tmp/pdf-uploads \
    && chown -R 65532:65532 /app/data /app/tmp

# ---------- Runtime stage ----------
FROM gcr.io/distroless/nodejs22-debian12:nonroot

WORKDIR /app

COPY --from=deps    --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=deps    --chown=65532:65532 /app/data         ./data
COPY --from=deps    --chown=65532:65532 /app/tmp          ./tmp
COPY --from=builder --chown=65532:65532 /app/Back-End/src/dist ./dist

EXPOSE 8000

CMD ["dist/Back-End/src/index.js"]