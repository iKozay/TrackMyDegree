# Use the official Node.js image as the base image
FROM node:22

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    python3-venv \
    && ln -s /usr/bin/python3 /usr/bin/python \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory to /app
WORKDIR /app

# Copy package.json and package-lock.json from the root directory to /app in the container
# Comment above mentions package-lock.json but it's not being copied here.
COPY package.json ./

# Clear npm cache and install dependencies
# npm was previously used but now switched to yarn. There was an issue with node version and sqlserver. See commmit: 65dca7b3f1ac5c1b7e71232431119c367f57cf2d
RUN npm install

# Copy the entire application source code into the container
COPY . .

# Install Python requirements
RUN pip3 install --break-system-packages -r course-data/Scraping/requirements.txt

RUN pip3 install --break-system-packages -r python/requirements.txt

RUN npm run build

# Expose the port your app runs on
EXPOSE 8000

# Start the Express app
CMD ["npm", "run", "start"] 
