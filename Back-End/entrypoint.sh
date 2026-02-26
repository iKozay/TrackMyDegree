#!/bin/bash

# Start Python utils service in background (accessible only on localhost)
cd /app/python_utils && gunicorn -b 127.0.0.1:15001 --timeout 300 main:app &

# Start Node.js backend in foreground
cd /app/backend && npm run start
