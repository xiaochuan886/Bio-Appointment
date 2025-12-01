#!/bin/bash

echo "======================================"
echo "钉钉同步功能API测试"
echo "======================================"
echo ""

echo "1. 测试获取配置 (应该返回 null 或配置)"
curl -s http://localhost:3001/api/dingtalk/config | jq . || echo "null"
echo ""
echo ""

echo "2. 测试保存配置"
curl -s -X POST http://localhost:3001/api/dingtalk/config \
  -H "Content-Type: application/json" \
  -d '{
    "app_key": "test_app_key_123",
    "app_secret": "test_secret_456",
    "agent_id": "789",
    "corp_id": "test_corp_id",
    "sync_enabled": true,
    "auto_sync_enabled": false,
    "sync_schedule": "daily",
    "sync_time": "02:00:00",
    "conflict_strategy": "dingtalk_first",
    "selected_departments": []
  }' | jq .
echo ""
echo ""

echo "3. 再次获取配置 (应该返回刚才保存的配置)"
curl -s http://localhost:3001/api/dingtalk/config | jq .
echo ""
echo ""

echo "4. 测试获取同步日志 (应该返回空列表)"
curl -s 'http://localhost:3001/api/dingtalk/sync/logs?limit=10' | jq .
echo ""
echo ""

echo "======================================"
echo "测试完成！"
echo "======================================"
echo ""
echo "✅ 如果以上测试都成功，说明钉钉同步功能的数据库版本已经正常工作"
echo "💡 接下来可以在前端页面配置真实的钉钉AppKey和AppSecret"
echo "🚀 配置保存后，'立即同步'按钮将变为可用状态"
