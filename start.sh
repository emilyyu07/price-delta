#!/bin/bash

# Ensure script runs from project root
cd "$(dirname "$0")"

# Start up database and Redis 
docker compose up -d

# Wait until Postgres is ready 
until docker compose exec postgres pg_isready -U postgres > /dev/null 2>&1; do
  echo "Waiting for Postgres..."
  sleep 1
done

echo "Postgres is ready!"

# Backend API
(cd backend && npm run dev) &
API_PID=$!

# Backend Worker
(cd backend && npm run dev:worker) &
WORKER_PID=$!

# Frontend
(cd frontend && npm run dev) &
FRONTEND_PID=$!

# Cleanup on exit
trap "kill $API_PID $WORKER_PID $FRONTEND_PID; docker compose down" EXIT

wait