// Wizard-of-Oz 实验控制面板脚本

class WizardController {
    constructor() {
        this.sessions = new Map();
        this.currentSessionId = null;
        this.messageHistory = new Map();
        this.comm = null;
        this.sessionMessageListeners = []; // 存储会话级别的消息监听器
        this.listenedSessions = new Set(); // 跟踪已监听的会话，避免重复监听
        this.sessionUpdateDebounceTimers = new Map(); // 会话更新防抖定时器
        this.renderDebounceTimer = null; // 渲染防抖定时器
        this.fileUploadEventsSetup = false; // 防止重复绑定文件上传事件
    }

    async init() {
        // 初始化Firebase通信模块
        this.comm = new FirebaseComm();
        const initialized = await this.comm.initialize();
        
        if (!initialized) {
            console.error('Firebase通信模块初始化失败');
            alert('无法连接到服务器，请检查网络连接');
            return;
        }
        
        console.log('Firebase通信模块已准备就绪');
        
        debugLog('开始绑定事件');
        this.bindEvents();
        debugLog('事件绑定完成');
        
        debugLog('开始设置通信');
        this.setupCommunication();
        debugLog('通信设置完成');
        
        debugLog('开始加载会话');
        await this.loadSessions();
        debugLog('会话加载完成');
        
        debugLog('开始轮询');
        this.startPolling();
        debugLog('轮询启动完成');
        
        debugLog('准备设置文件上传功能');
        try {
            this.setupWizardFileUpload();
            debugLog('文件上传功能设置完成');
        } catch (error) {
            debugLog('文件上传功能设置失败: ' + error.message);
            console.error('setupWizardFileUpload error:', error);
        }
    }

