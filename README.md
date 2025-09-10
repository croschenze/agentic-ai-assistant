# 实验测试平台部署指南

这是一个基于Web的实验测试平台，包含巫师端和受测者端两个界面，用于进行跨平台的实验研究。

## 系统要求

- Python 3.6+ 或 Node.js 12+
- 现代浏览器（Chrome、Firefox、Safari、Edge）
- 网络连接（用于Firebase服务）

## 快速启动

### 方法1：使用Python启动脚本（推荐）

```bash
python start_server.py
```

### 方法2：手动启动

#### 使用Python内置服务器
```bash
# 在项目根目录执行
python -m http.server 8000
# 或者
python3 -m http.server 8000
```

#### 使用Node.js http-server
```bash
# 首先安装http-server
npm install -g http-server

# 启动服务器
http-server -p 8000
```

#### 使用PowerShell（Windows）
```powershell
# 创建简单HTTP服务器
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add('http://localhost:8000/')
$listener.Start()
Write-Host 'Server started at http://localhost:8000/'

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    $localPath = $request.Url.LocalPath
    
    if ($localPath -eq '/') { $localPath = '/index.html' }
    $filePath = Join-Path $PWD $localPath.TrimStart('/')
    
    if (Test-Path $filePath) {
        $content = Get-Content $filePath -Raw -Encoding UTF8
        $buffer = [System.Text.Encoding]::UTF8.GetBytes($content)
        $response.ContentLength64 = $buffer.Length
        $response.OutputStream.Write($buffer, 0, $buffer.Length)
    } else {
        $response.StatusCode = 404
    }
    
    $response.Close()
}
```

## 访问地址

服务器启动后，在浏览器中访问：

- **巫师端（实验控制端）**: http://localhost:8000/wizard.html
- **受测者端（参与者端）**: http://localhost:8000/participant.html
- **调试页面**: http://localhost:8000/debug-*.html

## 使用VS Code Live Server扩展（推荐）

1. 在VS Code中安装"Live Server"扩展
2. 右键点击任意HTML文件
3. 选择"Open with Live Server"
4. 自动在浏览器中打开页面

## 功能说明

### 巫师端功能
- 创建和管理实验会话
- 发送消息和文件给受测者
- 监控受测者状态
- 文件上传和分享

### 受测者端功能
- 加入实验会话
- 接收巫师端消息和文件
- 上传文件给巫师端
- 实时通信

## 故障排除

### 常见问题

1. **CORS错误**
   - 确保通过HTTP服务器访问，不要直接打开HTML文件
   - 检查浏览器控制台是否有跨域错误

2. **Firebase连接问题**
   - 检查网络连接
   - 确认Firebase配置正确

3. **文件上传失败**
   - 检查文件大小限制
   - 确认服务器正常运行

4. **页面无法加载**
   - 确认服务器在8000端口运行
   - 检查防火墙设置

### 调试模式

访问以下调试页面进行问题诊断：
- http://localhost:8000/debug-communication.html - 通信调试
- http://localhost:8000/debug-firebase-connection.html - Firebase连接测试
- http://localhost:8000/debug-session-sync.html - 会话同步测试

## 开发说明

### 项目结构
```
├── wizard.html              # 巫师端主页面
├── participant.html         # 受测者端主页面
├── wizard-script.js         # 巫师端逻辑
├── participant-script.js    # 受测者端逻辑
├── communication.js         # 通信模块
├── firebase-comm.js         # Firebase通信
├── hybrid-storage.js        # 混合存储
├── large-file-handler.js    # 大文件处理
└── debug-*.html            # 调试页面
```

### 技术栈
- 前端：原生JavaScript、HTML5、CSS3
- 通信：Firebase Realtime Database
- 文件处理：File API、IndexedDB
- 实时通信：WebRTC（计划中）

## 许可证

本项目仅用于学术研究目的。