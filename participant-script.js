// 被测者界面脚本
class ParticipantInterface {
    constructor() {
        this.sessionId = null;
        this.isConnected = false;
        this.pollInterval = null;
        // 强制设置为英文，忽略localStorage中的语言偏好
        localStorage.removeItem('preferredLanguage'); // 清除之前保存的语言偏好
        localStorage.clear(); // 清除所有localStorage数据，确保没有残留的语言设置
        this.currentLanguage = 'en';
        this.translations = {
            en: {
                title: 'AI Assistant',
                sessionId: '',
                connecting: 'Connecting...',
                connected: 'Connected',
                loading: 'Loading...',
                placeholder: 'Type your message...',
                dropMessage: 'Drag files here to upload (PDF, JPEG, PNG)',
                welcomeMessage: 'Welcome to the Agentic AI system! Please start your task.',
                aiGreeting: 'Hello! I am your AI assistant. I can help you browse web pages, analyze content, answer questions, etc. What can I help you with?',
                uploadingFile: 'Uploading file:',
                uploadSuccess: 'File uploaded',
                uploadFailed: 'File upload failed:',
                unsupportedFile: 'Unsupported file type:',
                onlyPdfSupported: 'Only PDF, JPEG, PNG files are supported.',
                analyzeFile: 'Please analyze the uploaded file:',
                pageLoaded: 'Page loaded successfully:',
                switchLanguage: 'Switch Language',
                uploadedFiles: 'Uploaded Files',
                wizard: 'Wizard',
                participant: 'Participant',
                joinSession: 'Join Session',
                sessionIdPlaceholder: 'Enter Session ID',
                sessionNotFound: 'Session not found, please check the Session ID',
                enterSessionId: 'Please enter Session ID',
                joinedSession: 'Successfully joined session:',
                downloadFile: 'Download',
                // 控制面板翻译
                controlPanel: 'Control Panel',
                aiPersonalitySettings: 'AI Agent Settings',
                textDialogSettings: 'Text Dialog Settings',
                imageEditSettings: 'Image Edit Settings',
                creativity: 'Creativity',
                personality: 'Personality',
                workingStyle: 'Working Style',
                rigor: 'Rigor',
                creative: 'Creative',
                calm: 'Calm',
                energetic: 'Energetic',
                executor: 'Executor',
                initiator: 'Initiator',
                // 图片编辑设置翻译
                imageSize: 'IMAGE SIZE',
                batch: 'BATCH',
                width: 'Width',
                height: 'Height',
                samplingSteps: 'Sampling Steps',
                batchCount: 'Batch Count',
                batchSize: 'Batch Size',
                // 提示框文本
                creativityTooltip: 'The degree of creative divergence allowed for the current agent',
                personalityTooltip: 'The language style used by the current agent',
                workingStyleTooltip: 'The degree of autonomous initiative allowed for the current agent'
            },
            zh: {
                 title: 'AI 助手',
                sessionId: '',
                connecting: '连接中...',
                connected: '已连接',
                loading: '加载中...',
                placeholder: '输入您的消息...',
                dropMessage: '拖拽文件到此处上传 (PDF, JPEG, PNG)',
                welcomeMessage: '欢迎使用 Agentic AI 系统！请开始您的任务。',
                aiGreeting: '您好！我是您的AI助手。我可以帮助您浏览网页、分析内容、回答问题等。请告诉我您需要什么帮助？',
                uploadingFile: '正在上传文件:',
                uploadSuccess: '文件上传成功',
                uploadFailed: '文件上传失败:',
                unsupportedFile: '不支持的文件类型:',
                onlyPdfSupported: '仅支持PDF、JPEG、PNG文件。',
                analyzeFile: '请分析刚上传的文件:',
                pageLoaded: '已成功加载页面:',
                switchLanguage: '切换语言',
                uploadedFiles: '上传的文件',
                wizard: '巫师',
                participant: '被测者',
                joinSession: '加入会话',
                sessionIdPlaceholder: '输入会话ID',
                sessionNotFound: '会话不存在，请检查会话ID是否正确',
                enterSessionId: '请输入会话ID',
                joinedSession: '成功加入会话:',
                downloadFile: '下载文件',
                // 控制面板翻译
                controlPanel: '控制面板',
                aiPersonalitySettings: 'AI 智能体设置',
                textDialogSettings: '文本对话设置',
                imageEditSettings: '图片编辑设置',
                creativity: '创意指数',
                personality: '性格特质',
                workingStyle: '工作风格',
                rigor: '严谨',
                creative: '创意',
                calm: '沉着',
                energetic: '活泼',
                executor: '执行',
                initiator: '主导',
                // 图片编辑设置翻译
                imageSize: '图片尺寸',
                batch: '批次',
                width: '宽度',
                height: '高度',
                samplingSteps: '采样',
                batchCount: '批次数',
                batchSize: '批次大小',
                // 提示框文本
                creativityTooltip: '当前智能体在执行任务时被允许的创意发散程度',
                personalityTooltip: '当前智能体在提供回答时使用的语言风格',
                workingStyleTooltip: '当前智能体在执行任务时被允许的自主能动程度'
            }
        };
        
        this.initializeElements();
        this.setupEventListeners();
        this.setupFileHandling();
        this.setupDragAndDrop();
        
        // 异步初始化Firebase和会话
        this.initializeFirebaseAndSession();
        
        this.updateLanguage();
    }
    
    initializeElements() {
        this.chatContainer = document.getElementById('chat-container');
        this.chatMessages = document.getElementById('chat-messages');
        this.messageInput = document.getElementById('message-input');
        this.sendButton = document.getElementById('send-button');
        this.sessionStatus = document.getElementById('session-status');
        this.waitingIndicator = document.getElementById('waiting-indicator');
        this.fileDropZone = document.getElementById('file-drop-zone');
        this.fileInput = document.getElementById('file-input');
        this.fileButton = document.getElementById('file-button');
        this.languageToggle = document.getElementById('language-toggle');
        this.sessionJoinContainer = document.getElementById('session-join-container');
        this.sessionJoinInput = document.getElementById('session-join-input');
        this.sessionJoinBtn = document.getElementById('session-join-btn');
        this.sessionIdSpan = document.getElementById('session-id');
        this.chatTitle = document.getElementById('chat-title');
        
        // 调试：检查关键元素是否正确获取
        console.log('元素初始化检查:', {
            sessionIdSpan: this.sessionIdSpan,
            sessionIdSpanExists: !!this.sessionIdSpan,
            chatContainer: !!this.chatContainer,
            sessionJoinContainer: !!this.sessionJoinContainer
        });
    }

    async initializeFirebaseAndSession() {
        try {
            // 初始化Firebase通信模块
            this.comm = new FirebaseComm();
            const initialized = await this.comm.initialize();
            
            if (!initialized) {
                console.error('Firebase通信模块初始化失败');
                this.updateConnectionStatus('连接失败');
                return;
            }
            
            console.log('Firebase通信模块已准备就绪');
            this.updateConnectionStatus('已连接');
            
            // 初始化会话
        await this.initializeSession();
        
        // 只有在有sessionId时才设置通信监听
        if (this.sessionId) {
            await this.comm.joinSession(this.sessionId);
            this.setupCommunication();
        }
            
        } catch (error) {
            console.error('初始化失败:', error);
            this.updateConnectionStatus('初始化失败');
        }
    }

