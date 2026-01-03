# ---------- Build stage ----------
FROM node:22 AS build

WORKDIR /app

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

COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json

EXPOSE 5173

CMD ["npm", "run", "start"]
