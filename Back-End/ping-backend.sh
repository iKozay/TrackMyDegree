#!/usr/bin/env bash

# Use the environment variable BACKEND or default to "host.docker.internal"
host=${BACKEND:-"host.docker.internal"}
port="8000"
route="/test-db"
expected_response='{"message":"Database connected successfully!","result":[{"number":1}]}'
cmd="$@"

echo "Waiting for $host:$port$route..."

# Wait until the port is available
while ! timeout 1 bash -c "echo > /dev/tcp/$host/$port" 2>/dev/null; do
  sleep 1
done

echo "Port $port is available, checking for expected response..."

# Wait for the expected response from the server
while true; do
  response=$(curl -s "http://$host:$port$route")
  if [[ "$response" == "$expected_response" ]]; then
    echo "Expected response received: $response"
    break
  fi
  echo "Waiting for expected response... Received: $response"
  sleep 1
done

echo "$host:$port$route is ready, executing command."
exec $cmd