    async initializeSession() {
        // 检查URL hash中的会话ID
        let sessionIdFromUrl = null;
        
        // 首先检查hash（#WOZ-5VBY4ZYD格式）
        if (window.location.hash) {
            const hashSessionId = window.location.hash.substring(1); // 移除#号
            if (hashSessionId.startsWith('WOZ-') && hashSessionId.length === 12) {
                sessionIdFromUrl = hashSessionId;
            }
        }
        
        // 如果hash中没有，再检查查询参数
        if (!sessionIdFromUrl) {
            const urlParams = new URLSearchParams(window.location.search);
            sessionIdFromUrl = urlParams.get('sessionId');
        }

        if (sessionIdFromUrl) {
            this.sessionId = sessionIdFromUrl;
            
            // 尝试加入会话
            try {
                const joinSuccess = await this.comm.joinSession(this.sessionId);
                
                if (joinSuccess) {
                    if (this.sessionJoinContainer) this.sessionJoinContainer.style.display = 'none';
                    if (this.chatContainer) this.chatContainer.style.display = 'flex';
                    if (this.sessionIdSpan) this.sessionIdSpan.textContent = this.sessionId;
                    
                    // 设置通信监听
                    this.setupCommunication();
                    
                    // 启用发送按钮和输入框
                    if (this.sendButton) {
                        this.sendButton.disabled = false;
                    }
                    if (this.messageInput) {
                        this.messageInput.disabled = false;
                        this.messageInput.placeholder = this.t('placeholder');
                    }
                    
                    console.log(`成功加入会话: ${this.sessionId}`);
                } else {
                    console.error('加入会话失败');
                    // 显示会话加入界面
                    if (this.sessionJoinContainer) this.sessionJoinContainer.style.display = 'flex';
                    if (this.chatContainer) this.chatContainer.style.display = 'none';
                }
            } catch (error) {
                console.error('加入会话时出错:', error);
                // 显示会话加入界面
                if (this.sessionJoinContainer) this.sessionJoinContainer.style.display = 'flex';
                if (this.chatContainer) this.chatContainer.style.display = 'none';
            }
            
        } else {
            if (this.sessionJoinContainer) this.sessionJoinContainer.style.display = 'flex';
            if (this.chatContainer) this.chatContainer.style.display = 'none';
        }
    }
    
    setupCommunication() {
        if (this.comm && this.sessionId) {
            this.comm.onNewMessage((message) => {
                console.log('收到新消息:', message);

                if (message.sessionId === this.sessionId) {
                    if (message.sender === 'wizard') {
                        if (message.messageType === 'file_notification' && message.fileId) {
                            console.log('收到文件通知消息:', message);
                            this.addFileNotificationMessage(message);
                        } else {
                            this.addMessage('ai', message.content, message.avatarName, message.avatarIcon);
                        }
                        this.hideWaitingIndicator();
                    } else if (message.sender === 'participant') {
                        // Participant messages are added locally before sending,
                        // so we don't need to add them again here.
                    }
                }
            });
        }
    }

    addFileNotificationMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', 'ai');

        const avatar = document.createElement('div');
        avatar.classList.add('message-avatar');
        avatar.textContent = 'AI';

        const contentWrapper = document.createElement('div');
        contentWrapper.classList.add('message-content');

        const bubble = document.createElement('div');
        bubble.classList.add('message-bubble');

        // 移除文件消息内容显示
        // if (message.content) {
        //     const textElement = document.createElement('p');
        //     textElement.style.marginBottom = '8px';
        //     textElement.textContent = message.content;
        //     bubble.appendChild(textElement);
        // }

        const fileContainer = document.createElement('div');
        fileContainer.classList.add('message-file');

