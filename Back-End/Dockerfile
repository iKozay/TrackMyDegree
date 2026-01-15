FROM node:22

# Install Python and pip
RUN apt-get update && apt-get --no-install-recommends install -y \
    python-is-python3 \
    python3 \
    python3-pip \
    && rm -rf /var/lib/apt/lists/*

COPY shared/ /app/shared/
COPY tsconfig.json /app/tsconfig.json

# Set the working directory for backend
WORKDIR /app/backend

# Copy backend package files and install dependencies
COPY Back-End/src/package.json ./
RUN npm install

# Copy backend source code
COPY Back-End/src ./

# Build backend
RUN npm run build

# Set up Python utils
WORKDIR /app/python_utils
COPY Back-End/python_utils/requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages

COPY Back-End/python_utils ./

# Expose only backend port (python utils accessible only internally)
EXPOSE 8000

# Copy entrypoint script
WORKDIR /app

# Create non-root user and group
RUN groupadd -r appuser && useradd -r -g appuser -m appuser && chown -R appuser:appuser /app

COPY Back-End/entrypoint.sh /app/entrypoint.sh
RUN chmod +x /app/entrypoint.sh

USER appuser

ENTRYPOINT ["/app/entrypoint.sh"]