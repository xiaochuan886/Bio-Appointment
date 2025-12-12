@echo off
chcp 65001 >nul
setlocal enabledelayedexpansion

REM 工作台UI自动化测试运行脚本 (Windows版本)

echo 🚀 开始运行工作台UI自动化测试...
echo ==================================

REM 检查Node.js是否安装
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: Node.js未安装，请先安装Node.js
    pause
    exit /b 1
)

REM 检查npm是否安装
npm --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: npm未安装，请先安装npm
    pause
    exit /b 1
)

REM 检查Playwright是否安装
npm list playwright >nul 2>&1
if errorlevel 1 (
    echo ⚠️  警告: Playwright未安装，正在安装...
    npm install playwright
    echo 📦 安装Playwright浏览器...
    npx playwright install
)

REM 检查API服务器是否运行
echo 🔍 检查API服务器状态...
curl -s http://localhost:3001/api/health >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: API服务器未运行，请先执行 'npm run api'
    pause
    exit /b 1
)
echo ✅ API服务器运行正常

REM 检查前端服务器是否运行
echo 🔍 检查前端服务器状态...
curl -s http://localhost:5173 >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 前端服务器未运行，请先执行 'npm run dev'
    pause
    exit /b 1
)
echo ✅ 前端服务器运行正常

REM 创建截图目录
if not exist "test-screenshots" (
    mkdir test-screenshots
    echo 📁 创建截图目录: test-screenshots
)

REM 运行测试
echo.
echo 🧪 开始执行UI自动化测试...
echo ==================================
node test-dashboard-ui.cjs

REM 检查测试结果
if errorlevel 1 (
    echo.
    echo ❌ 测试失败，请查看错误信息
    echo 📊 查看详细结果: dashboard-ui-test-results.json
    echo 📸 查看测试截图: test-screenshots\
) else (
    echo.
    echo 🎉 测试完成！所有测试通过
    echo 📊 查看详细结果: dashboard-ui-test-results.json
    echo 📸 查看测试截图: test-screenshots\
)

echo ==================================
echo ✨ 测试脚本执行完成
pause