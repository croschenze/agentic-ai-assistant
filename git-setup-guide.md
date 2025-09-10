# Git 安装与仓库设置指南

本指南将帮助您安装 Git，初始化仓库，并设置实时推送到远程仓库。

## 1. 安装 Git

### Windows 系统

1. 访问 Git 官方网站下载页面：https://git-scm.com/download/win
2. 下载适合您系统的 Git 安装程序（通常选择 64-bit Git for Windows Setup）
3. 运行下载的安装程序，按照向导进行安装：
   - 接受许可协议
   - 选择安装位置（建议使用默认位置）
   - 选择组件（建议保持默认选项）
   - 选择开始菜单文件夹（建议使用默认）
   - 选择默认编辑器（推荐选择您熟悉的编辑器，如 VS Code）
   - 调整 PATH 环境（推荐选择"Git from the command line and also from 3rd-party software"）
   - 选择 HTTPS 传输后端（推荐使用默认的 OpenSSL）
   - 配置行尾处理（推荐 Windows 用户选择"Checkout Windows-style, commit Unix-style line endings"）
   - 配置终端模拟器（推荐使用默认的 MinTTY）
   - 配置 git pull 行为（推荐使用默认的 fast-forward or merge）
   - 选择凭据管理器（推荐 Windows 用户选择 Git Credential Manager）
   - 配置额外选项（推荐保持默认）
   - 配置实验性选项（推荐不启用）
4. 完成安装

### 验证安装

安装完成后，打开命令提示符或 PowerShell，输入以下命令验证 Git 是否安装成功：

```powershell
git --version
```

如果显示 Git 版本号，则表示安装成功。

### 添加 Git 到环境变量

如果您在安装时没有选择将 Git 添加到 PATH 环境变量，或者 Git 安装在自定义位置（如 `D:\Cros Thesis\Git`），您需要手动将 Git 添加到系统环境变量：

1. 右键点击"此电脑"或"我的电脑"，选择"属性"
2. 点击"高级系统设置"
3. 点击"环境变量"按钮
4. 在"系统变量"部分，找到并选择"Path"变量，然后点击"编辑"
5. 点击"新建"，添加 Git 的 bin 目录路径，例如：
   - `D:\Cros Thesis\Git\bin`
   - `D:\Cros Thesis\Git\cmd`
6. 点击"确定"保存所有更改
7. 重新打开命令提示符或 PowerShell，再次尝试 `git --version` 命令

如果您使用的是 Git Bash，可以直接使用 Git Bash 终端而不需要将 Git 添加到系统 PATH。

## 2. 配置 Git 用户信息

在使用 Git 之前，需要配置您的用户名和邮箱：

```powershell
git config --global user.name "您的名字"
git config --global user.email "您的邮箱"
```

## 3. 创建 GitHub 账户（如果尚未创建）

1. 访问 GitHub 网站：https://github.com/
2. 点击"Sign up"按钮
3. 按照提示填写用户名、邮箱和密码
4. 完成验证步骤
5. 选择免费计划
6. 完成账户设置

## 4. 创建新的 GitHub 仓库

1. 登录 GitHub 账户
2. 点击右上角的"+"图标，选择"New repository"
3. 填写仓库名称（例如：Thesis--Designer-s-Agentic-AI）
4. 添加描述（可选）
5. 选择仓库可见性（公开或私有）
6. 不要勾选"Initialize this repository with a README"
7. 点击"Create repository"按钮

## 5. 在本地初始化 Git 仓库并推送到 GitHub

完成上述步骤后，您将看到 GitHub 提供的命令指南。按照以下步骤操作：

```powershell
# 进入项目目录
cd "C:\Users\Cros\Documents\GitHub\Thesis--Designer-s-Agentic-AI"

# 初始化 Git 仓库
git init

# 添加所有文件到暂存区
git add .

# 提交更改
git commit -m "初始提交"

# 添加远程仓库
git remote add origin https://github.com/您的用户名/Thesis--Designer-s-Agentic-AI.git

# 推送到远程仓库
git push -u origin master
```

注意：如果您的默认分支是 `main` 而不是 `master`，请将最后一条命令中的 `master` 替换为 `main`。

## 6. 设置自动推送脚本

为了实现实时推送，您可以创建一个自动推送脚本。以下是一个简单的 PowerShell 脚本示例：

```powershell
# 文件名：auto-push.ps1

$repoPath = "C:\Users\Cros\Documents\GitHub\Thesis--Designer-s-Agentic-AI"
cd $repoPath

while ($true) {
    git add .
    git commit -m "自动更新 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    git push
    Write-Host "已推送更新 - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Start-Sleep -Seconds 300  # 每5分钟推送一次
}
```

将此脚本保存为 `auto-push.ps1`，然后在 PowerShell 中运行：

```powershell
.\auto-push.ps1
```

您也可以调整脚本中的时间间隔（`Start-Sleep -Seconds 300`）来更改推送频率。

## 7. 使用 Git 钩子实现自动推送

另一种方法是使用 Git 钩子来实现文件更改时自动推送：

1. 进入项目的 Git 钩子目录：

```powershell
cd "C:\Users\Cros\Documents\GitHub\Thesis--Designer-s-Agentic-AI\.git\hooks"
```

2. 创建 `post-commit` 钩子文件（无扩展名）：

```powershell
New-Item -Path post-commit -ItemType File -Force
```

3. 编辑 `post-commit` 文件，添加以下内容：

```bash
#!/bin/sh
git push origin master  # 或 main，取决于您的默认分支
```

4. 使钩子文件可执行（在 PowerShell 中）：

```powershell
icacls post-commit /grant Everyone:F
```

这样，每次提交后都会自动推送到远程仓库。

## 8. 使用 VS Code 的 Git 自动同步功能

如果您使用 Visual Studio Code 编辑器：

1. 安装 VS Code：https://code.visualstudio.com/
2. 打开项目文件夹
3. 在 VS Code 中，转到设置（File > Preferences > Settings）
4. 搜索 "git.autofetch" 并启用
5. 搜索 "git.autoPush" 并启用

这样，VS Code 将自动推送您的更改到远程仓库。

## 注意事项

- 实时推送可能会导致频繁的提交历史记录
- 确保不要将敏感信息（如密码、API 密钥等）提交到仓库
- 考虑使用 `.gitignore` 文件排除不需要版本控制的文件
- 如果多人协作，频繁推送可能会导致冲突，需要谨慎处理