@echo off
echo ===== Git 仓库初始化脚本 =====
echo.

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

echo [信息] Git 已安装，版本信息：
git --version
echo.

:: 检查是否已经初始化 Git 仓库
if exist ".git" (
    echo [信息] Git 仓库已经初始化。
) else (
    echo [信息] 正在初始化 Git 仓库...
    git init
    echo [成功] Git 仓库初始化完成。
)
echo.

:: 配置用户信息
echo ===== 配置 Git 用户信息 =====
set /p GIT_USERNAME=请输入您的 Git 用户名（例如：张三）：
set /p GIT_EMAIL=请输入您的 Git 邮箱（例如：zhangsan@example.com）：

git config --global user.name "%GIT_USERNAME%"
git config --global user.email "%GIT_EMAIL%"

echo [成功] Git 用户信息配置完成。
echo.

:: 添加远程仓库
echo ===== 配置远程仓库 =====
set /p REMOTE_URL=请输入远程仓库地址（例如：https://github.com/username/repo.git）：

git remote -v > nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [信息] 远程仓库已配置：
    git remote -v
    
    set /p RESET_REMOTE=是否重置远程仓库地址？(y/n)：
    if /i "%RESET_REMOTE%"=="y" (
        git remote remove origin
        git remote add origin %REMOTE_URL%
        echo [成功] 远程仓库地址已重置。
    )
) else (
    git remote add origin %REMOTE_URL%
    echo [成功] 远程仓库配置完成。
)
echo.

:: 添加文件并提交
echo ===== 添加文件并提交 =====
git add .
echo [信息] 已添加所有文件到暂存区。

set /p COMMIT_MESSAGE=请输入提交信息（默认：初始提交）：
if "%COMMIT_MESSAGE%"=="" set COMMIT_MESSAGE=初始提交

git commit -m "%COMMIT_MESSAGE%"
echo [成功] 文件已提交到本地仓库。
echo.

:: 推送到远程仓库
echo ===== 推送到远程仓库 =====
set /p DEFAULT_BRANCH=请输入默认分支名（默认：main）：
if "%DEFAULT_BRANCH%"=="" set DEFAULT_BRANCH=main

echo [信息] 正在推送到远程仓库的 %DEFAULT_BRANCH% 分支...
git push -u origin %DEFAULT_BRANCH%

if %ERRORLEVEL% equ 0 (
    echo [成功] 文件已成功推送到远程仓库。
) else (
    echo [警告] 推送失败，可能需要先拉取远程仓库或解决冲突。
    echo 您可以尝试执行：git pull --rebase origin %DEFAULT_BRANCH%
    echo 然后再次执行：git push -u origin %DEFAULT_BRANCH%
)
echo.

echo ===== Git 仓库初始化完成 =====
echo 请参考 git-setup-guide.md 文件了解如何设置自动推送。
echo.

pause