# Dockerfile for React App

# Use an official Node.js image as the base image
FROM node:22

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY *lock* ./

# Install dependencies and dotenv-cli globally
RUN npm install && npm install -g dotenv-cli

# Copy the rest of the application code
COPY . .

# Set Deployment Version Argument
ARG VITE_DEPLOYMENT_VERSION
ENV VITE_DEPLOYMENT_VERSION=${VITE_DEPLOYMENT_VERSION}

# Expose the port the app runs on
EXPOSE 5173

# Run the React app
CMD ["npx", "vite", "--host"]
