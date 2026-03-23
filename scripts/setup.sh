#!/bin/bash
# Agent Pet — Setup Script

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILL_DIR="$(dirname "$SCRIPT_DIR")"
BACKEND_DIR="$SKILL_DIR/backend"
DATA_DIR="$SKILL_DIR/data"
PID_FILE="$DATA_DIR/server.pid"

echo "🦞 Setting up Agent Pet..."

# Create data directory
mkdir -p "$DATA_DIR"

# Check Python
if ! command -v python3 &>/dev/null; then
  echo "❌ Python 3 is required but not found."
  exit 1
fi

# Start the server
"$SCRIPT_DIR/start-server.sh"

echo ""
echo "✅ Agent Pet is running!"
echo "   → Open Chrome and visit: http://localhost:7474/install"
echo "   → Follow the instructions to install the Chrome extension."
