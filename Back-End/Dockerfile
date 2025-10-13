# Use the official Node.js image as the base image
FROM node:22

# Set the working directory to /app
WORKDIR /app

# Copy shared module to maintain directory structure
COPY shared/ ./shared/

# Copy Back-End files to maintain directory structure
COPY Back-End/ ./Back-End/

# Set working directory to Back-End
WORKDIR /app/Back-End

# Prevent ESLint from blocking the build
# TODO: linting should be done/checked in CI pipeline
ENV ESLINT_NO_DEV_ERRORS=true

# Clear npm cache and install dependencies
# npm was previously used but now switched to yarn. There was an issue with node version and sqlserver. See commmit: 65dca7b3f1ac5c1b7e71232431119c367f57cf2d
RUN yarn
#npm install

# Expose the port your app runs on
EXPOSE 8000

# Start the Express app
CMD ["yarn", "launch"] 
