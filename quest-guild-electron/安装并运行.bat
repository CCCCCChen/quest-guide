@echo off
chcp 65001 >nul
echo ========================================
echo   悬赏任务公会 - 快速安装脚本
echo ========================================
echo.

echo [1/3] 检查 Node.js 环境...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo 错误: 未检测到 Node.js，请先安装 Node.js 16+ 版本
    echo 下载地址: https://nodejs.org/
    pause
    exit /b 1
)
echo ✓ Node.js 已安装
echo.

echo [2/3] 安装项目依赖...
call npm install
if %errorlevel% neq 0 (
    echo 错误: 依赖安装失败
    pause
    exit /b 1
)
echo ✓ 依赖安装完成
echo.

echo [3/3] 启动应用...
echo.
call npm start

pause
