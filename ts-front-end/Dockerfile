# ---------- Build stage ----------
FROM node:22.21 AS build

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
FROM node:22.21

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 5173

CMD ["npm", "run", "dev"]
