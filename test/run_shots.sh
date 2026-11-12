#!/bin/bash
# 서버를 새로 띄우고 화면 캡처
cd "$(dirname "$0")/.."
pkill -f "node server.js" 2>/dev/null; sleep 0.3
(PORT=3998 node server.js > /dev/null 2>&1 &); sleep 1
timeout 170 python3 test/shots.py "$1" 2>&1 | grep -E "shots.py\", line|ERRORS|Error" | head
pkill -f "node server.js"
