#!/bin/bash

# Start Python utils service in background (accessible only on localhost)
cd /app/python_utils && python main.py &

# Start Node.js backend in foreground
cd /app/backend && npm run start