        const fileIcon = document.createElement('div');
        fileIcon.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>`;
        
        const fileInfo = document.createElement('div');
        fileInfo.classList.add('file-info');

        const fileName = document.createElement('div');
        fileName.classList.add('file-name');
        fileName.textContent = message.fileName;

        const fileSize = document.createElement('div');
        fileSize.classList.add('file-size');
        fileSize.textContent = message.fileSize ? `${(message.fileSize / 1024 / 1024).toFixed(2)} MB` : '';

        fileInfo.appendChild(fileName);
        fileInfo.appendChild(fileSize);

        // 检查是否是图片文件
        // 文件类型可能存储在fileType或type属性中
        const fileType = message.fileType || message.type;
        const isImage = fileType && fileType.startsWith('image/');
        console.log('文件类型检查:', { fileType, isImage, message });

        if (isImage) {
            // 创建图片预览容器
            const imagePreviewContainer = document.createElement('div');
            imagePreviewContainer.classList.add('image-preview-container');
            
            // 添加加载指示器
            const loadingIndicator = document.createElement('div');
            loadingIndicator.classList.add('loading-indicator');
            loadingIndicator.textContent = '加载图片中...';
            imagePreviewContainer.appendChild(loadingIndicator);
            
            // 异步加载图片预览
            this.loadImagePreview(message.fileId, imagePreviewContainer, loadingIndicator);
            
            bubble.appendChild(imagePreviewContainer);
        } else {
            // 非图片文件显示下载按钮
            const downloadButton = document.createElement('button');
            downloadButton.textContent = "Download";
            downloadButton.classList.add('download-button'); // Use a class for styling

            downloadButton.onclick = async () => {
                console.log('=== 下载按钮被点击 ===');
                console.log('文件ID:', message.fileId);
                console.log('文件名:', message.fileName);
                try {
                    await this.downloadFile(message.fileId, message.fileName);
                } catch (error) {
                    console.error('下载文件时出错:', error);
                    alert('下载文件失败: ' + error.message);
                }
            };

            fileContainer.appendChild(fileIcon);
            fileContainer.appendChild(fileInfo);
            fileContainer.appendChild(downloadButton);
            bubble.appendChild(fileContainer);
        }

        const time = document.createElement('div');
        time.classList.add('message-time');
        time.textContent = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

        contentWrapper.appendChild(bubble);
        contentWrapper.appendChild(time);

        messageElement.appendChild(avatar);
        messageElement.appendChild(contentWrapper);

        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    addMessage(sender, text, avatarName = null, avatarIcon = null) {
        if (!text || text.trim() === '') {
            return;
        }

        const messageElement = document.createElement('div');
        messageElement.classList.add('message', sender);

        // Create main container with flexbox layout
        if (sender === 'ai' || sender === 'wizard') {
            messageElement.style.display = 'flex';
            messageElement.style.alignItems = 'flex-start';
            messageElement.style.gap = '12px';
            
            // Avatar image
            const avatarImg = document.createElement('img');
            avatarImg.classList.add('message-avatar-img');
            avatarImg.src = avatarIcon || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'40\' height=\'40\' viewBox=\'0 0 40 40\'%3E%3Ccircle cx=\'20\' cy=\'20\' r=\'18\' fill=\'%23a855f7\'/%3E%3Ctext x=\'20\' y=\'26\' text-anchor=\'middle\' fill=\'white\' font-size=\'16\' font-weight=\'bold\'%3EAI%3C/text%3E%3C/svg%3E';
            avatarImg.style.width = '32px';
            avatarImg.style.height = '32px';
            avatarImg.style.borderRadius = '50%';
            avatarImg.style.objectFit = 'cover';
            
            // Content container
            const contentContainer = document.createElement('div');
            contentContainer.style.flex = '1';
            
            // Sender name
            const senderName = document.createElement('p');
            senderName.classList.add('message-sender-name');
            senderName.textContent = avatarName || 'AI Assistant';
            senderName.style.margin = '0 0 4px 0';
            senderName.style.fontSize = '12px';
            senderName.style.color = '#6b7280';
            senderName.style.fontWeight = '500';
            
            // Message bubble
            const bubble = document.createElement('div');
            bubble.classList.add('message-bubble');
            bubble.textContent = text;
            
            const time = document.createElement('div');
            time.classList.add('message-time');
            time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            
            contentContainer.appendChild(senderName);
            contentContainer.appendChild(bubble);
            contentContainer.appendChild(time);
            
            messageElement.appendChild(avatarImg);
            messageElement.appendChild(contentContainer);
        } else {
            // Original layout for user messages
            const avatar = document.createElement('div');
            avatar.classList.add('message-avatar');
            if (sender === 'user') {
                avatar.textContent = this.t('participant').charAt(0);
            } else {
                avatar.textContent = 'AI';
            }

            const contentWrapper = document.createElement('div');
            contentWrapper.classList.add('message-content');

            const bubble = document.createElement('div');
            bubble.classList.add('message-bubble');
            bubble.textContent = text;

            const time = document.createElement('div');
            time.classList.add('message-time');
            time.textContent = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            contentWrapper.appendChild(bubble);
            contentWrapper.appendChild(time);

            if (sender !== 'system') {
                messageElement.appendChild(avatar);
            }
            
            messageElement.appendChild(contentWrapper);
        }

        this.chatMessages.appendChild(messageElement);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }
    

    
    setupEventListeners() {
        if (this.sendButton) {
            this.sendButton.addEventListener('click', () => this.handleSendMessage());
        }

        if (this.messageInput) {
            this.messageInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    this.handleSendMessage();
                }
            });
        }

        if (this.fileInput) {
            this.fileInput.addEventListener('change', (event) => this.handleFileUpload(event));
        }

        if (this.fileButton) {
            this.fileButton.addEventListener('click', () => this.fileInput.click());
        }

        if (this.languageToggle) {
            this.languageToggle.addEventListener('click', () => this.toggleLanguage());
        }

        if (this.sessionJoinBtn) {
            this.sessionJoinBtn.addEventListener('click', () => this.joinExistingSession());
        }

        if (this.sessionJoinInput) {
            this.sessionJoinInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    this.joinExistingSession();
                }
            });
        }
    }

    showWaitingIndicator() {
        // 移除AI思考中的消息显示
        // this.addMessage('system', 'AI正在思考中...');
    }
    
    hideWaitingIndicator() {
        this.waitingIndicator.style.display = 'none';
    }

    updateConnectionStatus(isConnected) {
        this.isConnected = isConnected;
        if (this.sessionStatus) {
            if (isConnected) {
                this.sessionStatus.textContent = this.t('connected');
                this.sessionStatus.className = 'session-status connected';
            } else {
                this.sessionStatus.textContent = this.t('connecting');
                this.sessionStatus.className = 'session-status disconnected';
            }
        }
    }
    
    setupFileHandling() {
        if (!this.fileDropZone) return;
        
        // 拖拽事件处理
        this.fileDropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.fileDropZone.classList.add('drag-over');
        });
        
        this.fileDropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.fileDropZone.classList.remove('drag-over');
        });
        
        this.fileDropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            this.fileDropZone.classList.remove('drag-over');
            this.handleFileSelect(e.dataTransfer.files);
        });
    }
    
    setupDragAndDrop() {
        const chatInputContainer = document.querySelector('.chat-input-container');
        const chatInput = document.querySelector('.chat-input');
        
        if (!chatInputContainer || !chatInput) return;
        
        // 防止默认拖拽行为
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            chatInputContainer.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // 拖拽进入和悬停效果
        ['dragenter', 'dragover'].forEach(eventName => {
            chatInputContainer.addEventListener(eventName, () => {
                chatInput.classList.add('drag-over');
            }, false);
        });
        
        // 拖拽离开效果
        ['dragleave', 'drop'].forEach(eventName => {
            chatInputContainer.addEventListener(eventName, () => {
                chatInput.classList.remove('drag-over');
            }, false);
        });
        
        // 处理文件拖拽
        chatInputContainer.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFileSelect(files);
            }
        }, false);
    }
    
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    handleFileUpload(event) {
        const files = event.target.files;
        if (files && files.length > 0) {
            this.handleFileSelect(files);
        }
        // 清空文件输入框，允许重复选择同一文件
        event.target.value = '';
    }
    
    handleFileSelect(files) {
        Array.from(files).forEach(file => {
            if (this.isValidFileType(file)) {
                this.prepareFileForSending(file);
            } else {
                this.addMessage('system', `${this.t('unsupportedFile')} ${file.name}`);
            }
        });
    }
    
    prepareFileForSending(file) {
        // 将文件添加到待发送列表，而不是立即上传
        if (!this.pendingFiles) {
            this.pendingFiles = [];
        }
        
        this.pendingFiles.push(file);
        this.showPendingFiles();
        
        // 聚焦到输入框
        const messageInput = document.getElementById('message-input');
        if (messageInput) {
            messageInput.focus();
        }
    }
    
    showPendingFiles() {
        const inputContainer = document.querySelector('.chat-input-container');
        let pendingFilesDiv = document.getElementById('pending-files');
        
        if (!pendingFilesDiv) {
            pendingFilesDiv = document.createElement('div');
            pendingFilesDiv.id = 'pending-files';
            pendingFilesDiv.className = 'pending-files';
            inputContainer.insertBefore(pendingFilesDiv, inputContainer.firstChild);
        }
        
        pendingFilesDiv.innerHTML = '';
        
        this.pendingFiles.forEach((file, index) => {
            const fileItem = document.createElement('div');
            fileItem.className = 'pending-file-item';
            fileItem.innerHTML = `
                <span class="file-icon">📎</span>
                <span class="file-name">${file.name}</span>
                <span class="file-size">(${this.formatFileSize(file.size)})</span>
                <button class="remove-file" onclick="participantInterface.removePendingFile(${index})">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            `;
            pendingFilesDiv.appendChild(fileItem);
        });
    }
    
    removePendingFile(index) {
        if (this.pendingFiles && index >= 0 && index < this.pendingFiles.length) {
            this.pendingFiles.splice(index, 1);
            
            if (this.pendingFiles.length === 0) {
                const pendingFilesDiv = document.getElementById('pending-files');
                if (pendingFilesDiv) {
                    pendingFilesDiv.remove();
                }
                this.pendingFiles = [];
            } else {
                this.showPendingFiles();
            }
        }
    }
    
    hidePendingFiles() {
        const pendingFilesDiv = document.getElementById('pending-files');
        if (pendingFilesDiv) {
            pendingFilesDiv.remove();
        }
        this.pendingFiles = [];
    }
    
    isValidFileType(file) {
        const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
        return allowedTypes.includes(file.type);
    }
    
    // 被测者界面不再显示文件列表，已移除相关功能
    renderUploadedFiles(files) {
        // 文件列表显示功能已移除，被测者不需要查看文件列表
        return;
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
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    async uploadFile(file) {
        console.log('=== 开始文件上传流程 ===');
        console.log('文件信息:', {
            name: file.name,
            type: file.type,
            size: file.size,
            lastModified: file.lastModified
        });
        
        // 检查文件大小
        const fileSizeMB = file.size / (1024 * 1024);
        console.log('文件大小:', fileSizeMB.toFixed(2), 'MB');
        
        // 提高文件大小限制到50MB
        const maxSizeMB = 50;
        if (fileSizeMB > maxSizeMB) {
            const errorMessage = this.currentLanguage === 'en' ? 
                `File too large (${fileSizeMB.toFixed(2)}MB). Maximum supported size is ${maxSizeMB}MB.` :
                `文件过大 (${fileSizeMB.toFixed(2)}MB)。最大支持 ${maxSizeMB}MB。`;
            this.addMessage('system', errorMessage);
            return;
        }
        
        // 对于大文件给出提示
        if (fileSizeMB > 5) {
            const infoMessage = this.currentLanguage === 'en' ? 
                `Large file detected (${fileSizeMB.toFixed(2)}MB). Using optimized storage method.` :
                `检测到大文件 (${fileSizeMB.toFixed(2)}MB)。使用优化存储方式。`;
            this.addMessage('system', infoMessage);
        }
        
        // 显示上传进度
            this.addMessage('system', `file uploaded: ${file.name}`);
        
        try {
            // 检查Firebase通信模块状态
            if (!this.comm) {
                console.error('Firebase通信模块不可用');
                throw new Error('Firebase通信模块不可用');
            }
            
            // 生成文件ID
            const fileId = 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            console.log('生成文件ID:', fileId);
            
            // 读取文件内容为Base64
            console.log('开始读取文件内容...');
            const fileContentWithPrefix = await this.readFileAsBase64(file);
            console.log('文件内容读取完成，内容长度:', fileContentWithPrefix ? fileContentWithPrefix.length : 0);
            
            // 提取纯Base64内容（去除data:type;base64,前缀）
            let fileContent = fileContentWithPrefix;
            if (fileContentWithPrefix && fileContentWithPrefix.includes(',')) {
                fileContent = fileContentWithPrefix.split(',')[1];
                console.log('已提取纯Base64内容，长度:', fileContent.length);
            }
            
            // 创建文件数据对象
            const fileData = {
                id: fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                content: fileContent,
                uploadTime: new Date().toISOString(),
                uploader: 'participant',
                sessionId: this.sessionId
            };
            
            console.log('开始上传文件到Firebase...');
            const uploadResult = await this.comm.uploadFile(fileData);
            console.log('Firebase文件上传结果:', uploadResult);
            
            if (!uploadResult) {
                throw new Error('文件上传到Firebase失败');
            }
            
            // 保存到本地存储
            this.uploadedFiles.set(fileId, fileData);
            console.log('文件已添加到本地存储，当前文件数量:', this.uploadedFiles.size);
            
            const savedFileId = fileId;
            
            // 检查保存是否成功
            if (!savedFileId) {
                console.error('文件保存失败详情:', {
                    savedFileId: savedFileId,
                    sessionId: this.sessionId,
                    fileName: file.name
                });
                throw new Error('文件保存到会话失败');
            }
            
            console.log('文件上传成功完成');
            
            // 显示成功消息
            // 不再显示成功消息，因为已经在上传开始时显示了file uploaded信息
            
            console.log('=== 文件上传成功 ===');
            
            // 根据文件类型自动发送分析请求
            let analysisMessage;
            if (file.type === 'application/pdf') {
                analysisMessage = `${this.t('analyzeFile')} ${file.name}`;
            } else if (file.type.startsWith('image/')) {
                analysisMessage = this.currentLanguage === 'en' ? 
                    `Please analyze this image: ${file.name}` : 
                    `请分析这张图片: ${file.name}`;
            } else {
                analysisMessage = `${this.t('analyzeFile')} ${file.name}`;
            }
            
            console.log('发送分析请求消息:', analysisMessage);
            this.addMessage('user', analysisMessage);
            
            // 尝试保存分析请求到会话（如果失败不影响文件上传成功状态）
            try {
                console.log('保存分析请求到会话...');
                const messageResult = await this.saveParticipantMessage(analysisMessage, fileId);
                console.log('分析请求保存结果:', messageResult);
            } catch (messageError) {
                console.warn('分析请求保存失败，但文件上传已成功:', messageError);
            }
            
            this.showWaitingIndicator();
            console.log('=== 文件上传流程完成 ===');
            
            // 文件上传成功，直接返回
            return;
            
        } catch (error) {
            console.error('=== 文件上传失败 ===');
            console.error('错误详情:', {
                message: error.message,
                stack: error.stack,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type
            });
            
            // 不再显示失败消息给用户，只记录到控制台
        }
    }
    
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    async saveFileToSession(fileData) {
        try {
            console.log('=== 开始保存文件到会话 ===');
            console.log('会话ID:', this.sessionId);
            console.log('文件数据:', {
                id: fileData.id,
                name: fileData.name,
                size: fileData.size,
                type: fileData.type,
                uploader: fileData.uploader
            });
            
            if (window.WozComm) {
                console.log('使用WozComm保存文件...');
                console.log('WozComm方法检查:', {
                    saveUploadedFile: typeof window.WozComm.saveUploadedFile,
                    getSessionData: typeof window.WozComm.getSessionData,
                    updateSessionData: typeof window.WozComm.updateSessionData
                });
                
                // 使用通信模块保存文件
                const savedFileId = await window.WozComm.saveUploadedFile(this.sessionId, fileData);
                console.log('WozComm保存结果:', savedFileId);
                
                // 验证保存是否成功
                const sessionData = await window.WozComm.getSessionData(this.sessionId);
                console.log('保存后的会话数据:', {
                    hasUploadedFiles: sessionData && sessionData.uploadedFiles ? true : false,
                    filesCount: sessionData && sessionData.uploadedFiles ? sessionData.uploadedFiles.length : 0
                });
                
                return savedFileId;
            } else {
                console.log('WozComm不可用，使用localStorage回退方案...');
                
                // 回退到本地存储
                const sessionKey = `participant_${this.sessionId}`;
                console.log('localStorage会话键:', sessionKey);
                
                const sessionData = JSON.parse(localStorage.getItem(sessionKey)) || {
                    sessionId: this.sessionId,
                    participantMessages: [],
                    aiResponses: [],
                    uploadedFiles: [],
                    createdAt: new Date().toISOString(),
                    status: 'active'
                };
                
                console.log('当前会话数据:', {
                    hasUploadedFiles: sessionData.uploadedFiles ? true : false,
                    filesCount: sessionData.uploadedFiles ? sessionData.uploadedFiles.length : 0
                });
                
                if (!sessionData.uploadedFiles) {
                    sessionData.uploadedFiles = [];
                    console.log('初始化uploadedFiles数组');
                }
                
                sessionData.uploadedFiles.push(fileData);
                sessionData.lastActivity = new Date().toISOString();
                
                console.log('更新后的会话数据:', {
                    filesCount: sessionData.uploadedFiles.length,
                    lastActivity: sessionData.lastActivity
                });
                
                // 使用WozComm保存会话数据以确保键前缀正确
                if (window.WozComm) {
                    console.log('使用WozComm更新会话数据...');
                    await window.WozComm.updateSessionData(this.sessionId, sessionData);
                } else {
                    console.log('直接保存到localStorage...');
                    localStorage.setItem(sessionKey, JSON.stringify(sessionData));
                }
                
                // 验证保存
                const savedData = JSON.parse(localStorage.getItem(sessionKey) || '{}');
                console.log('验证保存结果:', {
                    saved: savedData.uploadedFiles ? savedData.uploadedFiles.length : 0,
                    expected: sessionData.uploadedFiles.length
                });
                
                console.log('=== 文件保存完成 ===');
                return fileData.id;
            }
        } catch (error) {
            console.error('=== 保存文件到会话失败 ===');
            console.error('错误详情:', {
                message: error.message,
                stack: error.stack,
                sessionId: this.sessionId,
                fileId: fileData ? fileData.id : 'unknown'
            });
            
            // 重新抛出错误以便上层处理
            if (error.name === 'QuotaExceededError' || error.message.includes('storage')) {
                throw new Error('storage_quota_exceeded');
            }
            
            return null; // 明确返回null表示保存失败
        }
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // 翻译函数
    t(key) {
        return this.translations[this.currentLanguage][key] || key;
    }
    
    // 切换语言
    toggleLanguage() {
        this.currentLanguage = this.currentLanguage === 'zh' ? 'en' : 'zh';
        this.updateLanguage();
        localStorage.setItem('preferredLanguage', this.currentLanguage);
    }
    
    // 更新界面语言
    updateLanguage() {
        // 获取当前Session ID显示值，优先使用已设置的值
        const sessionIdSpan = document.getElementById('session-id');
        let currentSessionId = 'Loading...';
        
        if (this.sessionId) {
            // 如果已有sessionId，使用它
            currentSessionId = this.sessionId;
        } else if (sessionIdSpan && sessionIdSpan.textContent && sessionIdSpan.textContent !== 'Loading...') {
            // 如果span中已有非Loading的值，保持它
            currentSessionId = sessionIdSpan.textContent;
        }
        
        // 更新会话ID标签文本
        const sessionIdLabel = document.getElementById('session-id-label');
        if (sessionIdLabel) {
            sessionIdLabel.innerHTML = `${this.currentLanguage === 'en' ? 'Session ID:' : '会话ID:'} <span id="session-id">${currentSessionId}</span>`;
            console.log('语言更新后Session ID显示:', currentSessionId);
        }
        
        // 重新获取更新后的session-id元素引用
        this.sessionIdSpan = document.getElementById('session-id');
        
        // 更新输入框占位符
        if (this.messageInput) {
            this.messageInput.placeholder = this.t('placeholder');
        }
        
        // 更新语言切换按钮文本
         if (this.languageToggle) {
             this.languageToggle.textContent = this.currentLanguage === 'en' ? '中文' : 'English';
         }
         
         // 更新页面标题
         const chatTitle = document.getElementById('chat-title');
         if (chatTitle) {
             chatTitle.textContent = this.t('title');
         }
         
        // 更新连接状态
        this.updateConnectionStatus(this.isConnected);
        
        // 更新文件拖拽区域提示
         const dropMessage = document.querySelector('.drop-message p');
         if (dropMessage) {
             dropMessage.textContent = this.t('dropMessage');
         }
         
         // 更新页面标题
         document.title = this.t('title');
         
         // 更新会话加入元素
         if (this.sessionJoinInput) {
             this.sessionJoinInput.placeholder = this.t('sessionIdPlaceholder');
         }
         
         if (this.sessionJoinBtn) {
             this.sessionJoinBtn.textContent = this.t('joinSession');
         }
         
         // 更新下载按钮文本 - 始终显示为英文"Download"
         const downloadButtons = document.querySelectorAll('.download-button');
         downloadButtons.forEach(button => {
             button.textContent = "Download";
         });
         
         // 更新控制面板语言
         this.updateControlPanelLanguage();
    }
    
    // 更新控制面板语言
    updateControlPanelLanguage() {
        // 更新控制面板标题
        const controlPanelTitle = document.querySelector('.control-panel h2');
        if (controlPanelTitle) {
            controlPanelTitle.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="3"></circle>
                    <path d="M12 1v6m0 6v6m11-7h-6m-6 0H1"></path>
                </svg>
                ${this.t('controlPanel')}
            `;
        }
        
        // 更新模式标题
        const modeTitle = document.getElementById('settings-mode-title');
        if (modeTitle) {
            // 检查当前是否为文本模式（通过检查active类）
            const textSettings = document.getElementById('ai-personality-settings');
            const isTextMode = textSettings && textSettings.classList.contains('active');
            modeTitle.textContent = isTextMode ? this.t('aiPersonalitySettings') : this.t('imageEditSettings');
        }
        
        // 更新滑块标签
        const creativityLabel = document.querySelector('#creativity-slider').closest('.setting-group').querySelector('.setting-label');
        if (creativityLabel) {
            creativityLabel.textContent = this.t('creativity');
        }
        
        const personalityLabel = document.querySelector('#personality-slider').closest('.setting-group').querySelector('.setting-label');
        if (personalityLabel) {
            personalityLabel.textContent = this.t('personality');
        }
        
        const workstyleLabel = document.querySelector('#workstyle-slider').closest('.setting-group').querySelector('.setting-label');
        if (workstyleLabel) {
            workstyleLabel.textContent = this.t('workingStyle');
        }
        
        // 更新滑块左右标签
        const creativityLabels = document.querySelector('#creativity-slider').closest('.slider-container').querySelectorAll('.slider-labels span');
        if (creativityLabels.length >= 2) {
            creativityLabels[0].textContent = this.t('rigor');
            creativityLabels[1].textContent = this.t('creative');
        }
        
        const personalityLabels = document.querySelector('#personality-slider').closest('.slider-container').querySelectorAll('.slider-labels span');
        if (personalityLabels.length >= 2) {
            personalityLabels[0].textContent = this.t('calm');
            personalityLabels[1].textContent = this.t('energetic');
        }
        
        const workstyleLabels = document.querySelector('#workstyle-slider').closest('.slider-container').querySelectorAll('.slider-labels span');
        if (workstyleLabels.length >= 2) {
            workstyleLabels[0].textContent = this.t('executor');
            workstyleLabels[1].textContent = this.t('initiator');
        }
        
        // 更新图片编辑设置语言
        const imageSizeLabels = document.querySelectorAll('#image-settings .setting-label');
        if (imageSizeLabels.length >= 2) {
            imageSizeLabels[0].textContent = this.t('imageSize');
            imageSizeLabels[1].textContent = this.t('batch');
        }
        
        // 更新滑块标题
        const sliderTitles = document.querySelectorAll('#image-settings .slider-title');
        const titleKeys = ['width', 'height', 'samplingSteps', 'batchCount', 'batchSize'];
        sliderTitles.forEach((title, index) => {
            if (titleKeys[index]) {
                title.textContent = this.t(titleKeys[index]);
            }
        });
        
        // 重新设置提示框以更新语言
        setupTooltips();
    }
    
    // 处理发送消息
    async handleSendMessage() {
        const messageText = this.messageInput.value.trim();
        
        // 检查是否已连接到会话
        if (!this.sessionId || !this.comm) {
            alert(this.t('notConnected') || '请先加入会话');
            return;
        }
        
        // 检查是否有消息内容或待发送文件
        if (!messageText && (!this.pendingFiles || this.pendingFiles.length === 0)) {
            return;
        }
        
        let fileUploadSuccess = true;
        let textMessageSuccess = true;
        
        try {
            // 如果有待发送的文件，先处理文件上传
            if (this.pendingFiles && this.pendingFiles.length > 0) {
                console.log('处理待发送文件:', this.pendingFiles.length);
                
                try {
                    for (const file of this.pendingFiles) {
                        await this.uploadFile(file);
                    }
                    console.log('所有文件上传完成');
                } catch (fileError) {
                    console.error('文件上传过程中出错:', fileError);
                    fileUploadSuccess = false;
                    // 文件上传失败不阻止文本消息发送
                }
                
                // 清空待发送文件列表
                this.pendingFiles = [];
                this.hidePendingFiles();
            }
            
            // 如果有文本消息，发送文本消息
            if (messageText) {
                console.log('发送文本消息:', messageText);
                
                try {
                    // 立即显示用户消息
                    this.addMessage('user', messageText);
                    
                    // 清空输入框
                    this.messageInput.value = '';
                    
                    // 发送消息到Firebase
                    const messageData = {
                        sessionId: this.sessionId,
                        content: messageText,
                        sender: 'participant',
                        timestamp: new Date().toISOString(),
                        messageType: 'text'
                    };
                    
                    const success = await this.comm.sendMessage(messageData);
                    
                    if (success) {
                        console.log('消息发送成功');
                        // 显示等待指示器
                        this.showWaitingIndicator();
                    } else {
                        console.error('消息发送失败');
                        textMessageSuccess = false;
                        this.addMessage('system', '消息发送失败，请重试');
                    }
                } catch (textError) {
                    console.error('文本消息发送出错:', textError);
                    textMessageSuccess = false;
                    this.addMessage('system', '文本消息发送失败: ' + textError.message);
                }
            }
            
        } catch (error) {
            console.error('发送过程中出现未预期错误:', error);
            this.addMessage('system', '发送过程中出现错误: ' + error.message);
        }
    }
    
    // 保存参与者消息到会话
    async saveParticipantMessage(content, fileId = null) {
        if (!this.sessionId || !this.comm) {
            throw new Error('未连接到会话');
        }
        
        const messageData = {
            sessionId: this.sessionId,
            content: content,
            sender: 'participant',
            timestamp: new Date().toISOString(),
            messageType: fileId ? 'file' : 'text'
        };
        
        if (fileId) {
            messageData.fileId = fileId;
        }
        
        return await this.comm.sendMessage(messageData);
    }

    // 加入现有会话
    async joinExistingSession() {
        const sessionId = this.sessionJoinInput.value.trim();
        
        console.log('开始加入会话:', sessionId);
        
        if (!sessionId) {
            alert(this.t('enterSessionId'));
            return;
        }
        
        // 验证会话ID格式
        if (!sessionId.startsWith('WOZ-') || sessionId.length !== 12) {
            alert('会话ID格式不正确，应为 WOZ-XXXXXXXX 格式');
            return;
        }
        
        try {
            // 检查会话是否存在
            console.log('检查会话是否存在:', sessionId);
            const sessionExists = await this.comm.sessionExists(sessionId);
            console.log('会话存在性检查结果:', sessionExists);
            
            if (!sessionExists) {
                alert(this.t('sessionNotFound'));
                return;
            }
            
            // 加入会话
            console.log('尝试加入会话:', sessionId);
            const joinSuccess = await this.comm.joinSession(sessionId);
            
            if (joinSuccess) {
                this.sessionId = sessionId;
                
                // 隐藏会话加入界面，显示聊天界面
                if (this.sessionJoinContainer) this.sessionJoinContainer.style.display = 'none';
                if (this.chatContainer) this.chatContainer.style.display = 'flex';
                
                // 更新左上角的Session ID显示
                console.log('尝试更新Session ID显示:', {
                    sessionId: this.sessionId,
                    sessionIdSpan: this.sessionIdSpan,
                    elementExists: !!this.sessionIdSpan
                });
                
                if (this.sessionIdSpan) {
                    this.sessionIdSpan.textContent = this.sessionId;
                    console.log('Session ID已更新为:', this.sessionIdSpan.textContent);
                } else {
                    console.error('sessionIdSpan元素未找到，无法更新Session ID显示');
                    // 尝试重新获取元素
                    const sessionIdElement = document.getElementById('session-id');
                    if (sessionIdElement) {
                        sessionIdElement.textContent = this.sessionId;
                        console.log('通过重新获取元素更新Session ID:', sessionIdElement.textContent);
                    } else {
                        console.error('无法找到session-id元素');
                    }
                }
                
                // 设置通信监听
                this.setupCommunication();
                
                // 启用发送按钮和输入框
                if (this.sendButton) {
                    this.sendButton.disabled = false;
                }
                if (this.messageInput) {
                    this.messageInput.disabled = false;
                    this.messageInput.placeholder = this.t('placeholder');
                }
                
                // 显示成功消息
                this.addMessage('system', this.t('joinedSession') + ' ' + sessionId);
                
                console.log(`成功加入会话: ${sessionId}`);
            } else {
                alert('加入会话失败，请稍后重试');
            }
            
        } catch (error) {
            console.error('加入会话时出错:', error);
            alert('加入会话时出错: ' + error.message);
        }
    }

    // 加载图片预览
    async loadImagePreview(fileId, containerElement, loadingIndicator) {
        try {
            console.log('=== 开始加载图片预览 ===');
            console.log('文件ID:', fileId);
            console.log('当前会话ID:', this.sessionId);
            
            if (!this.comm || !this.comm.getFileData) {
                console.error('通信模块检查失败:', { comm: !!this.comm, getFileData: !!(this.comm && this.comm.getFileData) });
                throw new Error('通信模块未初始化或不支持文件下载');
            }
            
            // 从Firebase获取文件数据
            const fileData = await this.comm.getFileData(fileId, this.sessionId);
            
            if (!fileData) {
                throw new Error('文件不存在或已被删除');
            }
            
            // 处理不同类型的文件存储
            let imageUrl;
            if (fileData.downloadURL) {
                // 大文件存储在Firebase Storage中，直接使用下载URL
                imageUrl = fileData.downloadURL;
            } else if (fileData.content) {
                // 文件内容存储在数据库中（Base64格式）
                // 如果已经是data URL格式，直接使用
                if (fileData.content.startsWith('data:')) {
                    imageUrl = fileData.content;
                } else {
                    // 否则创建data URL
                    imageUrl = `data:${fileData.type || 'image/jpeg'};base64,${fileData.content}`;
                }
            } else {
                throw new Error('文件内容不可用');
            }
            
            // 创建图片元素
            const imgElement = document.createElement('img');
            imgElement.classList.add('image-preview');
            
            // 图片加载完成后移除加载指示器
            imgElement.onload = () => {
                if (loadingIndicator && loadingIndicator.parentNode) {
                    loadingIndicator.parentNode.removeChild(loadingIndicator);
                }
            };
            
            // 图片加载失败处理
            imgElement.onerror = () => {
                if (loadingIndicator) {
                    loadingIndicator.textContent = '图片加载失败';
                }
                console.error('图片加载失败:', fileId);
            };
            
            // 创建缩略图容器
            const thumbnailContainer = document.createElement('div');
            thumbnailContainer.classList.add('image-preview');
            
            // 设置图片源并添加到缩略图容器
            imgElement.src = imageUrl;
            thumbnailContainer.appendChild(imgElement);
            
            // 添加点击查看大图功能
            thumbnailContainer.onclick = () => {
                this.showImageModal(imageUrl);
            };
            
            containerElement.appendChild(thumbnailContainer);
            
            // 添加操作按钮容器
            const actionsContainer = document.createElement('div');
            actionsContainer.classList.add('image-preview-actions');
            
            // 添加下载按钮
            const downloadBtn = document.createElement('button');
            downloadBtn.classList.add('preview-btn');
            downloadBtn.textContent = 'Download';
            downloadBtn.onclick = (e) => {
                e.stopPropagation(); // 防止触发查看大图
                // 创建下载链接
                const a = document.createElement('a');
                a.href = imageUrl;
                a.download = fileId.split('/').pop() || 'image';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
            };
            
            actionsContainer.appendChild(downloadBtn);
            containerElement.appendChild(actionsContainer);
            
            console.log('图片预览加载成功');
            
        } catch (error) {
            console.error('加载图片预览失败:', error);
            if (loadingIndicator) {
                loadingIndicator.textContent = '图片加载失败: ' + error.message;
            }
        }
    }

    // 下载文件
    async downloadFile(fileId, fileName) {
        try {
            console.log('=== 开始下载文件 ===');
            console.log('文件ID:', fileId);
            console.log('文件名:', fileName);
            console.log('当前会话ID:', this.sessionId);
            
            if (!this.comm || !this.comm.getFileData) {
                console.error('通信模块检查失败:', { comm: !!this.comm, getFileData: !!(this.comm && this.comm.getFileData) });
                throw new Error('通信模块未初始化或不支持文件下载');
            }
            
            console.log('正在从Firebase获取文件数据...');
            // 从Firebase获取文件数据
            const fileData = await this.comm.getFileData(fileId, this.sessionId);
            console.log('获取到的文件数据:', fileData);
            
            if (!fileData) {
                throw new Error('文件不存在或已被删除');
            }
            
            // 处理不同类型的文件存储
            let blob;
            if (fileData.downloadURL) {
                // 大文件存储在Firebase Storage中，直接下载
                const response = await fetch(fileData.downloadURL);
                blob = await response.blob();
            } else if (fileData.content) {
                // 文件内容存储在数据库中（Base64格式）
                const base64Data = fileData.content.split(',')[1]; // 移除data:type;base64,前缀
                const binaryString = atob(base64Data);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                blob = new Blob([bytes], { type: fileData.type || 'application/octet-stream' });
            } else {
                throw new Error('文件内容不可用');
            }
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            
            // 清理URL对象
            URL.revokeObjectURL(url);
            
            console.log('文件下载成功:', fileName);
            
        } catch (error) {
            console.error('下载文件失败:', error);
            alert('下载文件失败: ' + error.message);
        }
    }

    // 显示图片大图模态框
    showImageModal(imageUrl) {
        // 创建模态框
        const modal = document.createElement('div');
        modal.classList.add('image-modal');
        
        // 创建模态框内容
        const modalContent = document.createElement('div');
        modalContent.classList.add('image-modal-content');
        
        // 创建图片容器
        const imageContainer = document.createElement('div');
        imageContainer.classList.add('image-container');
        
        // 创建SVG画布用于绘制圆圈
        const svgCanvas = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svgCanvas.classList.add('drawing-canvas');
        
        // 创建大图
        const fullImage = document.createElement('img');
        fullImage.src = imageUrl;
        fullImage.classList.add('modal-image');
        
        // 创建关闭按钮（右上角）
        const closeBtn = document.createElement('button');
        closeBtn.classList.add('image-modal-close');
        closeBtn.innerHTML = '×';
        
        // 创建控制面板
        const controlPanel = document.createElement('div');
        controlPanel.classList.add('image-control-panel');
        
        // 创建缩放控制
        const zoomControl = document.createElement('div');
        zoomControl.classList.add('zoom-control');
        
        // Remove zoom control - not needed anymore
        
        // 创建反馈输入区域
        const feedbackArea = document.createElement('div');
        feedbackArea.classList.add('feedback-area');
        
        const feedbackInput = document.createElement('textarea');
        feedbackInput.placeholder = 'Enter your feedback about this image...';
        feedbackInput.classList.add('feedback-input');
        
        const sendButton = document.createElement('button');
        sendButton.textContent = 'Send Feedback';
        sendButton.classList.add('send-feedback-btn');
        
        feedbackArea.appendChild(feedbackInput);
        feedbackArea.appendChild(sendButton);
        
        controlPanel.appendChild(feedbackArea);
        
        // 组装图片容器
        imageContainer.appendChild(fullImage);
        imageContainer.appendChild(svgCanvas);
        
        // 组装模态框内容
        modalContent.appendChild(imageContainer);
        modalContent.appendChild(closeBtn);
        modalContent.appendChild(controlPanel);
        modal.appendChild(modalContent);
        
        // 变量存储
        let circles = [];
        let isDrawing = false;
        let currentPath = [];
        
        // 发送反馈功能
        sendButton.addEventListener('click', async () => {
            const feedback = feedbackInput.value.trim();
            if (feedback && this.sessionId && this.comm) {
                try {
                    // 如果有圆圈标注，生成标注图片
                    let annotatedImageData = null;
                    if (circles.length > 0) {
                        annotatedImageData = await this.generateAnnotatedImage(fullImage, svgCanvas, circles);
                    }
                    
                    // 发送反馈消息
                    await this.saveParticipantMessage(feedback);
                    this.addMessage('user', feedback);
                    
                    // 如果有标注图片，也发送图片
                    if (annotatedImageData) {
                        await this.sendAnnotatedImage(annotatedImageData, feedback);
                    }
                    
                    feedbackInput.value = '';
                    // Auto-close modal after sending feedback
                    closeModal();
                } catch (error) {
                    console.error('Failed to send feedback:', error);
                    alert('Failed to send feedback: ' + error.message);
                }
            }
        });
        
        // 画圈功能
        let startX, startY;
        
        const startDrawing = (e) => {
            isDrawing = true;
            currentPath = [];
            const rect = imageContainer.getBoundingClientRect();
            startX = e.clientX - rect.left;
            startY = e.clientY - rect.top;
            currentPath.push({ x: startX, y: startY });
        };
        
        const draw = (e) => {
            if (!isDrawing) return;
            const rect = imageContainer.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            currentPath.push({ x, y });
        };
        
        const endDrawing = () => {
            if (!isDrawing || currentPath.length < 3) {
                isDrawing = false;
                return;
            }
            
            // 计算拟合圆圈
            const circle = this.fitCircleToPath(currentPath);
            if (circle) {
                this.addCircleToSVG(svgCanvas, circle);
                circles.push(circle);
            }
            
            isDrawing = false;
            currentPath = [];
        };
        
        imageContainer.addEventListener('mousedown', startDrawing);
        imageContainer.addEventListener('mousemove', draw);
        imageContainer.addEventListener('mouseup', endDrawing);
        
        // 关闭功能
        const closeModal = () => {
            modal.classList.remove('show');
            document.removeEventListener('keydown', handleKeyPress);
            setTimeout(() => {
                if (document.body.contains(modal)) {
                    document.body.removeChild(modal);
                }
            }, 300);
        };
        
        closeBtn.onclick = closeModal;
        
        // 点击模态框背景关闭
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        
        // 键盘事件处理
        const handleKeyPress = (e) => {
            if (e.key === 'Escape') {
                closeModal();
            } else if (e.ctrlKey && e.key === 'z') {
                e.preventDefault();
                // 撤销最后一个圆圈
                if (circles.length > 0) {
                    circles.pop();
                    this.redrawCircles(svgCanvas, circles);
                }
            }
        };
        
        document.addEventListener('keydown', handleKeyPress);
        
        // 图片加载完成后设置SVG尺寸
        fullImage.onload = () => {
            // 等待图片完全渲染后再设置SVG尺寸
            setTimeout(() => {
                const imgRect = fullImage.getBoundingClientRect();
                const containerRect = imageContainer.getBoundingClientRect();
                
                // 计算图片在容器中的实际显示尺寸和位置
                const imgAspectRatio = fullImage.naturalWidth / fullImage.naturalHeight;
                const containerAspectRatio = containerRect.width / containerRect.height;
                
                let displayWidth, displayHeight, offsetX, offsetY;
                
                if (imgAspectRatio > containerAspectRatio) {
                    // 图片更宽，以宽度为准
                    displayWidth = containerRect.width;
                    displayHeight = containerRect.width / imgAspectRatio;
                    offsetX = 0;
                    offsetY = (containerRect.height - displayHeight) / 2;
                } else {
                    // 图片更高，以高度为准
                    displayHeight = containerRect.height;
                    displayWidth = containerRect.height * imgAspectRatio;
                    offsetX = (containerRect.width - displayWidth) / 2;
                    offsetY = 0;
                }
                
                // 设置SVG画布尺寸和位置
                svgCanvas.setAttribute('width', containerRect.width);
                svgCanvas.setAttribute('height', containerRect.height);
                svgCanvas.style.width = containerRect.width + 'px';
                svgCanvas.style.height = containerRect.height + 'px';
                
                // 存储图片的实际显示信息，供后续坐标转换使用
                fullImage._displayInfo = {
                    displayWidth,
                    displayHeight,
                    offsetX,
                    offsetY
                };
            }, 50);
        };
        
        document.body.appendChild(modal);
        
        // 显示模态框
        setTimeout(() => {
            modal.classList.add('show');
        }, 10);
    }

    // 拟合圆圈到鼠标路径
    fitCircleToPath(path) {
        if (path.length < 3) return null;
        
        // 计算路径的边界框
        let minX = path[0].x, maxX = path[0].x;
        let minY = path[0].y, maxY = path[0].y;
        
        for (let point of path) {
            minX = Math.min(minX, point.x);
            maxX = Math.max(maxX, point.x);
            minY = Math.min(minY, point.y);
            maxY = Math.max(maxY, point.y);
        }
        
        // 计算中心点和半径
        const centerX = (minX + maxX) / 2;
        const centerY = (minY + maxY) / 2;
        const radius = Math.min(maxX - minX, maxY - minY) / 2;
        
        // 确保半径合理
        if (radius < 10 || radius > 200) return null;
        
        return { x: centerX, y: centerY, radius };
    }

    // 添加圆圈到SVG
    addCircleToSVG(svg, circle) {
        const svgCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        svgCircle.setAttribute('cx', circle.x);
        svgCircle.setAttribute('cy', circle.y);
        svgCircle.setAttribute('r', circle.radius);
        svgCircle.setAttribute('fill', 'rgba(255, 165, 0, 0.2)');
        svgCircle.setAttribute('stroke', 'orange');
        svgCircle.setAttribute('stroke-width', '2');
        svg.appendChild(svgCircle);
    }

    // 重绘所有圆圈
    redrawCircles(svg, circles) {
        // 清除所有现有圆圈
        while (svg.firstChild) {
            svg.removeChild(svg.firstChild);
        }
        
        // 重新绘制所有圆圈
        for (let circle of circles) {
            this.addCircleToSVG(svg, circle);
        }
    }
    
    // 生成带标注的图片
    async generateAnnotatedImage(imageElement, svgElement, circles) {
        return new Promise((resolve) => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // 设置画布尺寸与图片相同
            canvas.width = imageElement.naturalWidth;
            canvas.height = imageElement.naturalHeight;
            
            // 获取图片的实际显示信息
            const displayInfo = imageElement._displayInfo;
            if (!displayInfo) {
                console.error('图片显示信息未找到，使用默认缩放');
                // 回退到原有逻辑
                const scaleX = imageElement.naturalWidth / imageElement.offsetWidth;
                const scaleY = imageElement.naturalHeight / imageElement.offsetHeight;
                
                // 绘制原图
                ctx.drawImage(imageElement, 0, 0);
                
                // 绘制圆圈标注（使用与SVG相同的颜色）
                 ctx.strokeStyle = 'orange';
                 ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
                 ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
                
                circles.forEach(circle => {
                    const scaledX = circle.x * scaleX;
                    const scaledY = circle.y * scaleY;
                    const scaledRadius = circle.radius * Math.min(scaleX, scaleY);
                    
                    ctx.beginPath();
                    ctx.arc(scaledX, scaledY, scaledRadius, 0, 2 * Math.PI);
                    ctx.fill();
                    ctx.stroke();
                });
            } else {
                // 使用正确的坐标转换
                const scaleX = imageElement.naturalWidth / displayInfo.displayWidth;
                const scaleY = imageElement.naturalHeight / displayInfo.displayHeight;
                
                // 绘制原图
                ctx.drawImage(imageElement, 0, 0);
                
                // 绘制圆圈标注（使用与SVG相同的颜色）
                 ctx.strokeStyle = 'orange';
                 ctx.lineWidth = 2 * Math.min(scaleX, scaleY);
                 ctx.fillStyle = 'rgba(255, 165, 0, 0.2)';
                
                circles.forEach(circle => {
                    // 调整坐标：减去图片在容器中的偏移，然后缩放到原图尺寸
                    const adjustedX = (circle.x - displayInfo.offsetX) * scaleX;
                    const adjustedY = (circle.y - displayInfo.offsetY) * scaleY;
                    const adjustedRadius = circle.radius * Math.min(scaleX, scaleY);
                    
                    // 确保坐标在图片范围内
                    if (adjustedX >= 0 && adjustedX <= imageElement.naturalWidth &&
                        adjustedY >= 0 && adjustedY <= imageElement.naturalHeight &&
                        adjustedRadius > 0) {
                        ctx.beginPath();
                        ctx.arc(adjustedX, adjustedY, adjustedRadius, 0, 2 * Math.PI);
                        ctx.fill();
                        ctx.stroke();
                    }
                });
            }
            
            // 转换为base64数据
            const imageData = canvas.toDataURL('image/png');
            resolve(imageData);
        });
     }
     
     // 发送标注图片
     async sendAnnotatedImage(imageData, feedback) {
         try {
             // 将base64数据转换为Blob
             const base64Data = imageData.split(',')[1];
             const byteCharacters = atob(base64Data);
             const byteNumbers = new Array(byteCharacters.length);
             for (let i = 0; i < byteCharacters.length; i++) {
                 byteNumbers[i] = byteCharacters.charCodeAt(i);
             }
             const byteArray = new Uint8Array(byteNumbers);
             const blob = new Blob([byteArray], { type: 'image/png' });
             
             // 创建File对象
             const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
             const fileName = `annotated-feedback-${timestamp}.png`;
             const file = new File([blob], fileName, { type: 'image/png' });
             
             // 使用现有的文件上传逻辑
             await this.uploadFile(file);
             
         } catch (error) {
             console.error('Failed to send annotated image:', error);
             throw error;
         }
     }
 
     // 清理资源
    destroy() {
        if (this.pollInterval) {
            clearInterval(this.pollInterval);
        }
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    window.participantInterface = new ParticipantInterface();
    initializeControlPanel();
});

