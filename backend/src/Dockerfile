# ---------- Build stage ----------
FROM node:22-alpine AS builder

WORKDIR /app

# Copy workspace configuration
COPY package.json ./
COPY package-lock.json ./
COPY tsconfig.base.json ./

# Copy shared module
COPY shared ./shared

# Copy backend source
COPY backend/src/package*.json ./backend/src/
COPY backend/src/tsconfig.json ./backend/src/
COPY backend/src ./backend/src

# Install workspace dependencies (this will link the shared module)
RUN npm ci --ignore-scripts

# Build shared module first
WORKDIR /app/shared
RUN npm run build

# Build backend
WORKDIR /app/backend/src
RUN npx ts-patch install -s
RUN npm run build

# Create required directories and set permissions
WORKDIR /app
RUN mkdir -p /app/data /app/tmp/pdf-uploads \
    && chown -R 65532:65532 /app/data /app/tmp

# ---------- Runtime stage ----------
FROM gcr.io/distroless/nodejs22-debian12:nonroot

WORKDIR /app

# Copy everything from builder - this includes node_modules with workspace links
COPY --from=builder --chown=65532:65532 /app/node_modules ./node_modules
COPY --from=builder --chown=65532:65532 /app/shared       ./shared
COPY --from=builder --chown=65532:65532 /app/backend/src/dist ./dist
COPY --from=builder --chown=65532:65532 /app/data         ./data
COPY --from=builder --chown=65532:65532 /app/tmp          ./tmp
COPY --from=builder --chown=65532:65532 /app/backend/src/public /app/public

EXPOSE 8000

CMD ["dist/index.js"]