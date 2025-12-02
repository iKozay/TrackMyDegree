FROM node:22

# Install Python and pip
RUN apt-get update && apt-get install -y \
    python-is-python3 \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

# Set the working directory for backend
WORKDIR /app/backend

# Copy backend package files and install dependencies
COPY ./src/package.json ./
RUN npm install

# Copy backend source code
COPY ./src ./

# Build backend
RUN npm run build

# Set up Python utils
WORKDIR /app/python_utils
COPY python_utils/requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

COPY python_utils ./

# Expose only backend port (python utils accessible only internally)
EXPOSE 8000

# Copy entrypoint script
WORKDIR /app
COPY entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

ENTRYPOINT ["/app/entrypoint.sh"]