// 初始化控制面板
function initializeControlPanel() {
    setupModeToggle();
    setupSliders();
    setupImageSettings();
    setupTooltips();
}

// 设置模式切换
function setupModeToggle() {
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    const modeTitle = document.getElementById('settings-mode-title');
    const modeIcon = document.getElementById('mode-toggle-icon');
    const textSettings = document.getElementById('text-settings');
    const imageSettings = document.getElementById('image-settings');
    
    let isTextMode = true;
    
    modeToggleBtn.addEventListener('click', function() {
        isTextMode = !isTextMode;
        
        if (isTextMode) {
            modeTitle.textContent = window.participantInterface ? window.participantInterface.t('aiPersonalitySettings') : 'AI Personality Settings';
            modeIcon.innerHTML = `
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="9" cy="9" r="2"></circle>
                <path d="M21 15l-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
            `;
            // 更新为正确的ID
            const aiPersonalitySettings = document.getElementById('ai-personality-settings');
            const imageSettings = document.getElementById('image-settings');
            if (aiPersonalitySettings) aiPersonalitySettings.classList.add('active');
            if (imageSettings) imageSettings.classList.remove('active');
        } else {
            modeTitle.textContent = window.participantInterface ? window.participantInterface.t('imageEditSettings') : 'Image Edit Settings';
            modeIcon.innerHTML = `
                <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"></path>
                <polyline points="14,2 14,8 20,8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10,9 9,9 8,9"></polyline>
            `;
            // 更新为正确的ID
            const aiPersonalitySettings = document.getElementById('ai-personality-settings');
            const imageSettings = document.getElementById('image-settings');
            if (aiPersonalitySettings) aiPersonalitySettings.classList.remove('active');
            if (imageSettings) imageSettings.classList.add('active');
        }
    });
}

