# Use the official Node.js image as the base image
FROM node:22

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json from the root directory to /app in the container
# Comment above mentions package-lock.json but it's not being copied here.
COPY package.json ./

# Prevent ESLint from blocking the build
# Why??. linting should be done/checked in CI pipeline, not disabled in the Dockerfile.
ENV ESLINT_NO_DEV_ERRORS=true

# Clear npm cache and install dependencies
# npm was previously used but now switched to yarn. There was an issue with node version and sqlserver. See commmit: 65dca7b3f1ac5c1b7e71232431119c367f57cf2d
RUN yarn
#npm install

# Copy the entire application source code into the container
COPY . .

# Expose the port your app runs on
EXPOSE 8000

# Start the Express app
CMD ["yarn", "launch"] 
