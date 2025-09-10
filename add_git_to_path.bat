@echo off
echo ===== 自动添加Git到系统环境变量 =====
echo.
echo [重要] 此操作需要管理员权限来修改系统环境变量。
echo [提示] 如果出现用户账户控制(UAC)提示，请点击"是"。
echo.
pause

:: 检查管理员权限
net session >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [信息] 正在请求管理员权限...
    echo.
    
    :: 以管理员权限重新运行PowerShell脚本
    powershell -Command "Start-Process PowerShell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0add_git_to_path.ps1\"' -Verb RunAs"
    
    if %ERRORLEVEL% equ 0 (
        echo [信息] 已启动管理员权限的PowerShell脚本。
        echo [提示] 请在新打开的PowerShell窗口中完成操作。
    ) else (
        echo [错误] 无法获取管理员权限！
        echo [提示] 请手动按照git-setup-guide.md中的说明操作。
    )
) else (
    echo [信息] 已具有管理员权限，正在执行脚本...
    powershell -ExecutionPolicy Bypass -File "%~dp0add_git_to_path.ps1"
)

echo.
echo 操作完成后，您可以运行 init_git_repo.bat 来初始化Git仓库。
pause