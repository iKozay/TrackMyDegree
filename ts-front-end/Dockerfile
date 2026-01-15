# ---------- Build stage ----------
FROM node:22 AS build

WORKDIR /app

COPY shared/ ./shared/
COPY tsconfig.json ./tsconfig.json
COPY ts-front-end/package.json ./ts-front-end/
COPY ts-front-end/*lock* ./ts-front-end/
WORKDIR /app/ts-front-end
RUN npm install

COPY ts-front-end/ ./

ARG VITE_DEPLOYMENT_VERSION
ENV VITE_DEPLOYMENT_VERSION=$VITE_DEPLOYMENT_VERSION

RUN npm run build


# ---------- Runtime stage ----------
FROM node:22

WORKDIR /app

# Install envsubst
RUN apt-get update && apt-get install -y gettext-base && rm -rf /var/lib/apt/lists/*

COPY --from=build /app/ts-front-end/dist ./dist
COPY --from=build /app/ts-front-end/node_modules ./node_modules
COPY --from=build /app/ts-front-end/package.json ./package.json
COPY --from=build /app/ts-front-end/vite.config.ts ./vite.config.ts

EXPOSE 5173

CMD ["sh", "-c", "envsubst < ./dist/env.js > ./dist/env.runtime.js && mv ./dist/env.runtime.js ./dist/env.js && npm run start"]
