#!/bin/bash

echo "正在重启 API 服务器..."

# 停止旧进程
pkill -f "node server/api-server.cjs"
sleep 1

# 启动新进程
cd /Users/massifserver/app-7u4xlrye46ip
nohup node server/api-server.cjs > /tmp/api-server.log 2>&1 &

sleep 2

# 检查状态
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ API 服务器已成功启动"
    echo "测试 /api/users 端点..."
    curl -s http://localhost:3001/api/users | head -c 100
    echo ""
else
    echo "❌ API 服务器启动失败，查看日志："
    tail -20 /tmp/api-server.log
fi
