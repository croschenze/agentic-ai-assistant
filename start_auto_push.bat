@echo off
echo ===== 启动自动Git推送服务 =====
echo.

:: 检查 PowerShell 是否可用
powershell -Command "$PSVersionTable.PSVersion" > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] PowerShell 不可用！
    echo 请确保您的系统已安装 PowerShell。
    pause
    exit /b 1
)

:: 检查 Git 是否已安装
git --version > nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [错误] Git 未安装或未添加到系统路径！
    echo.
    
    :: 尝试查找常见的 Git 安装位置
    set GIT_PATHS=C:\Program Files\Git\cmd;C:\Program Files (x86)\Git\cmd;D:\Git\cmd;D:\Cros Thesis\Git\cmd
    
    for %%p in (%GIT_PATHS%) do (
        if exist "%%p\git.exe" (
            echo [信息] 在 %%p 找到 Git，正在尝试使用...
            set "PATH=%%p;%PATH%"
            goto :check_git_again
        )
    )
    
    :: 询问用户 Git 安装路径
    echo 请输入 Git 安装路径（例如：D:\Cros Thesis\Git）：
    set /p GIT_INSTALL_PATH=
    
    if exist "%GIT_INSTALL_PATH%\cmd\git.exe" (
        echo [信息] 在 %GIT_INSTALL_PATH%\cmd 找到 Git，正在尝试使用...
        set "PATH=%GIT_INSTALL_PATH%\cmd;%PATH%"
    ) else if exist "%GIT_INSTALL_PATH%\bin\git.exe" (
        echo [信息] 在 %GIT_INSTALL_PATH%\bin 找到 Git，正在尝试使用...
        set "PATH=%GIT_INSTALL_PATH%\bin;%PATH%"
    ) else (
        echo [错误] 在指定路径未找到 Git！
        echo 请参考 git-setup-guide.md 文件中的说明安装 Git 或添加到系统路径。
        pause
        exit /b 1
    )
    
    :check_git_again
    git --version > nul 2>&1
    if %ERRORLEVEL% neq 0 (
        echo [错误] 仍然无法找到 Git！
        echo 请参考 git-setup-guide.md 文件中的说明安装 Git 或添加到系统路径。
        pause
        exit /b 1
    )
)

:: 检查是否已经初始化 Git 仓库
if not exist ".git" (
    echo [错误] 当前目录不是 Git 仓库！
    echo 请先运行 init_git_repo.bat 初始化 Git 仓库。
    pause
    exit /b 1
)

:: 启动自动推送脚本
echo [信息] 正在启动自动 Git 推送服务...
echo [信息] 按 Ctrl+C 可以停止服务。
echo.

powershell -ExecutionPolicy Bypass -File "%~dp0auto_push.ps1"

pause