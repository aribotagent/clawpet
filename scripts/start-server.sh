#!/bin/bash
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$SKILL_DIR/backend"
DATA_DIR="$SKILL_DIR/data"
PID_FILE="$DATA_DIR/server.pid"
LOG_FILE="$DATA_DIR/server.log"

mkdir -p "$DATA_DIR"

# Kill existing
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  kill "$OLD_PID" 2>/dev/null
  rm -f "$PID_FILE"
fi

cd "$BACKEND_DIR"
nohup python3 server.py > "$LOG_FILE" 2>&1 &
echo $! > "$PID_FILE"

sleep 1
if kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
  echo "🦞 Agent Pet server started (PID $(cat "$PID_FILE"))"
  echo "   API: http://localhost:7474"
else
  echo "❌ Failed to start server. Check: $LOG_FILE"
  exit 1
fi
