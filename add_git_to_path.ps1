# 自动将Git添加到系统环境变量的PowerShell脚本
# 需要以管理员权限运行

# 检查是否以管理员权限运行
if (-NOT ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {
    Write-Host "[错误] 此脚本需要管理员权限才能修改系统环境变量！" -ForegroundColor Red
    Write-Host "请右键点击PowerShell，选择'以管理员身份运行'，然后重新执行此脚本。" -ForegroundColor Yellow
    Write-Host "或者按任意键退出，手动按照git-setup-guide.md中的说明操作。" -ForegroundColor Cyan
    Read-Host
    exit 1
}

Write-Host "===== 自动添加Git到系统环境变量 =====" -ForegroundColor Green
Write-Host

# 常见的Git安装路径
$commonGitPaths = @(
    "C:\Program Files\Git",
    "C:\Program Files (x86)\Git",
    "D:\Git",
    "D:\Cros Thesis\Git"
)

# 查找Git安装路径
$gitInstallPath = $null
foreach ($path in $commonGitPaths) {
    if (Test-Path "$path\cmd\git.exe" -or Test-Path "$path\bin\git.exe") {
        $gitInstallPath = $path
        Write-Host "[信息] 在 $path 找到Git安装" -ForegroundColor Cyan
        break
    }
}

# 如果没有找到，询问用户
if (-not $gitInstallPath) {
    Write-Host "[提示] 未在常见位置找到Git安装，请输入Git安装路径：" -ForegroundColor Yellow
    Write-Host "例如：D:\Cros Thesis\Git" -ForegroundColor Gray
    $userPath = Read-Host "Git安装路径"
    
    if (Test-Path "$userPath\cmd\git.exe" -or Test-Path "$userPath\bin\git.exe") {
        $gitInstallPath = $userPath
        Write-Host "[信息] 确认Git安装在 $userPath" -ForegroundColor Cyan
    } else {
        Write-Host "[错误] 在指定路径未找到Git！请检查路径是否正确。" -ForegroundColor Red
        Read-Host "按任意键退出"
        exit 1
    }
}

# 确定要添加的路径
$pathsToAdd = @()
if (Test-Path "$gitInstallPath\cmd\git.exe") {
    $pathsToAdd += "$gitInstallPath\cmd"
}
if (Test-Path "$gitInstallPath\bin\git.exe") {
    $pathsToAdd += "$gitInstallPath\bin"
}

if ($pathsToAdd.Count -eq 0) {
    Write-Host "[错误] 在Git安装目录中未找到git.exe！" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

Write-Host "[信息] 准备添加以下路径到系统环境变量：" -ForegroundColor Cyan
foreach ($path in $pathsToAdd) {
    Write-Host "  - $path" -ForegroundColor Gray
}
Write-Host

# 获取当前系统PATH环境变量
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$pathArray = $currentPath -split ';'

# 检查路径是否已存在
$newPaths = @()
foreach ($path in $pathsToAdd) {
    if ($pathArray -notcontains $path) {
        $newPaths += $path
        Write-Host "[信息] 将添加新路径: $path" -ForegroundColor Green
    } else {
        Write-Host "[信息] 路径已存在: $path" -ForegroundColor Yellow
    }
}

if ($newPaths.Count -eq 0) {
    Write-Host "[信息] 所有Git路径都已在系统环境变量中，无需添加。" -ForegroundColor Green
} else {
    # 添加新路径
    $newPath = $currentPath + ";" + ($newPaths -join ";")
    
    try {
        [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
        Write-Host "[成功] 已成功将Git路径添加到系统环境变量！" -ForegroundColor Green
        Write-Host "[提示] 请重新打开命令提示符或PowerShell以使更改生效。" -ForegroundColor Cyan
    } catch {
        Write-Host "[错误] 添加环境变量失败: $_" -ForegroundColor Red
        Write-Host "[提示] 请手动按照git-setup-guide.md中的说明操作。" -ForegroundColor Yellow
    }
}

Write-Host
Write-Host "===== 操作完成 =====" -ForegroundColor Green
Write-Host "现在可以尝试运行 init_git_repo.bat 来初始化Git仓库。" -ForegroundColor Cyan
Write-Host
Read-Host "按任意键退出"