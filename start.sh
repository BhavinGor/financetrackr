#!/bin/bash

# Start Python PDF API in background
echo "🚀 Starting PDF Parser API..."
python3 backend/main.py &
PDF_PID=$!

# Wait for API to start
sleep 2

# Start Vite dev server
echo "🚀 Starting Vite dev server..."
npm run dev

# Clean up on exit
trap "kill $PDF_PID" EXIT
