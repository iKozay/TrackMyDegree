# ---------- Build stage ----------
FROM node:22 AS build

WORKDIR /app

COPY tsconfig.json ./
COPY package.json ./
COPY *lock* ./
RUN npm install

COPY . .

ARG VITE_DEPLOYMENT_VERSION
ENV VITE_DEPLOYMENT_VERSION=$VITE_DEPLOYMENT_VERSION

RUN npm run build


# ---------- Runtime stage ----------
FROM node:22

WORKDIR /app

# Install envsubst
RUN apt-get update && apt-get install -y gettext-base && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/vite.config.ts ./vite.config.ts

EXPOSE 5173

CMD envsubst < ./dist/env.js > ./dist/env.runtime.js && mv ./dist/env.runtime.js ./dist/env.js && npm run start
