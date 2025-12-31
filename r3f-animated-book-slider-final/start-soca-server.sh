#!/bin/bash
# Start SOCA Book Slider server in background

export NVM_DIR="/mnt/raid1/dev-env/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /mnt/raid1/media/SOCA_WEBSITE/r3f-animated-book-slider-final/
nvm use 22

# Kill any existing server on port 5173
kill $(lsof -t -i:5173) 2>/dev/null || true

npm run dev -- --host > /tmp/soca-server.log 2>&1 &
PID=$!
echo $PID > /tmp/soca-server.pid

echo "SOCA Book Slider server started with PID: $PID"
echo "Server running at: http://192.168.86.100:5173"
echo "Logs available at: /tmp/soca-server.log"
echo ""
echo "To stop the server, run: kill $(cat /tmp/soca-server.pid)"
echo "To view logs, run: tail -f /tmp/soca-server.log"