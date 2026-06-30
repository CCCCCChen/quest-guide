@echo off
chcp 65001 >nul
echo ========================================
echo   悬赏任务公会 - 打包成 EXE
echo ========================================
echo.

echo [1/2] 检查依赖...
if not exist "node_modules" (
    echo 正在安装依赖...
    call npm install
    if %errorlevel% neq 0 (
        echo 错误: 依赖安装失败
        pause
        exit /b 1
    )
)
echo ✓ 依赖已就绪
echo.

echo [2/2] 开始打包...
echo 这可能需要几分钟时间，请耐心等待...
echo.
call npm run build:win

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo   ✓ 打包完成！
    echo   输出目录: dist\
    echo ========================================
) else (
    echo.
    echo ✗ 打包失败，请检查错误信息
)

echo.
pause