    bindEvents() {
        // 新建会话
        document.getElementById('new-session-btn').addEventListener('click', async () => {
            await this.createNewSession();
        });

        // 加入会话
        document.getElementById('join-session-btn').addEventListener('click', async () => {
            await this.joinExistingSession();
        });

        // 加入会话输入框回车键支持
        document.getElementById('join-session-input').addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                await this.joinExistingSession();
            }
        });

        // 发送回复
        document.getElementById('send-reply-btn').addEventListener('click', async () => {
            await this.sendReply();
        });

        // 清空所有会话
        document.getElementById('clear-all-btn').addEventListener('click', () => {
            this.clearAllSessions();
        });

        // 复制被测者链接
        document.getElementById('copy-session-url').addEventListener('click', () => {
            this.copySessionUrl();
        });

        // 结束会话
        document.getElementById('end-session-btn').addEventListener('click', () => {
            this.endCurrentSession();
        });

        // 快速回复
        document.getElementById('quick-replies-btn').addEventListener('click', () => {
            this.showQuickReplies();
        });

        // Gemini助手
        document.getElementById('gemini-assist-btn').addEventListener('click', () => {
            this.openGeminiAssist();
        });

        // 简化的文件上传按钮
        document.getElementById('wizard-file-btn').addEventListener('click', () => {
            debugLog('文件上传按钮被点击');
            this.toggleSimpleFileUpload();
        });

        // 关闭模态框
        document.getElementById('close-modal').addEventListener('click', () => {
            this.hideQuickReplies();
        });

        // 输入框字符计数
        const wizardInput = document.getElementById('wizard-input');
        wizardInput.addEventListener('input', () => {
            this.updateCharCount();
        });

        // 快捷键支持
        wizardInput.addEventListener('keydown', async (e) => {
            if (e.key === 'Enter') {
                if (e.shiftKey) {
                    // Shift+Enter 换行，保持默认行为
                    return;
                } else {
                    // 单独按Enter发送消息
                    e.preventDefault();
                    await this.sendReply();
                }
            }
        });

        // 文件上传按钮已在上面绑定，这里删除重复绑定
        
        // 文件列表折叠按钮
        const toggleFilesBtn = document.getElementById('toggle-files-btn');
        if (toggleFilesBtn) {
            toggleFilesBtn.addEventListener('click', () => {
                this.toggleFilesList();
            });
        }
        
        // 文件拖拽区域
        const wizardFileDropZone = document.getElementById('wizard-file-drop-zone');
        if (wizardFileDropZone) {
            wizardFileDropZone.addEventListener('click', () => {
                debugLog('文件拖拽区域被点击，准备触发文件选择');
                const fileInput = document.getElementById('wizard-file-input');
                debugLog('文件输入框元素: ' + (fileInput ? '找到' : '未找到'));
                if (fileInput) {
                    debugLog('触发文件输入框点击事件');
                    fileInput.click();
                } else {
                    debugLog('错误: 找不到文件输入框元素');
                }
            });
            
            // 拖拽事件
            wizardFileDropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                wizardFileDropZone.style.borderColor = '#007bff';
                wizardFileDropZone.style.background = '#f0f8ff';
            });
            
            wizardFileDropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                wizardFileDropZone.style.borderColor = '#cbd5e0';
                wizardFileDropZone.style.background = '#f8f9fa';
            });
            
            wizardFileDropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                wizardFileDropZone.style.borderColor = '#cbd5e0';
                wizardFileDropZone.style.background = '#f8f9fa';
                
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    this.handleWizardFileUpload({ target: { files } });
                }
            });
        }
    }

    async createNewSession() {
        const sessionId = this.generateSessionId();
        const sessionData = {
            sessionId: sessionId,
            createdAt: new Date().toISOString(),
            status: 'active',
            participantConnected: false,
            messageCount: 0,
            participantMessages: [],
            aiResponses: []
        };

        // 使用Firebase创建会话
        const success = await this.comm.createSession(sessionId, sessionData);
        
        if (!success) {
            this.showNotification('创建会话失败，请重试', 'error');
            return;
        }

        // 保持本地会话映射以兼容现有逻辑
        this.sessions.set(sessionId, sessionData);
        this.messageHistory.set(sessionId, []);
        this.saveToStorage();
        this.debouncedRenderSessions();
        this.selectSession(sessionId);

        // 显示成功消息
        this.showNotification(`新会话 ${sessionId} 已创建`, 'success');
    }

    generateSessionId() {
        return 'WOZ-' + Math.random().toString(36).substr(2, 8).toUpperCase();
    }

    async joinExistingSession() {
        const input = document.getElementById('join-session-input');
        const sessionId = input.value.trim();
        
        console.log('开始加入会话:', sessionId);
        
        if (!sessionId) {
            this.showNotification('请输入会话ID', 'error');
            return;
        }
        
        // 验证会话ID格式
        if (!sessionId.startsWith('WOZ-') || sessionId.length !== 12) {
            this.showNotification('会话ID格式不正确，应为 WOZ-XXXXXXXX 格式', 'error');
            return;
        }
        
        try {
            // 检查会话是否存在
            console.log('检查会话是否存在:', sessionId);
            const sessionExists = await this.comm.sessionExists(sessionId);
            console.log('会话存在性检查结果:', sessionExists);
            if (!sessionExists) {
                this.showNotification(`会话 ${sessionId} 不存在`, 'error');
                return;
            }
            
            // 获取会话数据
            console.log('获取会话数据:', sessionId);
            const sessionData = await this.comm.getSessionData(sessionId);
            console.log('获取到的会话数据:', sessionData);
            if (!sessionData) {
                this.showNotification(`无法获取会话 ${sessionId} 的数据`, 'error');
                return;
            }
            
            // 构建会话对象，包含participantMessages用于状态判断
            const sessionObj = {
                sessionId: sessionId,
                createdAt: sessionData.createdAt,
                status: sessionData.status,
                participantConnected: sessionData.participantConnected || sessionData.participants?.participant || false,
                participantMessages: sessionData.participantMessages || [],
                aiResponses: sessionData.aiResponses || [],
                messageCount: (sessionData.participantMessages?.length || 0) + (sessionData.aiResponses?.length || 0)
            };
            
            // 合并所有消息并按时间排序
            const allMessages = [];
            if (sessionData.participantMessages) {
                allMessages.push(...sessionData.participantMessages);
            }
            if (sessionData.aiResponses) {
                allMessages.push(...sessionData.aiResponses);
            }
            allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            // 添加到本地会话列表
            console.log('添加会话到本地列表:', sessionObj);
            this.sessions.set(sessionId, sessionObj);
            this.messageHistory.set(sessionId, allMessages);
            console.log('当前会话总数:', this.sessions.size);
            
            // 保存数据并更新界面
            console.log('保存数据并更新界面');
            this.saveToStorage();
            this.debouncedRenderSessions();
            
            // 选择并加入会话
            console.log('选择并加入会话:', sessionId);
            await this.selectSession(sessionId);
            
            // 清空输入框
            input.value = '';
            
            // 显示成功消息
            this.showNotification(`已成功加入会话 ${sessionId}`, 'success');
            console.log('加入会话完成:', sessionId);
            
        } catch (error) {
            console.error('加入会话失败:', error);
            this.showNotification('加入会话失败，请重试', 'error');
        }
    }

    async selectSession(sessionId) {
        console.log('=== 选择会话 ===');
        console.log('会话ID:', sessionId);
        
        // 清理之前的监听器
        if (this.comm) {
            this.comm.removeAllListeners();
        }
        
        this.currentSessionId = sessionId;
        console.log('设置当前会话ID:', this.currentSessionId);
        
        // 加入Firebase会话并设置监听
        if (this.comm && sessionId) {
            console.log('尝试加入Firebase会话');
            const success = await this.comm.joinSession(sessionId);
            console.log('加入会话结果:', success);
            if (success) {
                // 设置实时监听
                console.log('设置通信监听');
                this.setupCommunication();
            } else {
                console.error('加入会话失败');
            }
        } else {
            console.error('通信模块或会话ID无效:', { comm: !!this.comm, sessionId });
        }
        
        await this.renderSessions(); // 初始加载时不使用防抖
        this.renderSessionDetail();
        this.saveData();
    }

     async renderSessions() {
        const sessionsList = document.getElementById('sessions-list');
        sessionsList.innerHTML = '';
        
        // 确保通信模块存储系统准备就绪
        if (this.comm && !this.comm.storageReady) {
            console.log('等待通信模块存储系统准备就绪...');
            while (!this.comm.storageReady) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        
        // 使用通信模块获取活跃会话
        const sessions = this.comm ? await this.comm.getActiveSessions() : [];
        console.log('renderSessions获取到的会话数据:', sessions);
        
        if (sessions.length === 0 && this.sessions.size === 0) {
            sessionsList.innerHTML = '<div class="empty-sessions">暂无会话</div>';
            return;
        }
        
        // 渲染通信模块中的会话
        sessions.forEach(session => {
            const sessionItem = document.createElement('div');
            sessionItem.className = `session-item ${session.sessionId === this.currentSessionId ? 'active' : ''}`;
            sessionItem.onclick = () => this.selectSession(session.sessionId);
            
            const lastMessage = session.participantMessages && session.participantMessages.length > 0 
                ? session.participantMessages[session.participantMessages.length - 1].content 
                : '暂无消息';
            
            const messageCount = (session.participantMessages || []).length;
            const responseCount = (session.aiResponses || []).length;
            
            sessionItem.innerHTML = `
                <div class="session-header">
                    <span class="session-id">${session.sessionId.substring(0, 12)}...</span>
                    <span class="session-time">${new Date(session.createdAt).toLocaleTimeString()}</span>
                    <span class="unread-indicator" style="display: none;">●</span>
                </div>
                <div class="session-preview">
                    ${lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage}
                </div>
                <div class="session-stats">
                    <span>消息: ${messageCount}</span>
                    <span>回复: ${responseCount}</span>
                </div>
            `;
            
            sessionsList.appendChild(sessionItem);
            
            // 异步检查是否有未读消息
            if (this.comm) {
                this.comm.hasUnreadMessages(session.sessionId).then(hasUnread => {
                    const unreadIndicator = sessionItem.querySelector('.unread-indicator');
                    if (hasUnread && unreadIndicator) {
                        sessionItem.classList.add('unread');
                        unreadIndicator.style.display = 'inline';
                    }
                }).catch(err => console.error('检查未读消息失败:', err));
            }
        });

        // 渲染本地会话（向后兼容）
        let localSessionsCount = 0;
        this.sessions.forEach((session, sessionId) => {
            // 跳过已经在通信模块中的会话
            if (sessions.some(s => s.sessionId === sessionId)) return;
            
            localSessionsCount++;
            const sessionItem = document.createElement('div');
            sessionItem.className = `session-item ${sessionId === this.currentSessionId ? 'active' : ''}`;
            sessionItem.onclick = () => this.selectSession(sessionId);

            const lastMessage = session.participantMessages && session.participantMessages.length > 0 
                ? session.participantMessages[session.participantMessages.length - 1].content 
                : '暂无消息';
            
            const messageCount = (session.participantMessages || []).length;
            const responseCount = (session.aiResponses || []).length;

            sessionItem.innerHTML = `
                <div class="session-header">
                    <span class="session-id">${sessionId.substring(0, 12)}...</span>
                    <span class="session-time">${new Date(session.createdAt || Date.now()).toLocaleTimeString()}</span>
                </div>
                <div class="session-preview">
                    ${lastMessage.length > 50 ? lastMessage.substring(0, 50) + '...' : lastMessage}
                </div>
                <div class="session-stats">
                    <span>消息: ${messageCount}</span>
                    <span>回复: ${responseCount}</span>
                </div>
            `;

            sessionsList.appendChild(sessionItem);
        });

        // 更新会话计数
        const totalSessions = sessions.length + localSessionsCount;
        console.log('更新会话计数 - 通信模块会话:', sessions.length, '本地会话:', localSessionsCount, '总计:', totalSessions);
        document.getElementById('session-count').textContent = `活跃会话: ${totalSessions}`;
    }

    renderSessionDetail() {
        const noSession = document.getElementById('no-session');
        const chatArea = document.getElementById('chat-area');
        const sessionTitle = document.getElementById('current-session-title');
        const copyBtn = document.getElementById('copy-session-url');
        const endBtn = document.getElementById('end-session-btn');
        const uploadedFilesSection = document.getElementById('uploaded-files-section');

        if (!this.currentSessionId) {
            noSession.style.display = 'flex';
            chatArea.style.display = 'none';
            copyBtn.style.display = 'none';
            endBtn.style.display = 'none';
            if (uploadedFilesSection) uploadedFilesSection.style.display = 'none';
            return;
        }

        // 尝试从通信模块获取会话数据
        let sessionData = null;
        if (this.comm) {
            sessionData = this.comm.getSessionData(this.currentSessionId);
        }
        
        // 回退到本地会话数据
        if (!sessionData) {
            const session = this.sessions.get(this.currentSessionId);
            if (!session) return;
            sessionData = session;
        }

        noSession.style.display = 'none';
        chatArea.style.display = 'flex';
        copyBtn.style.display = 'inline-block';
        endBtn.style.display = 'inline-block';

        const status = sessionData.status || (sessionData.participantMessages && sessionData.participantMessages.length > 0 ? '进行中' : '等待被测者连接');
        sessionTitle.textContent = `会话 ${this.currentSessionId.substring(0, 12)}... - ${status}`;

        // 显示上传的文件
        this.loadAndRenderFiles(uploadedFilesSection);

        this.renderMessages();
    }

    renderMessages() {
        const messagesContainer = document.getElementById('messages-container');
        
        if (!this.currentSessionId) {
            messagesContainer.innerHTML = '';
            return;
        }
        
        // 优先使用本地消息历史
        const messages = this.messageHistory.get(this.currentSessionId) || [];
        
        messagesContainer.innerHTML = '';

        if (messages.length === 0) {
            messagesContainer.innerHTML = `
                <div class="empty-messages">
                    <p>等待被测者发送第一条消息...</p>
                    <p>被测者链接: <strong>${this.getParticipantUrl()}</strong></p>
                </div>
            `;
            return;
        }

        console.log(`渲染会话 ${this.currentSessionId} 的 ${messages.length} 条消息`);

        messages.forEach(message => {
            const messageDiv = document.createElement('div');
            messageDiv.className = `message ${message.sender}`;

            // 创建头像
            const avatarDiv = document.createElement('div');
            avatarDiv.className = 'message-avatar';
            avatarDiv.textContent = message.sender === 'participant' ? 'P' : 'W';
            messageDiv.appendChild(avatarDiv);
            
            // 创建消息内容容器
            const contentContainer = document.createElement('div');
            contentContainer.className = 'message-content';
            
            const bubbleDiv = document.createElement('div');
            bubbleDiv.className = 'message-bubble';
            bubbleDiv.textContent = message.content;
            
            const time = new Date(message.timestamp).toLocaleTimeString();
            const timeDiv = document.createElement('div');
            timeDiv.className = 'message-time';
            timeDiv.textContent = time;
            
            contentContainer.appendChild(bubbleDiv);
            if (message.currentUrl) {
                const urlDiv = document.createElement('div');
                urlDiv.className = 'message-url';
                urlDiv.textContent = `页面: ${message.currentUrl}`;
                contentContainer.appendChild(urlDiv);
            }
            contentContainer.appendChild(timeDiv);
            messageDiv.appendChild(contentContainer);

            messagesContainer.appendChild(messageDiv);
        });
        
        // 滚动到底部
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    async sendReply() {
        console.log('=== sendReply 方法被调用 ===');
        const input = document.getElementById('wizard-input');
        console.log('输入框元素:', input);
        const content = input.value.trim();
        console.log('输入内容:', content);
        console.log('当前会话ID:', this.currentSessionId);

        if (!content) {
            console.log('输入内容为空，停止发送');
            return;
        }
        if (!this.currentSessionId) {
            console.log('当前会话ID为空，停止发送');
            return;
        }

        const message = {
            id: Date.now().toString(),
            sender: 'wizard',
            type: 'wizard',
            content: content,
            timestamp: new Date().toISOString()
        };

        // 注意：不需要手动添加到本地消息历史
        // Firebase监听器会自动处理消息接收和添加
        // 这样可以避免重复添加消息
        
        console.log('准备发送消息，等待Firebase监听器处理...');

        // 发送到被测者端（通过Firebase通信）
        await this.sendToParticipant(message);

        // 清空输入框
        input.value = '';
        this.updateCharCount();

        this.showNotification('回复已发送', 'success');
    }

    setupCommunication() {
        if (this.comm) {
            // 全局监听所有会话的消息更新
            this.setupGlobalMessageListener();
            
            // 全局监听所有会话的创建和更新
            this.setupGlobalSessionListener();
        }
    }
    
    setupGlobalMessageListener() {
        if (!this.comm || !this.comm.database) return;
        
        console.log('🔧 设置全局消息监听器');
        
        // 如果已经设置过监听器，先清理所有相关监听器
        if (this.globalMessageListener) {
            console.log('🧹 清理旧的全局消息监听器');
            this.comm.database.ref('messages').off('child_added', this.globalMessageListener);
        }
        
        // 清理所有会话级别的消息监听器
        if (this.sessionMessageListeners) {
            console.log('🧹 清理会话级别的消息监听器');
            this.sessionMessageListeners.forEach(({ ref, listener }) => {
                ref.off('child_added', listener);
            });
        }
        this.sessionMessageListeners = [];
        
        // 清空已监听会话集合，重新开始
        this.listenedSessions.clear();
        console.log('🔄 重置监听状态');
        
        // 创建新的监听器函数
        this.globalMessageListener = (sessionSnapshot) => {
            const sessionId = sessionSnapshot.key;
            console.log('🔍 发现新会话消息节点:', sessionId);
            
            // 检查是否已经监听过这个会话
            if (this.listenedSessions.has(sessionId)) {
                console.log('⏭️ 会话已监听，跳过:', sessionId);
                return;
            }
            
            // 标记为已监听
            this.listenedSessions.add(sessionId);
            console.log('👂 开始监听会话:', sessionId);
            
            // 监听该会话下的所有新消息
            const messageListener = (messageSnapshot) => {
                const message = messageSnapshot.val();
                if (message && message.timestamp) {
                    console.log('📨 收到新消息:', message);
                    // 添加时间戳检查，避免处理旧消息
                    const messageTime = new Date(message.timestamp).getTime();
                    const now = Date.now();
                    if (now - messageTime < 60000) { // 只处理1分钟内的消息
                        message.sessionId = sessionId; // 注入sessionId
                        this.handleNewMessage(message);
                    } else {
                        console.log('⏰ 消息过旧，跳过处理:', message.timestamp);
                    }
                }
            };
            
            // 绑定监听器并保存引用
            sessionSnapshot.ref.on('child_added', messageListener);
            this.sessionMessageListeners.push({
                ref: sessionSnapshot.ref,
                listener: messageListener,
                sessionId: sessionId
            });
            console.log('✅ 会话监听器已绑定:', sessionId);
        };
        
        // 设置新的监听器
        this.comm.database.ref('messages').on('child_added', this.globalMessageListener);
        console.log('🎯 全局消息监听器已设置');
    }
    
    setupGlobalSessionListener() {
        if (!this.comm || !this.comm.database) {
            console.error('Firebase通信模块或数据库未初始化，无法设置会话监听器');
            return;
        }
        
        console.log('🔧 设置全局会话监听器...');
        console.log('Firebase数据库引用:', this.comm.database);
        
        const sessionsRef = this.comm.database.ref('sessions');
        console.log('Sessions引用路径:', sessionsRef.toString());
        
        // 先检查当前已有的会话并初始化processedSessions
        this.processedSessions = new Set();
        sessionsRef.once('value', (snapshot) => {
            const existingSessions = snapshot.val() || {};
            const sessionIds = Object.keys(existingSessions);
            console.log('📋 当前Firebase中的会话:', sessionIds);
            
            // 将现有会话添加到processedSessions中，避免被误认为新会话
            sessionIds.forEach(sessionId => {
                this.processedSessions.add(sessionId);
            });
            console.log('🔄 已初始化processedSessions，包含', this.processedSessions.size, '个现有会话');
        });
        
        // 监听新会话的创建
        sessionsRef.on('child_added', (snapshot) => {
            const sessionData = snapshot.val();
            const sessionId = snapshot.key;
            
            console.log('🔥 检测到新会话事件:', {
                sessionId: sessionId,
                sessionData: sessionData,
                timestamp: new Date().toISOString()
            });
            
            // 检查是否是真正的新会话（避免初始加载时的重复处理）
            if (!this.processedSessions.has(sessionId)) {
                this.processedSessions.add(sessionId);
                
                console.log('✅ 处理新会话:', sessionId);
                
                // 重新渲染会话列表以显示新会话
                this.debouncedRenderSessions();
                
                // 显示通知
                this.showNotification(`新会话已创建: ${sessionId}`, 'success');
            } else {
                console.log('⚠️ 会话已处理过，跳过:', sessionId);
            }
        }, (error) => {
            console.error('❌ 会话监听器错误:', error);
        });
        
        // 监听会话状态更新
        sessionsRef.on('child_changed', (snapshot) => {
            const sessionData = snapshot.val();
            const sessionId = snapshot.key;
            
            console.log('🔄 会话状态更新:', sessionId, sessionData);
            this.handleSessionUpdate(sessionData);
        }, (error) => {
            console.error('❌ 会话更新监听器错误:', error);
        });
        
        console.log('✅ 全局会话监听器设置完成');
    }
    
    // 处理新消息
    handleNewMessage(message) {
        console.log('处理新消息:', message);
        
        // 确保消息有sessionId
        if (!message.sessionId) {
            console.warn('消息缺少sessionId:', message);
            return;
        }
        
        // 确保会话存在 - 如果是新会话，创建会话数据
        if (!this.sessions.has(message.sessionId)) {
            const sessionData = {
                id: message.sessionId,
                sessionId: message.sessionId,
                createdAt: message.timestamp || new Date().toISOString(),
                participantMessages: [],
                aiResponses: [],
                status: 'active'
            };
            
            this.sessions.set(message.sessionId, sessionData);
            console.log(`新会话已创建: ${message.sessionId}`);
            
            // 保存会话到通信模块
            if (this.comm && this.comm.saveSession) {
                this.comm.saveSession(sessionData).catch(err => {
                    console.error('保存会话到通信模块失败:', err);
                });
            }
        }
        
        // 更新本地消息历史
        if (!this.messageHistory.has(message.sessionId)) {
            this.messageHistory.set(message.sessionId, []);
        }
        
        const messages = this.messageHistory.get(message.sessionId);
        
        // 检查消息是否已存在（避免重复）
        // 对于文件通知消息，使用更严格的重复检查
        let existingMessage;
        if (message.messageType === 'file_notification' && message.fileId) {
            // 文件通知消息：检查相同的fileId和sender
            existingMessage = messages.find(m => 
                m.messageType === 'file_notification' && 
                m.fileId === message.fileId && 
                m.sender === message.sender
            );
            console.log(`🔍 文件通知消息重复检查 - fileId: ${message.fileId}, sender: ${message.sender}, 找到重复: ${!!existingMessage}`);
        } else {
            // 普通消息：使用原有的检查逻辑
            existingMessage = messages.find(m => m.id === message.id || 
                (m.timestamp === message.timestamp && m.content === message.content && m.sender === message.sender));
            console.log(`🔍 普通消息重复检查 - id: ${message.id}, 找到重复: ${!!existingMessage}`);
        }
        
        if (!existingMessage) {
            // 构建完整的消息对象，包含所有相关字段
            const messageObj = {
                id: message.id,
                content: message.content,
                sender: message.sender,
                timestamp: message.timestamp,
                sessionId: message.sessionId
            };
            
            // 如果是文件相关消息，添加文件相关字段
            if (message.messageType) {
                messageObj.messageType = message.messageType;
            }
            if (message.fileId) {
                messageObj.fileId = message.fileId;
            }
            if (message.fileName) {
                messageObj.fileName = message.fileName;
            }
            if (message.fileSize) {
                messageObj.fileSize = message.fileSize;
            }
            if (message.fileType) {
                messageObj.fileType = message.fileType;
            }
            
            messages.push(messageObj);
            
            // 按时间戳排序
            messages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            
            console.log(`消息已添加到会话 ${message.sessionId}:`, message.content);
            
            // 更新会话中的消息计数
            const session = this.sessions.get(message.sessionId);
            if (session) {
                if (message.sender === 'participant') {
                    if (!session.participantMessages) session.participantMessages = [];
                    session.participantMessages.push(message);
                } else if (message.sender === 'wizard') {
                    if (!session.aiResponses) session.aiResponses = [];
                    session.aiResponses.push(message);
                }
            }
        }
        
        // 如果是文件上传消息，显示特殊提示
        if (message.messageType === 'file' && message.fileId) {
            console.log('收到文件上传消息:', message);
        }
        
        // 重新渲染消息和会话列表（使用防抖）
        this.renderMessages();
        this.debouncedRenderSessions();
        
        // 如果是participant的消息，显示通知
        if (message.sender === 'participant') {
            this.showNotification(`收到来自参与者的新消息: ${message.content.substring(0, 20)}...`, 'info');
        }
    }
    
    // 处理会话更新（带防抖机制）
    handleSessionUpdate(sessionData) {
        console.log('🔄 处理会话更新:', sessionData);
        
        // 确保sessionData有id字段
        const sessionId = sessionData.id || sessionData.sessionId;
        if (!sessionId) {
            console.warn('⚠️ 会话数据缺少ID:', sessionData);
            return;
        }
        
        // 更新本地会话数据
        if (!this.sessions.has(sessionId)) {
            this.sessions.set(sessionId, {
                id: sessionId,
                sessionId: sessionId,
                createdAt: sessionData.createdAt,
                participantMessages: [],
                aiResponses: [],
                status: sessionData.status || 'active'
            });
            console.log(`✅ 新会话已添加: ${sessionId}`);
        } else {
            // 更新现有会话数据
            const existingSession = this.sessions.get(sessionId);
            this.sessions.set(sessionId, {
                ...existingSession,
                ...sessionData,
                id: sessionId
            });
            console.log(`🔄 会话数据已更新: ${sessionId}`);
        }
        
        // 清除之前的防抖定时器
        if (this.sessionUpdateDebounceTimers.has(sessionId)) {
            clearTimeout(this.sessionUpdateDebounceTimers.get(sessionId));
        }
        
        // 设置防抖定时器，延迟渲染
        const debounceTimer = setTimeout(() => {
            console.log(`🎨 防抖渲染会话: ${sessionId}`);
            
            // 如果是当前选中的会话，更新详情显示
            if (sessionId === this.currentSessionId) {
                this.renderSessionDetail();
            }
            
            // 防抖渲染会话列表
            this.debouncedRenderSessions();
            
            // 清除定时器
            this.sessionUpdateDebounceTimers.delete(sessionId);
        }, 100); // 100ms防抖延迟
        
        this.sessionUpdateDebounceTimers.set(sessionId, debounceTimer);
    }
    
    // 防抖渲染会话列表
    debouncedRenderSessions() {
        // 清除之前的防抖定时器
        if (this.renderDebounceTimer) {
            clearTimeout(this.renderDebounceTimer);
        }
        
        // 设置新的防抖定时器
        this.renderDebounceTimer = setTimeout(() => {
            console.log('🎨 防抖执行会话列表渲染');
            this.renderSessions();
            this.renderDebounceTimer = null;
        }, 50); // 50ms防抖延迟
    }
    
    refreshSession(sessionId) {
        // 刷新特定会话的显示
        if (sessionId === this.currentSessionId) {
            this.renderMessages();
            this.renderSessionDetail();
        }
        this.debouncedRenderSessions();
    }
    
    getParticipantUrl() {
        const currentUrl = window.location.href;
        const baseUrl = currentUrl.substring(0, currentUrl.lastIndexOf('/'));
        return `${baseUrl}/participant.html`;
    }
    
    async sendToParticipant(message) {
        console.log('=== 巫师端发送消息 ===');
        console.log('当前会话ID:', this.currentSessionId);
        console.log('消息内容:', message);
        console.log('通信模块状态:', { comm: !!this.comm, sendMessage: !!(this.comm && this.comm.sendMessage) });
        
        if (!this.currentSessionId) {
            console.error('没有当前会话ID');
            alert('请先选择一个会话');
            return;
        }
        
        try {
            // 使用Firebase发送AI回复
            const messageData = {
                sender: 'wizard',
                content: message.content,
                type: 'ai_response',
                sessionId: this.currentSessionId
            };
            
            console.log('准备发送的消息数据:', messageData);
            const success = await this.comm.sendMessage(messageData);
            console.log('sendMessage返回结果:', success);
            
            if (!success) {
                throw new Error('发送消息失败');
            }
            
            console.log('消息发送成功:', messageData);
            
        } catch (error) {
            console.error('发送消息失败:', error);
            alert('发送消息失败: ' + error.message);
        }
    }

    startPolling() {
        // 轮询检查来自被测者的新消息
        setInterval(() => {
            this.checkForParticipantMessages();
        }, 1000);
    }

    async checkForParticipantMessages() {
        console.log('=== 巫师端检查参与者消息 ===');
        console.log('通信模块实例:', this.comm);
        
        // 使用通信模块检查活跃会话的新消息
        if (this.comm) {
            const sessions = await this.comm.getActiveSessions();
            console.log('检查活跃会话数量:', sessions.length);
            console.log('活跃会话详情:', sessions);
            
            for (const sessionData of sessions) {
                console.log(`检查会话 ${sessionData.sessionId} 是否有未读消息`);
                const hasUnread = await this.comm.hasUnreadMessages(sessionData.sessionId);
                console.log(`会话 ${sessionData.sessionId} 未读消息状态:`, hasUnread);
                
                if (hasUnread) {
                    console.log(`发现会话 ${sessionData.sessionId} 有未读消息，开始处理`);
                    
                    // 标记为已读
                    await this.comm.markSessionAsRead(sessionData.sessionId);
                    console.log(`会话 ${sessionData.sessionId} 已标记为已读`);
                    
                    // 如果是当前会话，刷新显示
                    if (sessionData.sessionId === this.currentSessionId) {
                        console.log('刷新当前会话显示');
                        this.renderMessages();
                        this.renderSessionDetail();
                    }
                    
                    // 更新会话列表
                    console.log('更新会话列表');
                    this.debouncedRenderSessions();
                }
            }
        } else {
            // 回退到旧的localStorage检查方式
            this.sessions.forEach((session, sessionId) => {
                const channelKey = `woz_participant_${sessionId}`;
                const data = localStorage.getItem(channelKey);
                
                if (data) {
                    try {
                        const channelData = JSON.parse(data);
                        if (channelData.type === 'participant_message') {
                            this.handleParticipantMessage(sessionId, channelData.message);
                            // 清除已处理的消息
                            localStorage.removeItem(channelKey);
                        }
                    } catch (e) {
                        console.error('解析参与者消息失败:', e);
                    }
                }
            });
        }
    }

    handleParticipantMessage(sessionId, message) {
        // 添加到消息历史
        const messages = this.messageHistory.get(sessionId) || [];
        messages.push(message);
        this.messageHistory.set(sessionId, messages);

        // 更新会话状态
        const session = this.sessions.get(sessionId);
        if (session) {
            session.messageCount = messages.length;
            session.status = 'active';
            session.participantConnected = true;
        }

        // 保存到存储
        this.saveToStorage();

        // 如果是当前会话，重新渲染
        if (sessionId === this.currentSessionId) {
            this.renderMessages();
        }

        this.debouncedRenderSessions();

        // 显示通知
        this.showNotification(`收到来自会话 ${sessionId} 的新消息`, 'info');
    }
    
    handleFileUploaded(data) {
        console.log('处理文件上传事件:', data);
        const { sessionId, fileName, fileType, fileSize } = data;
        
        // 确保会话存在
        if (!this.sessions.has(sessionId)) {
            console.log('为文件上传创建新会话:', sessionId);
            this.sessions.set(sessionId, {
                id: sessionId,
                participantMessages: [],
                aiResponses: [],
                status: 'active',
                createdAt: new Date().toISOString()
            });
        }
        
        // 更新会话列表显示
        this.debouncedRenderSessions();
        
        // 如果当前选中的是这个会话，刷新详情以显示新上传的文件
        if (this.currentSessionId === sessionId) {
            this.renderSessionDetail();
        }
        
        // 显示文件上传通知
        const fileSizeStr = this.formatFileSize(fileSize);
        this.showNotification(`收到文件上传: ${fileName} (${fileSizeStr})`, 'success');
    }

    getParticipantUrl() {
        const baseUrl = window.location.origin + window.location.pathname.replace('wizard.html', '');
        return `${baseUrl}participant.html?session=${this.currentSessionId}`;
    }

    copySessionUrl() {
        const url = this.getParticipantUrl();
        navigator.clipboard.writeText(url).then(() => {
            this.showNotification('被测者链接已复制到剪贴板', 'success');
        }).catch(() => {
            // 备用方案
            const textArea = document.createElement('textarea');
            textArea.value = url;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('被测者链接已复制到剪贴板', 'success');
        });
    }

    endCurrentSession() {
        if (!this.currentSessionId) return;

        const session = this.sessions.get(this.currentSessionId);
        if (session) {
            session.status = 'ended';
        }

        this.saveToStorage();
        this.debouncedRenderSessions();
        this.renderSessionDetail();

        this.showNotification(`会话 ${this.currentSessionId} 已结束`, 'info');
    }

    clearAllSessions() {
        if (confirm('确定要清空所有会话吗？这将删除所有会话数据。')) {
            this.sessions.clear();
            this.messageHistory.clear();
            this.currentSessionId = null;
            this.saveToStorage();
            this.debouncedRenderSessions();
            this.renderSessionDetail();
            this.showNotification('所有会话已清空', 'info');
        }
    }

    showQuickReplies() {
        document.getElementById('quick-replies-modal').style.display = 'flex';
        
        // 绑定快速回复点击事件
        document.querySelectorAll('.quick-reply-item').forEach(item => {
            item.onclick = () => {
                const reply = item.getAttribute('data-reply');
                document.getElementById('wizard-input').value = reply;
                this.updateCharCount();
                this.hideQuickReplies();
            };
        });
    }

    hideQuickReplies() {
        document.getElementById('quick-replies-modal').style.display = 'none';
    }

    openGeminiAssist() {
        const geminiUrl = 'https://gemini.google.com/';
        window.open(geminiUrl, '_blank');
        this.showNotification('已打开Gemini助手，你可以在那里获取AI回复', 'info');
    }

    updateCharCount() {
        const input = document.getElementById('wizard-input');
        const count = input.value.length;
        document.getElementById('char-count').textContent = `${count} 字符`;
    }

    saveToStorage() {
        try {
            const data = {
                sessions: Array.from(this.sessions.entries()),
                messageHistory: Array.from(this.messageHistory.entries()),
                currentSessionId: this.currentSessionId
            };
            
            const jsonData = JSON.stringify(data);
            console.log('准备保存数据大小:', (jsonData.length / 1024).toFixed(2), 'KB');
            
            // 检查localStorage使用情况
            const usage = this.getLocalStorageUsage();
            console.log('当前localStorage使用情况:', usage);
            
            // 如果数据过大或接近配额限制，进行清理
            if (usage.percentage > 80 || jsonData.length > 1024 * 1024) { // 1MB
                console.warn('存储空间不足，开始清理旧数据...');
                this.cleanupOldData();
            }
            
            localStorage.setItem('woz_wizard_data', jsonData);
            console.log('数据保存成功');
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                console.error('存储配额超限，尝试清理数据后重试...');
                this.handleStorageQuotaExceeded();
            } else {
                console.error('保存数据失败:', error);
            }
        }
    }
    
    getLocalStorageUsage() {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }
            // localStorage通常限制在5-10MB
            const maxSize = 5 * 1024 * 1024; // 5MB
            return {
                used: totalSize,
                max: maxSize,
                percentage: (totalSize / maxSize) * 100
            };
        } catch (error) {
            console.error('获取localStorage使用情况失败:', error);
            return { used: 0, max: 0, percentage: 0 };
        }
    }
    
    cleanupOldData() {
        try {
            console.log('开始清理旧数据...');
            
            // 1. 清理过期的消息历史（只保留最近的消息）
            for (let [sessionId, messages] of this.messageHistory) {
                if (messages.length > 50) { // 只保留最近50条消息
                    this.messageHistory.set(sessionId, messages.slice(-50));
                    console.log(`会话 ${sessionId} 清理了 ${messages.length - 50} 条旧消息`);
                }
            }
            
            // 2. 清理非活跃会话（超过24小时未活动）
            const now = Date.now();
            const dayAgo = now - 24 * 60 * 60 * 1000;
            
            for (let [sessionId, session] of this.sessions) {
                const lastActivity = new Date(session.lastActivity || session.createdAt).getTime();
                if (lastActivity < dayAgo && sessionId !== this.currentSessionId) {
                    this.sessions.delete(sessionId);
                    this.messageHistory.delete(sessionId);
                    console.log(`清理了非活跃会话: ${sessionId}`);
                }
            }
            
            console.log('数据清理完成');
        } catch (error) {
            console.error('清理数据失败:', error);
        }
    }
    
    handleStorageQuotaExceeded() {
        try {
            // 强制清理数据
            this.cleanupOldData();
            
            // 清理其他localStorage项
            const keysToCheck = [];
            for (let i = 0; i < localStorage.length; i++) {
                keysToCheck.push(localStorage.key(i));
            }
            
            // 删除非关键数据
            keysToCheck.forEach(key => {
                if (key && key.startsWith('woz_') && key !== 'woz_wizard_data') {
                    localStorage.removeItem(key);
                    console.log('清理了localStorage项:', key);
                }
            });
            
            // 重试保存
            const data = {
                sessions: Array.from(this.sessions.entries()),
                messageHistory: Array.from(this.messageHistory.entries()),
                currentSessionId: this.currentSessionId
            };
            
            localStorage.setItem('woz_wizard_data', JSON.stringify(data));
            console.log('清理后重新保存成功');
            
            this.showNotification('存储空间已清理，数据保存成功', 'success');
        } catch (retryError) {
            console.error('清理后仍然无法保存:', retryError);
            this.showNotification('存储空间不足，请手动清理浏览器数据', 'error');
        }
    }

    async loadSessions() {
        // 使用通信模块加载所有活跃会话
        if (this.comm) {
            try {
                const sessions = await this.comm.getActiveSessions();
                console.log('从通信模块加载的会话:', sessions);
                
                // 将通信模块中的会话数据同步到本地sessions Map
                this.sessions.clear();
                sessions.forEach(session => {
                    // 兼容不同的sessionId字段名
                    const sessionId = session.sessionId || session.id;
                    if (!sessionId) {
                        console.warn('会话缺少ID字段:', session);
                        return;
                    }
                    
                    this.sessions.set(sessionId, {
                        id: sessionId,
                        sessionId: sessionId,
                        createdAt: session.createdAt,
                        participantMessages: session.participantMessages || [],
                        aiResponses: session.aiResponses || [],
                        status: session.status || 'active'
                    });
                    
                    // 同步消息历史
                    const allMessages = [];
                    if (session.participantMessages) {
                        allMessages.push(...session.participantMessages.map(msg => ({...msg, sender: 'participant'})));
                    }
                    if (session.aiResponses) {
                        allMessages.push(...session.aiResponses.map(msg => ({...msg, sender: 'wizard'})));
                    }
                    // 按时间戳排序
                    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
                    this.messageHistory.set(sessionId, allMessages);
                });
                
                console.log('同步后的本地会话:', this.sessions);
            } catch (error) {
                console.error('从通信模块加载会话失败:', error);
            }
        } else {
            // 如果通信模块不可用，回退到localStorage
            const data = localStorage.getItem('woz_wizard_data');
            if (data) {
                try {
                    const parsed = JSON.parse(data);
                    this.sessions = new Map(parsed.sessions || []);
                    this.messageHistory = new Map(parsed.messageHistory || []);
                    this.currentSessionId = parsed.currentSessionId;
                } catch (e) {
                    console.error('加载会话数据失败:', e);
                }
            }
        }
        
        this.debouncedRenderSessions();
        this.renderSessionDetail();
    }

    toggleFilesList() {
        const filesList = document.getElementById('uploaded-files-list');
        const toggleBtn = document.getElementById('toggle-files-btn');
        
        if (!filesList || !toggleBtn) return;
        
        const isVisible = filesList.style.display !== 'none';
        
        if (isVisible) {
            // 折叠文件列表
            filesList.style.display = 'none';
            toggleBtn.textContent = '▶ 展开';
            toggleBtn.classList.add('collapsed');
        } else {
            // 展开文件列表
            filesList.style.display = 'block';
            toggleBtn.textContent = '▼ 折叠';
            toggleBtn.classList.remove('collapsed');
        }
    }
    
    async loadAndRenderFiles(uploadedFilesSection) {
        try {
            let sessionFiles = [];
            if (this.comm && this.comm.getSessionFiles) {
                sessionFiles = await this.comm.getSessionFiles(this.currentSessionId);
            }
            
            if (sessionFiles && sessionFiles.length > 0) {
                this.renderUploadedFiles(sessionFiles);
                if (uploadedFilesSection) uploadedFilesSection.style.display = 'block';
            } else {
                if (uploadedFilesSection) uploadedFilesSection.style.display = 'none';
            }
        } catch (error) {
            console.error('加载文件列表失败:', error);
            if (uploadedFilesSection) uploadedFilesSection.style.display = 'none';
        }
    }

    renderUploadedFiles(files) {
        const uploadedFilesContainer = document.getElementById('uploaded-files-list');
        if (!uploadedFilesContainer) return;
        
        uploadedFilesContainer.innerHTML = '';
        
        files.forEach(file => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-item';
            
            const fileSize = this.formatFileSize(file.size);
            const uploadTime = new Date(file.uploadTime).toLocaleString();
            const fileIcon = this.getFileIcon(file.type);
            const uploader = file.uploader || 'unknown';
            
            fileItem.innerHTML = `
                <div class="file-info">
                    <div class="file-icon">${fileIcon}</div>
                    <div class="file-details">
                        <div class="file-name">${file.name}</div>
                        <div class="file-meta">
                            <span class="file-size">${fileSize}</span> • 
                            <span class="file-time">${uploadTime}</span> • 
                            <span class="file-uploader">${uploader === 'wizard' ? '巫师' : '被测者'}</span>
                        </div>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="btn-download" onclick="wizardController.downloadFile('${file.id}')">
                        下载
                    </button>
                </div>
            `;
            
            uploadedFilesContainer.appendChild(fileItem);
        });
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    getFileIcon(fileType) {
        if (fileType === 'application/pdf') {
            return '📄';
        } else if (fileType.startsWith('image/')) {
            return '🖼️';
        } else {
            return '📎';
        }
    }
    
    async downloadFile(fileId) {
        if (!this.comm) {
            this.showNotification('通信模块不可用', 'error');
            return;
        }
        
        try {
            const fileData = await this.comm.getFileData(fileId);
            if (!fileData) {
                this.showNotification('文件不存在或已过期', 'error');
                return;
            }
            
            // 检查是否有Firebase Storage下载URL
            if (fileData.downloadUrl) {
                console.log('使用Firebase Storage下载URL:', fileData.downloadUrl);
                
                // 直接使用Firebase Storage的下载URL
                const a = document.createElement('a');
                a.href = fileData.downloadUrl;
                a.download = fileData.name;
                a.target = '_blank'; // 在新标签页打开，避免跨域问题
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                
                this.showNotification(`文件 ${fileData.name} 下载成功`, 'success');
                return;
            }
            
            // 如果没有下载URL，检查是否有base64内容（localStorage fallback）
            if (!fileData.content) {
                this.showNotification('文件内容不可用', 'error');
                return;
            }
            
            console.log('使用localStorage中的base64内容下载');
            
            // 将Base64内容转换为二进制数据
            let base64Data;
            if (fileData.content.includes(',')) {
                base64Data = fileData.content.split(',')[1]; // 移除data:type;base64,前缀
            } else {
                base64Data = fileData.content; // 已经是纯Base64
            }
            
            const binaryData = atob(base64Data);
            const bytes = new Uint8Array(binaryData.length);
            for (let i = 0; i < binaryData.length; i++) {
                bytes[i] = binaryData.charCodeAt(i);
            }
            
            // 创建下载链接
            const blob = new Blob([bytes], { type: fileData.type });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileData.name;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理URL对象
            URL.revokeObjectURL(url);
            
            this.showNotification(`文件 ${fileData.name} 下载成功`, 'success');
        } catch (error) {
            console.error('下载文件失败:', error);
            this.showNotification('下载文件失败: ' + error.message, 'error');
        }
    }

    // 新的简化文件上传设置
    setupSimpleFileUpload() {
        debugLog('=== 设置简化文件上传功能 ===');
        
        // 防止重复绑定事件
        if (this.fileUploadEventsSetup) {
            debugLog('文件上传事件已绑定，跳过重复设置');
            return;
        }
        
        const fileInput = document.getElementById('simple-file-input');
        const uploadBtn = document.getElementById('simple-upload-btn');
        const cancelBtn = document.getElementById('simple-cancel-btn');
        const previewList = document.getElementById('file-preview-list');
        
        if (!fileInput || !uploadBtn || !cancelBtn || !previewList) {
            debugLog('错误: 找不到必要的文件上传元素');
            return;
        }
        
        // 文件选择事件
        fileInput.addEventListener('change', (e) => {
            debugLog('=== 文件选择事件触发 ===');
            const files = e.target.files;
            debugLog('选中文件数量: ' + files.length);
            
            if (files.length > 0) {
                this.selectedFiles = Array.from(files);
                this.showSimpleFilePreview();
                uploadBtn.disabled = false;
                debugLog('文件选择完成，启用上传按钮');
            } else {
                this.selectedFiles = [];
                this.hideSimpleFilePreview();
                uploadBtn.disabled = true;
                debugLog('没有选中文件，禁用上传按钮');
            }
        });
        
        // 上传按钮事件
        uploadBtn.addEventListener('click', () => {
            debugLog('=== 开始上传文件 ===');
            this.uploadSimpleFiles();
        });
        
        // 取消按钮事件
        cancelBtn.addEventListener('click', () => {
            debugLog('=== 取消文件上传 ===');
            this.cancelSimpleFileUpload();
        });
        
        // 标记事件已绑定
        this.fileUploadEventsSetup = true;
        debugLog('=== 简化文件上传功能设置完成 ===');
    }
    
    // 新的简化切换方法
    toggleSimpleFileUpload() {
        debugLog('=== 切换简化文件上传区域显示 ===');
        
        const fileUploadArea = document.getElementById('simple-file-upload');
        debugLog('文件上传区域元素: ' + (fileUploadArea ? '找到' : '未找到'));
        
        if (fileUploadArea) {
            const isVisible = fileUploadArea.style.display !== 'none';
            debugLog('当前是否可见: ' + isVisible);
            
            if (isVisible) {
                fileUploadArea.style.display = 'none';
                this.resetSimpleFileUpload();
            } else {
                fileUploadArea.style.display = 'block';
                // 只在第一次显示时设置事件绑定
                if (!this.fileUploadEventsSetup) {
                    this.setupSimpleFileUpload();
                }
            }
            debugLog('设置显示状态为: ' + fileUploadArea.style.display);
        } else {
            debugLog('错误: 找不到文件上传区域元素');
        }
    }

    // 新的简化文件处理方法
    handleSimpleFileUpload(event) {
        debugLog('=== 处理简化文件上传事件 ===');
        
        const files = event.target.files;
        debugLog('选中文件数量: ' + (files ? files.length : 0));
        
        if (!files || files.length === 0) {
            debugLog('没有选中文件');
            this.selectedFiles = [];
            this.displaySimpleFileList();
            return;
        }

        if (!this.currentSessionId) {
            debugLog('没有选择会话');
            this.showNotification('请先选择一个会话', 'error');
            return;
        }

        this.selectedFiles = Array.from(files);
        this.displaySimpleFileList();
        debugLog('文件处理完成，数量: ' + this.selectedFiles.length);
        
        // 清空文件输入以允许重新选择相同文件
        event.target.value = '';
    }
    
    // 显示文件预览区域
    showSimpleFilePreview() {
        debugLog('=== 显示文件预览区域 ===');
        const previewList = document.getElementById('file-preview-list');
        if (previewList) {
            previewList.style.display = 'block';
            this.displaySimpleFileList();
        }
    }
    
    // 隐藏文件预览区域
    hideSimpleFilePreview() {
        debugLog('=== 隐藏文件预览区域 ===');
        const previewList = document.getElementById('file-preview-list');
        if (previewList) {
            previewList.style.display = 'none';
            previewList.innerHTML = '';
        }
    }
    
    // 新的简化文件列表显示方法
    displaySimpleFileList() {
        debugLog('=== 显示简化文件列表 ===');
        
        const fileList = document.getElementById('file-preview-list');
        if (!fileList) {
            debugLog('错误: 找不到文件预览列表元素');
            return;
        }
        
        // 清空现有列表
        fileList.innerHTML = '';
        
        if (this.selectedFiles.length === 0) {
            fileList.innerHTML = '<div class="no-files">未选择文件</div>';
            return;
        }
        
        // 显示文件列表
        this.selectedFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'file-preview-item';
            fileItem.innerHTML = `
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${this.formatFileSize(file.size)})</span>
                <button class="remove-file-btn" onclick="wizardController.removeSimpleFile(${index})">
                    ×
                </button>
            `;
            fileList.appendChild(fileItem);
        });
        
        debugLog('文件列表显示完成，文件数量: ' + this.selectedFiles.length);
    }
    
    // 新的简化文件操作方法
    removeSimpleFile(index) {
        debugLog('删除文件索引: ' + index);
        this.selectedFiles.splice(index, 1);
        this.displaySimpleFileList();
        
        // 更新上传按钮状态
        const uploadBtn = document.getElementById('simple-upload-btn');
        if (uploadBtn) {
            uploadBtn.disabled = this.selectedFiles.length === 0;
        }
        
        // 如果没有文件了，隐藏预览区域
        if (this.selectedFiles.length === 0) {
            this.hideSimpleFilePreview();
        }
    }
    
    clearSimpleFiles() {
        debugLog('清空所有文件');
        this.selectedFiles = [];
        this.hideSimpleFilePreview();
        
        // 更新上传按钮状态
        const uploadBtn = document.getElementById('simple-upload-btn');
        if (uploadBtn) {
            uploadBtn.disabled = true;
        }
    }
    
    resetSimpleFileUpload() {
        debugLog('重置文件上传区域');
        this.clearSimpleFiles();
        const fileInput = document.getElementById('simple-file-input');
        if (fileInput) {
            fileInput.value = '';
        }
    }
    
    cancelSimpleFileUpload() {
        debugLog('=== 取消简化文件上传 ===');
        this.resetSimpleFileUpload();
        this.toggleSimpleFileUpload(); // 隐藏上传区域
    }
    
    // 新的简化上传方法
    async uploadSimpleFiles() {
        debugLog('=== 开始上传简化文件 ===');
        debugLog('selectedFiles数组长度: ' + this.selectedFiles.length);
        debugLog('当前会话ID: ' + this.currentSessionId);
        
        if (this.selectedFiles.length === 0) {
            this.showNotification('请先选择文件', 'warning');
            return;
        }
        
        if (!this.currentSessionId) {
            this.showNotification('请先选择一个会话', 'error');
            return;
        }
        
        try {
            // 显示上传进度
            this.showNotification('正在上传文件...', 'info');
            
            // 逐个上传文件
            for (let i = 0; i < this.selectedFiles.length; i++) {
                const file = this.selectedFiles[i];
                debugLog(`上传文件 ${i + 1}/${this.selectedFiles.length}: ${file.name}`);
                
                await this.uploadWizardFile(file);
            }
            
            // 上传完成
            this.showNotification('文件上传成功！', 'success');
            this.resetSimpleFileUpload();
            document.getElementById('simple-file-upload').style.display = 'none';
            
        } catch (error) {
            debugLog('文件上传失败: ' + error.message);
            this.showNotification('文件上传失败: ' + error.message, 'error');
        }
    }


    async uploadWizardFile(file) {
        debugLog('=== 巫师端开始文件上传流程 ===');
        debugLog('文件信息: 名称=' + file.name + ', 类型=' + file.type + ', 大小=' + file.size + '字节');
        debugLog('当前会话ID: ' + this.currentSessionId);
        
        // 检查文件类型
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        if (!allowedTypes.includes(file.type)) {
            debugLog('不支持的文件类型: ' + file.type);
            this.showNotification(`不支持的文件类型: ${file.name}。仅支持 PDF, JPEG, PNG 格式。`, 'error');
            return;
        }
        
        // 检查文件大小（提高限制到50MB）
        const maxSize = 50 * 1024 * 1024; // 50MB
        if (file.size > maxSize) {
            debugLog('文件过大: ' + file.size + '字节，超过限制: ' + maxSize);
            this.showNotification(`文件过大: ${file.name}。最大支持 50MB。`, 'error');
            return;
        }

        try {
            debugLog('文件验证通过，开始上传...');
            this.showNotification(`正在上传文件: ${file.name}...`, 'info');
            
            // 检查通信模块状态
            if (!this.comm) {
                debugLog('通信模块不可用');
                this.showNotification('通信模块不可用', 'error');
                return;
            }
            
            // 判断文件大小，选择合适的上传方法
            const largeFileThreshold = 5 * 1024 * 1024; // 5MB
            let fileId;
            
            if (file.size > largeFileThreshold && this.comm.uploadLargeFile) {
                debugLog('使用大文件上传方法...');
                
                // 创建进度回调
                const progressCallback = (progress) => {
                    debugLog('上传进度: ' + progress.percentage + '%');
                    this.showNotification(`上传进度: ${file.name} - ${progress.percentage}%`, 'info');
                };
                
                // 使用大文件上传方法
                fileId = await this.comm.uploadLargeFile(file, this.currentSessionId, progressCallback);
                
            } else {
                debugLog('使用传统上传方法...');
                
                // 读取文件内容
                const reader = new FileReader();
                
                const fileData = await new Promise((resolve, reject) => {
                    reader.onload = (e) => {
                        resolve({
                            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                            name: file.name,
                            type: file.type,
                            size: file.size,
                            content: e.target.result,
                            uploadTime: new Date().toISOString(),
                            uploader: 'wizard',
                            sessionId: this.currentSessionId
                        });
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(file);
                });
                
                // 使用传统方法保存文件
                console.log('=== 巫师端上传文件 ===');
                console.log('文件数据:', fileData);
                console.log('当前会话ID:', this.currentSessionId);
                fileId = await this.comm.uploadFile(fileData);
                console.log('uploadFile返回的fileId:', fileId);
            }
            
            if (fileId) {
                console.log('文件上传成功，准备发送通知');
                debugLog('文件上传成功: ' + file.name + ', ID: ' + fileId);
                this.showNotification(`文件 ${file.name} 上传成功`, 'success');
                
                // 发送文件通知消息给被测者
                try {
                    const fileNotificationMessage = `我已为您上传了一个文件: ${file.name} (${this.formatFileSize(file.size)})。您可以在聊天中看到这个文件。`;
                    
                    debugLog('发送文件通知消息给被测者: ' + fileNotificationMessage);
                    
                    // 创建消息对象
                    const messageData = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        content: fileNotificationMessage,
                        sender: 'wizard',
                        timestamp: new Date().toISOString(),
                        sessionId: this.currentSessionId,
                        messageType: 'file_notification',
                        fileId: fileId,
                        fileName: file.name,
                        fileSize: file.size,
                        fileType: file.type
                    };
                    
                    // 发送消息
                    if (this.comm && this.comm.sendMessage) {
                        await this.comm.sendMessage(messageData);
                        debugLog('文件通知消息发送成功');
                        
                        // 注意：不需要手动添加到本地消息历史
                        // Firebase监听器会自动处理消息接收和添加
                        // 这样可以避免重复添加消息
                        
                        debugLog('等待Firebase监听器处理消息...');
                    }
                } catch (messageError) {
                    debugLog('发送文件通知消息失败，但文件上传成功: ' + messageError.message);
                }
                
                // 刷新会话详情以显示新上传的文件
                debugLog('刷新会话详情显示...');
                this.renderSessionDetail();
                
                debugLog('=== 巫师端文件上传流程完成 ===');
            } else {
                debugLog('文件保存失败');
                this.showNotification(`文件保存失败: ${file.name}`, 'error');
            }
            
        } catch (error) {
            debugLog('=== 巫师端文件上传失败 ===');
            debugLog('错误详情: ' + JSON.stringify({
                message: error.message,
                stack: error.stack,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                currentSessionId: this.currentSessionId
            }));
            this.showNotification(`上传文件失败: ${error.message}`, 'error');
        }
    }

    showNotification(message, type = 'info') {
        // 创建通知元素
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // 添加样式
        Object.assign(notification.style, {
            position: 'fixed',
            top: '20px',
            right: '20px',
            padding: '12px 20px',
            borderRadius: '8px',
            color: 'white',
            fontWeight: '500',
            zIndex: '10000',
            transform: 'translateX(100%)',
            transition: 'transform 0.3s ease'
        });

        // 设置背景色
        const colors = {
            success: '#48bb78',
            error: '#f56565',
            info: '#4299e1',
            warning: '#ed8936'
        };
        notification.style.background = colors[type] || colors.info;

        document.body.appendChild(notification);

        // 动画显示
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        // 自动隐藏
        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
}

