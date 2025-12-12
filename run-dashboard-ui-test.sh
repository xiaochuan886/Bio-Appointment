#!/bin/bash

# 工作台UI自动化测试运行脚本

echo "🚀 开始运行工作台UI自动化测试..."
echo "=================================="

# 检查Node.js是否安装
if ! command -v node &> /dev/null; then
    echo "❌ 错误: Node.js未安装，请先安装Node.js"
    exit 1
fi

# 检查npm是否安装
if ! command -v npm &> /dev/null; then
    echo "❌ 错误: npm未安装，请先安装npm"
    exit 1
fi

# 检查Playwright是否安装
if ! npm list playwright &> /dev/null; then
    echo "⚠️  警告: Playwright未安装，正在安装..."
    npm install playwright
    echo "📦 安装Playwright浏览器..."
    npx playwright install
fi

# 检查API服务器是否运行
echo "🔍 检查API服务器状态..."
if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "✅ API服务器运行正常"
else
    echo "❌ 错误: API服务器未运行，请先执行 'npm run api'"
    exit 1
fi

# 检查前端服务器是否运行
echo "🔍 检查前端服务器状态..."
if curl -s http://localhost:5173 > /dev/null 2>&1; then
    echo "✅ 前端服务器运行正常"
else
    echo "❌ 错误: 前端服务器未运行，请先执行 'npm run dev'"
    exit 1
fi

# 创建截图目录
if [ ! -d "test-screenshots" ]; then
    mkdir -p test-screenshots
    echo "📁 创建截图目录: test-screenshots"
fi

# 运行测试
echo ""
echo "🧪 开始执行UI自动化测试..."
echo "=================================="
node test-dashboard-ui.cjs

# 检查测试结果
if [ $? -eq 0 ]; then
    echo ""
    echo "🎉 测试完成！所有测试通过"
    echo "📊 查看详细结果: dashboard-ui-test-results.json"
    echo "📸 查看测试截图: test-screenshots/"
else
    echo ""
    echo "❌ 测试失败，请查看错误信息"
    echo "📊 查看详细结果: dashboard-ui-test-results.json"
    echo "📸 查看测试截图: test-screenshots/"
fi

echo "=================================="
echo "✨ 测试脚本执行完成"