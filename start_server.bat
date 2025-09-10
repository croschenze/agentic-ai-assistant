@echo off
chcp 65001 >nul
cd /d "%~dp0"

echo ================================================================
echo 🧪 实验测试平台启动器 (Windows批处理版本)
echo ================================================================
echo.

echo 📁 当前目录: %CD%
echo.

echo 🔍 检查Python环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ 未找到Python，尝试python3...
    python3 --version >nul 2>&1
    if %errorlevel% neq 0 (
        echo ❌ 未找到Python环境
        echo 请安装Python 3.6+或使用其他启动方式
        echo.
        echo 📋 其他启动方式:
        echo    1. 安装VS Code Live Server扩展
        echo    2. 使用Node.js: npm install -g http-server && http-server -p 8000
        echo    3. 手动运行PowerShell脚本
        echo.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=python3
    )
) else (
    set PYTHON_CMD=python
)

echo ✅ Python环境检查通过
echo.

echo 🚀 启动HTTP服务器...
echo 💡 提示: 按Ctrl+C停止服务器
echo ================================================================
echo.

%PYTHON_CMD% start_server.py

if %errorlevel% neq 0 (
    echo.
    echo ❌ 启动失败，尝试备用方案...
    echo 🔄 使用Python内置服务器...
    echo.
    echo 📋 手动访问地址:
    echo    🧙 巫师端: http://localhost:8000/wizard.html
    echo    👤 受测者端: http://localhost:8000/participant.html
    echo.
    
    start "" "http://localhost:8000/wizard.html"
    start "" "http://localhost:8000/participant.html"
    
    %PYTHON_CMD% -m http.server 8000
)

echo.
echo 🛑 服务器已停止
pause