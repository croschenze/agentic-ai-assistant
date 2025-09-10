# 自动Git推送脚本
# 此脚本监控文件变化并自动提交和推送到远程仓库

# 配置项
$repoPath = "C:\Users\Cros\Documents\GitHub\Thesis--Designer-s-Agentic-AI" # 仓库路径
$interval = 300 # 检查间隔（秒）
$branch = "main" # 默认分支名

# 切换到仓库目录
Set-Location -Path $repoPath

# 检查Git是否已安装
try {
    $gitVersion = git --version
    Write-Host "[信息] 使用的Git版本: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "[错误] Git未安装或未添加到系统路径！" -ForegroundColor Red
    
    # 尝试查找常见的Git安装位置
    $commonPaths = @(
        "C:\Program Files\Git\cmd",
        "C:\Program Files (x86)\Git\cmd",
        "D:\Git\cmd",
        "D:\Cros Thesis\Git\cmd",
        "D:\Cros Thesis\Git\bin"
    )
    
    $gitFound = $false
    foreach ($path in $commonPaths) {
        if (Test-Path "$path\git.exe") {
            Write-Host "[信息] 在 $path 找到Git，正在尝试使用..." -ForegroundColor Cyan
            $env:Path = "$path;$env:Path"
            $gitFound = $true
            break
        }
    }
    
    if (-not $gitFound) {
        Write-Host "[提示] 请输入Git安装路径（例如：D:\Cros Thesis\Git）：" -ForegroundColor Yellow
        $gitPath = Read-Host
        
        if (Test-Path "$gitPath\cmd\git.exe") {
            Write-Host "[信息] 在 $gitPath\cmd 找到Git，正在尝试使用..." -ForegroundColor Cyan
            $env:Path = "$gitPath\cmd;$env:Path"
        } elseif (Test-Path "$gitPath\bin\git.exe") {
            Write-Host "[信息] 在 $gitPath\bin 找到Git，正在尝试使用..." -ForegroundColor Cyan
            $env:Path = "$gitPath\bin;$env:Path"
        } else {
            Write-Host "[错误] 在指定路径未找到Git！" -ForegroundColor Red
            Write-Host "请参考 git-setup-guide.md 文件中的安装说明。" -ForegroundColor Yellow
            exit 1
        }
    }
    
    # 再次检查Git是否可用
    try {
        $gitVersion = git --version
        Write-Host "[信息] 使用的Git版本: $gitVersion" -ForegroundColor Green
    } catch {
        Write-Host "[错误] 仍然无法找到Git！请参考 git-setup-guide.md 文件中的安装说明。" -ForegroundColor Red
        exit 1
    }
}

# 检查是否是Git仓库
if (-not (Test-Path -Path ".git" -PathType Container)) {
    Write-Host "[错误] 当前目录不是Git仓库！请先初始化Git仓库。" -ForegroundColor Red
    Write-Host "可以运行 init_git_repo.bat 脚本初始化仓库。" -ForegroundColor Yellow
    exit 1
}

# 检查远程仓库配置
$remoteConfig = git remote -v
if (-not $remoteConfig) {
    Write-Host "[警告] 未配置远程仓库！自动推送将不会生效。" -ForegroundColor Yellow
    Write-Host "请先配置远程仓库，可以运行 init_git_repo.bat 脚本配置。" -ForegroundColor Yellow
}

# 定义自动推送函数
function Auto-Push {
    # 获取当前状态
    $status = git status --porcelain
    
    # 如果有变化，则提交并推送
    if ($status) {
        $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        Write-Host "[信息] 检测到文件变化，准备提交... ($timestamp)" -ForegroundColor Cyan
        
        # 添加所有变化
        git add .
        
        # 提交变化
        git commit -m "自动更新 - $timestamp"
        
        # 推送到远程仓库
        try {
            git push origin $branch
            Write-Host "[成功] 已推送更新到远程仓库 ($timestamp)" -ForegroundColor Green
        } catch {
            Write-Host "[错误] 推送失败: $_" -ForegroundColor Red
            Write-Host "[提示] 尝试先拉取远程更改..." -ForegroundColor Yellow
            
            try {
                git pull --rebase origin $branch
                git push origin $branch
                Write-Host "[成功] 拉取并推送成功" -ForegroundColor Green
            } catch {
                Write-Host "[错误] 拉取并推送失败: $_" -ForegroundColor Red
                Write-Host "[提示] 可能需要手动解决冲突" -ForegroundColor Yellow
            }
        }
    } else {
        Write-Host "[信息] 没有检测到文件变化 ($(Get-Date -Format "HH:mm:ss"))" -ForegroundColor Gray
    }
}

# 主循环
Write-Host "===== 自动Git推送服务已启动 =====" -ForegroundColor Green
Write-Host "监控目录: $repoPath" -ForegroundColor Cyan
Write-Host "检查间隔: $interval 秒" -ForegroundColor Cyan
Write-Host "目标分支: $branch" -ForegroundColor Cyan
Write-Host "按 Ctrl+C 停止服务" -ForegroundColor Yellow
Write-Host "===================================" -ForegroundColor Green

try {
    while ($true) {
        Auto-Push
        Start-Sleep -Seconds $interval
    }
} finally {
    Write-Host "\n===== 自动Git推送服务已停止 =====" -ForegroundColor Yellow
}