// 计算滑块显示值的函数
function calculateSliderDisplayValue(rawValue) {
    // 原始值范围：0-10，中间点是5
    // 显示值逻辑：中间点为0，两端都为5
    // 0-5映射到5-0，6-10映射到1-5
    if (rawValue <= 5) {
        return 5 - rawValue; // 5,4,3,2,1,0
    } else {
        return rawValue - 5; // 1,2,3,4,5
    }
}

// 设置滑块
function setupSliders() {
    // Creativity 滑块
    const creativitySlider = document.getElementById('creativity-slider');
    const creativityValue = document.getElementById('creativity-value');
    
    if (creativitySlider && creativityValue) {
        creativitySlider.addEventListener('input', function() {
            const rawValue = parseInt(this.value);
            const displayValue = calculateSliderDisplayValue(rawValue);
            creativityValue.textContent = displayValue;
        });
    }
    
    // Personality 滑块
    const personalitySlider = document.getElementById('personality-slider');
    const personalityValue = document.getElementById('personality-value');
    
    if (personalitySlider && personalityValue) {
        personalitySlider.addEventListener('input', function() {
            const rawValue = parseInt(this.value);
            const displayValue = calculateSliderDisplayValue(rawValue);
            personalityValue.textContent = displayValue;
        });
    }
    
    // Working Style 滑块
    const workstyleSlider = document.getElementById('workstyle-slider');
    const workstyleValue = document.getElementById('workstyle-value');
    
    if (workstyleSlider && workstyleValue) {
        workstyleSlider.addEventListener('input', function() {
            const rawValue = parseInt(this.value);
            const displayValue = calculateSliderDisplayValue(rawValue);
            workstyleValue.textContent = displayValue;
        });
    }
}

