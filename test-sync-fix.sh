#!/bin/bash

echo "=== 钉钉同步功能修复验证 ==="
echo ""

# 1. 停止旧的API服务器
echo "1. 停止旧的API服务器..."
pkill -f "node server/api-server.cjs" 2>/dev/null
sleep 2

# 2. 启动新的API服务器
echo "2. 启动新的API服务器..."
cd "$(dirname "$0")"
node server/api-server.cjs > /tmp/api-server.log 2>&1 &
API_PID=$!
echo "   API服务器已启动，PID: $API_PID"
sleep 3

# 3. 测试API服务器
echo "3. 测试API服务器健康状态..."
HEALTH=$(curl -s http://localhost:3001/api/health 2>/dev/null)
if [ $? -eq 0 ]; then
    echo "   ✅ API服务器正常运行"
else
    echo "   ❌ API服务器连接失败"
    exit 1
fi

# 4. 测试获取用户列表
echo "4. 测试获取用户列表..."
USER_COUNT=$(curl -s http://localhost:3001/api/users 2>/dev/null | jq 'length' 2>/dev/null)
if [ ! -z "$USER_COUNT" ]; then
    echo "   ✅ 成功获取用户列表，共 $USER_COUNT 个用户"
else
    echo "   ❌ 获取用户列表失败"
fi

# 5. 测试钉钉配置
echo "5. 测试钉钉配置..."
CONFIG=$(curl -s http://localhost:3001/api/dingtalk/config 2>/dev/null)
if [ $? -eq 0 ]; then
    SYNC_ENABLED=$(echo $CONFIG | jq -r '.sync_enabled' 2>/dev/null)
    echo "   ✅ 钉钉配置状态: sync_enabled=$SYNC_ENABLED"
else
    echo "   ❌ 获取钉钉配置失败"
fi

echo ""
echo "=== 验证完成 ==="
echo ""
echo "📋 下一步操作："
echo "   1. 打开浏览器访问: http://127.0.0.1:5173"
echo "   2. 进入：用户管理 → 用户列表"
echo "   3. 应该能看到 $USER_COUNT 个用户"
echo "   4. 切换到 钉钉同步 标签"
echo "   5. 点击 立即同步 按钮"
echo "   6. 同步完成后，自动刷新用户列表"
echo ""
echo "API服务器日志: tail -f /tmp/api-server.log"
echo "API服务器PID: $API_PID"
