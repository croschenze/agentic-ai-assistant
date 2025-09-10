#!/usr/bin/env python3 222
# -*- coding: utf-8 -*-
"""
实验测试平台启动脚本
自动启动HTTP服务器并打开浏览器页面
"""

import http.server
import socketserver
import webbrowser
import threading
import time
import os
import sys
from pathlib import Path

# 配置
PORT = 8000
HOST = 'localhost'
BASE_URL = f'http://{HOST}:{PORT}'

# 页面URL
WIZARD_URL = f'{BASE_URL}/wizard.html'
PARTICIPANT_URL = f'{BASE_URL}/participant.html'

class CustomHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    """自定义HTTP请求处理器，添加CORS支持"""
    
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def log_message(self, format, *args):
        """自定义日志格式"""
        timestamp = time.strftime('%Y-%m-%d %H:%M:%S')
        print(f'[{timestamp}] {format % args}')

def check_port_available(port):
    """检查端口是否可用"""
    import socket
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        try:
            s.bind(('localhost', port))
            return True
        except OSError:
            return False

def open_browser_pages():
    """延迟打开浏览器页面"""
    time.sleep(2)  # 等待服务器启动
    
    print(f"\n🚀 正在打开浏览器页面...")
    
    try:
        # 打开巫师端页面
        webbrowser.open(WIZARD_URL)
        print(f"✅ 巫师端页面: {WIZARD_URL}")
        
        time.sleep(1)
        
        # 打开受测者端页面
        webbrowser.open(PARTICIPANT_URL)
        print(f"✅ 受测者端页面: {PARTICIPANT_URL}")
        
    except Exception as e:
        print(f"❌ 打开浏览器失败: {e}")
        print(f"请手动访问以下地址:")
        print(f"   巫师端: {WIZARD_URL}")
        print(f"   受测者端: {PARTICIPANT_URL}")

def start_server():
    """启动HTTP服务器"""
    # 检查当前目录
    current_dir = Path.cwd()
    print(f"📁 当前工作目录: {current_dir}")
    
    # 检查关键文件是否存在
    required_files = ['wizard.html', 'participant.html', 'wizard-script.js', 'participant-script.js']
    missing_files = []
    
    for file in required_files:
        if not Path(file).exists():
            missing_files.append(file)
    
    if missing_files:
        print(f"❌ 缺少必要文件: {', '.join(missing_files)}")
        print("请确保在正确的项目目录中运行此脚本")
        return False
    
    # 检查端口是否可用
    if not check_port_available(PORT):
        print(f"❌ 端口 {PORT} 已被占用")
        print(f"请尝试以下解决方案:")
        print(f"1. 关闭占用端口的程序")
        print(f"2. 修改脚本中的PORT变量使用其他端口")
        return False
    
    try:
        # 创建服务器
        with socketserver.TCPServer((HOST, PORT), CustomHTTPRequestHandler) as httpd:
            print(f"\n🌐 HTTP服务器启动成功!")
            print(f"📍 服务地址: {BASE_URL}")
            print(f"📂 服务目录: {current_dir}")
            print(f"\n📋 可用页面:")
            print(f"   🧙 巫师端 (实验控制): {WIZARD_URL}")
            print(f"   👤 受测者端 (参与者): {PARTICIPANT_URL}")
            print(f"\n🔧 调试页面:")
            print(f"   📡 通信调试: {BASE_URL}/debug-communication.html")
            print(f"   🔥 Firebase测试: {BASE_URL}/debug-firebase-connection.html")
            print(f"   🔄 会话同步: {BASE_URL}/debug-session-sync.html")
            print(f"\n💡 提示: 按 Ctrl+C 停止服务器")
            print(f"" + "="*60)
            
            # 在后台线程中打开浏览器
            browser_thread = threading.Thread(target=open_browser_pages, daemon=True)
            browser_thread.start()
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print(f"\n\n🛑 服务器已停止")
        print(f"感谢使用实验测试平台!")
        return True
    except Exception as e:
        print(f"❌ 服务器启动失败: {e}")
        return False

def main():
    """主函数"""
    print("="*60)
    print("🧪 实验测试平台启动器")
    print("="*60)
    
    # 检查Python版本
    if sys.version_info < (3, 6):
        print("❌ 需要Python 3.6或更高版本")
        sys.exit(1)
    
    # 启动服务器
    success = start_server()
    
    if not success:
        print("\n❌ 启动失败，请检查上述错误信息")
        sys.exit(1)

if __name__ == '__main__':
    main()