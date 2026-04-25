#!/bin/bash

# Start up database and Redis 
docker compose up -d

# Wait until Postgres is ready 
until docker compose exec db pg_isready -U admin -d pricedelta > /dev/null 2>&1; do
  echo "Waiting for Postgres..."
  sleep 1
done

# Backend API
(cd backend && npm run dev) &
API_PID=$!

# Backend Worker
(cd backend && npm run dev:worker) &
WORKER_PID=$!

# Frontend
(cd frontend && npm start) &
FRONTEND_PID=$!

trap "kill $API_PID $WORKER_PID $FRONTEND_PID" EXIT

wait