// 开关功能已移除，新设计只使用滑块

// 滑块和输入框同步函数
function setupSliderInputSync(config) {
    const slider = document.getElementById(config.slider);
    const input = document.getElementById(config.input);
    
    if (!slider || !input) {
        console.warn(`Slider or input not found: ${config.slider}, ${config.input}`);
        return;
    }
    
    // 滑块变化时更新输入框
    slider.addEventListener('input', function() {
        input.value = this.value;
    });
    
    // 输入框变化时更新滑块
    input.addEventListener('input', function() {
        const value = parseInt(this.value);
        const min = parseInt(slider.min);
        const max = parseInt(slider.max);
        
        // 验证输入值范围
        if (value >= min && value <= max) {
            slider.value = value;
        } else if (value < min) {
            this.value = min;
            slider.value = min;
        } else if (value > max) {
            this.value = max;
            slider.value = max;
        }
    });
    
    // 输入框失去焦点时验证
    input.addEventListener('blur', function() {
        const value = parseInt(this.value) || parseInt(slider.min);
        const min = parseInt(slider.min);
        const max = parseInt(slider.max);
        
        if (value < min) {
            this.value = min;
            slider.value = min;
        } else if (value > max) {
            this.value = max;
            slider.value = max;
        }
    });
}

// 设置图片编辑功能
function setupImageSettings() {
    // 设置图片编辑滑块同步
    const imageSliders = [
        { slider: 'width-slider', input: 'width-input' },
        { slider: 'height-slider', input: 'height-input' },
        { slider: 'sampling-steps-slider', input: 'sampling-steps-input' },
        { slider: 'batch-count-slider', input: 'batch-count-input' },
        { slider: 'batch-size-slider', input: 'batch-size-input' }
    ];
    
    imageSliders.forEach(setupSliderInputSync);
    
    console.log('Image settings initialized');
}

