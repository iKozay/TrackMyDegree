# Use official Node LTS
FROM node:20-alpine

# Set working directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install deps
RUN npm install

# Copy source
COPY . .

# Expose app port
EXPOSE 4000

# Start server
CMD ["npm", "run", "dev"]
