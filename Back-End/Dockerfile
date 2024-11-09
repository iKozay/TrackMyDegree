# Use the official Node.js image as the base image
FROM node:22

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json from the root directory to /app in the container
COPY package.json ./

# Clear npm cache and install dependencies
RUN yarn
#npm install

# Copy the entire application source code into the container
COPY . .

# Expose the port your app runs on
EXPOSE 5000

# Start the Express app
CMD ["yarn", "launch"] 
