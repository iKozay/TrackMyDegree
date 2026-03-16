#!/bin/sh
set -e
envsubst < /app/dist/env.js > /tmp/env.js && mv /tmp/env.js /app/dist/env.js
exec serve -s dist -l 4173