// 调试信息显示函数
function debugLog(message) {
    console.log(message);
    const debugInfo = document.getElementById('debug-info');
    const debugContent = document.getElementById('debug-content');
    if (debugInfo && debugContent) {
        debugInfo.style.display = 'block';
        const timestamp = new Date().toLocaleTimeString();
        debugContent.innerHTML += `<div>[${timestamp}] ${message}</div>`;
        debugContent.scrollTop = debugContent.scrollHeight;
    }
}

// 初始化控制器
document.addEventListener('DOMContentLoaded', async () => {
    debugLog('DOM内容已加载，开始初始化WizardController');
    window.wizardController = new WizardController();
    debugLog('WizardController实例已创建');
    await window.wizardController.init();
    debugLog('WizardController初始化完成');
    
    // 验证关键元素是否存在
     const fileInput = document.getElementById('wizard-file-input');
     const uploadBtn = document.getElementById('wizard-upload-btn');
     const fileArea = document.getElementById('wizard-file-upload-area');
     const dropZone = document.getElementById('wizard-file-drop-zone');
     
     debugLog('关键元素检查:');
     debugLog('- 文件输入框: ' + (fileInput ? '存在' : '不存在'));
     debugLog('- 上传按钮: ' + (uploadBtn ? '存在' : '不存在'));
     debugLog('- 文件上传区域: ' + (fileArea ? '存在' : '不存在'));
     debugLog('- 文件拖拽区域: ' + (dropZone ? '存在' : '不存在'));
     
     // 测试点击事件
     if (dropZone) {
         debugLog('测试拖拽区域点击事件...');
         setTimeout(() => {
             debugLog('模拟点击拖拽区域');
             dropZone.click();
         }, 2000);
     }
});