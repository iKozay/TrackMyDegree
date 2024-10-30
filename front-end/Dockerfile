# Dockerfile for React App

# Use an official Node.js image as the base image
FROM node:23

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN yarn
# npm install


# Copy the rest of the application code
COPY . .

# Build the React app
RUN yarn build
#npm run build

# Expose the port the app runs on
EXPOSE 3000

# Run the React app
CMD ["yarn", "start"]