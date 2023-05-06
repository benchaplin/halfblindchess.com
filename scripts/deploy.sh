#!/bin/bash

set -e

echo "building halfblindchess.com..."
cd ~/halfblindchess.com
npm install
npm run build

echo "building halfblindchess.com/game-server..."
cd ~/halfblindchess.com/game-server
npm install
npm run build

if ! redis-cli -h localhost -p 6379 ping | grep -q 'PONG'; then
    echo "error: redis is not running or not accessible"
    exit 1
else 
    echo "redis is running on port 6379"
fi

if pm2 status | grep -q "halfblindchess-game-server"; then
    echo "halfblindchess-game-server is already running, restarting..."
    pm2 restart halfblindchess-game-server
else
    echo "halfblindchess-game-server is not running, starting..."
    NODE_ENV=production pm2 start ~/halfblindchess.com/game-server/dist/game-server/server.js --name halfblindchess-game-server
fi

sudo cp -r ~/halfblindchess.com/dist/* /var/www/halfblindchess.com/public_html/
echo "restarting nginx..."
sudo systemctl restart nginx

