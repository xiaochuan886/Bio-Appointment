#!/bin/bash

echo "🔧 重启 API 服务器以应用钉钉同步修复..."
echo ""

# 停止旧进程
echo "1️⃣ 停止旧的 API 服务器..."
pkill -f "node server/api-server.cjs"
sleep 2

# 启动新进程
echo "2️⃣ 启动新的 API 服务器..."
cd /Users/massifserver/app-7u4xlrye46ip
nohup node server/api-server.cjs > /tmp/api-server.log 2>&1 &
API_PID=$!

echo "   ✅ API 服务器已启动 (PID: $API_PID)"
echo ""

# 等待启动
echo "3️⃣ 等待 API 服务器启动..."
sleep 3

# 验证健康状态
echo "4️⃣ 验证 API 服务器状态..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "   ✅ API 服务器健康检查通过"
else
    echo "   ⚠️  API 服务器可能未完全启动"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ API 服务器已重启！"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📋 下一步操作："
echo ""
echo "1. 打开浏览器：http://127.0.0.1:5173"
echo "2. 登录系统（admin / admin123）"
echo "3. 进入：用户管理 → 钉钉同步"
echo "4. 点击【立即同步】按钮"
echo "5. 观察同步结果："
echo "   - 应该显示 30+ 个用户"
echo "   - 而不是只有 12 个"
echo ""
echo "🔍 查看详细日志："
echo "   tail -f /tmp/api-server.log"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