// 设置提示框功能
function setupTooltips() {
    const helpIcons = document.querySelectorAll('.help-icon');
    
    helpIcons.forEach(icon => {
        let tooltip = null;
        
        icon.addEventListener('mouseenter', function() {
            const tooltipKey = this.getAttribute('data-tooltip');
            if (!tooltipKey) return;
            
            // 创建提示框
            tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            
            // 获取对应的提示文本
            const tooltipText = window.participantInterface ? 
                window.participantInterface.t(tooltipKey + 'Tooltip') : 
                (tooltipKey === 'creativity' ? '智能体在执行任务时被允许的创意发散程度' :
                 tooltipKey === 'personality' ? '智能体在提供回答时使用的语言风格' :
                 tooltipKey === 'workingStyle' ? '智能体在执行任务时被允许的自主能动程度' : '');
            
            tooltip.textContent = tooltipText;
            
            // 添加到图标容器
            this.appendChild(tooltip);
            
            // 显示提示框
            setTimeout(() => {
                if (tooltip) {
                    tooltip.classList.add('show');
                }
            }, 50);
        });
        
        icon.addEventListener('mouseleave', function() {
            if (tooltip) {
                tooltip.classList.remove('show');
                setTimeout(() => {
                    if (tooltip && tooltip.parentNode) {
                        tooltip.parentNode.removeChild(tooltip);
                    }
                    tooltip = null;
                }, 200);
            }
        });
    });
}

// 页面卸载时清理资源
window.addEventListener('beforeunload', () => {
    if (window.participantInterface) {
        window.participantInterface.destroy();
    }
});