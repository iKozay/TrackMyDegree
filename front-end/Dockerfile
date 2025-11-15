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

# Expose the port the app runs on
EXPOSE 3000

# Run the React app
CMD dotenv -e .env -- npm start
