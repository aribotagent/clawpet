#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DATA_DIR="$(dirname "$SCRIPT_DIR")/data"
PID_FILE="$DATA_DIR/server.pid"

if [ -f "$PID_FILE" ]; then
  PID=$(cat "$PID_FILE")
  kill "$PID" 2>/dev/null && echo "🦞 Agent Pet stopped." || echo "Already stopped."
  rm -f "$PID_FILE"
else
  echo "Agent Pet is not running."
fi
