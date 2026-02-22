FROM node:22

WORKDIR /app

COPY tsconfig.base.json ./
COPY shared ./shared
COPY secrets ./secrets

# 2. Copy Back-End files into their specific folder
COPY Back-End/src/package*.json ./Back-End/src/
COPY Back-End/src/tsconfig.json ./Back-End/src/

# 3. Copy the actual source code into that folder
COPY Back-End/src ./Back-End/src

# 4. Set WORKDIR to the Back-End project root
WORKDIR /app/Back-End/src

RUN npm install

RUN npm run build

EXPOSE 8000

CMD ["npm", "run", "start"]