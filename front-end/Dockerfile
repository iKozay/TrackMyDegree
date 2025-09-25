# Dockerfile for React App

# Use an official Node.js image as the base image
FROM node:22

# Set the working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY *lock* ./

# Install dependencies
# npm was previously used but now switched to yarn. There was an issue with node version and sqlserver. See commmit: 65dca7b3f1ac5c1b7e71232431119c367f57cf2d
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
