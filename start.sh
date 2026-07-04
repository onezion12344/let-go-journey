#!/bin/bash
# Exaholic Game — Start Server
# Usage: ./start.sh [port]

PORT=${1:-5099}
cd "$(dirname "$0")"

echo "🕊️ 放手之旅 — 啟動遊戲伺服器"
echo ""

# Check if running
if curl -s http://localhost:$PORT/api/content > /dev/null 2>&1; then
  echo "✅ 伺服器已在 http://localhost:$PORT 運行中"
  echo "   前端: http://localhost:$PORT/"
  echo "   小組件: http://localhost:$PORT/widget"
  exit 0
fi

# Start server
# Auto-detect Python with Flask
PYTHON=""
for cmd in "/Users/onezion12344/.hermes/hermes-agent/venv/bin/python3" python3 python; do
  if command -v $cmd &>/dev/null && $cmd -c "import flask" 2>/dev/null; then
    PYTHON=$cmd
    break
  fi
done

if [ -z "$PYTHON" ]; then
  echo "❌ Python not found. Install Python 3.8+ first."
  exit 1
fi

# Check dependencies
if ! $PYTHON -c "import flask" 2>/dev/null; then
  echo "📦 Installing dependencies..."
  $PYTHON -m pip install -r requirements.txt
fi

echo "🚀 啟動伺服器 http://0.0.0.0:$PORT"
echo "   前端: http://localhost:$PORT/"
echo "   小組件: http://localhost:$PORT/widget"
echo "   API:   http://localhost:$PORT/api/"
echo ""
echo "按 Ctrl+C 停止伺服器"
echo ""

$PYTHON backend/app.py $PORT