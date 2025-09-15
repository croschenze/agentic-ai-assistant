// 共享通信模块 - 处理巫师端和被测者端之间的数据同步
class WizardOfOzCommunication {
    constructor() {
        this.storagePrefix = 'woz_';
        this.sessionPrefix = 'woz_participant_';
        this.listeners = new Map();
        this.uploadedFiles = new Map();
        
        // 初始化Firebase数据库连接
        this.database = null;
        this.initFirebase();
        
        // 初始化混合存储管理器
        this.hybridStorage = null;
        this.storageReady = false;
        this.storageMonitor = null;
        this.largeFileHandler = null;
        this.initStorage().catch(error => {
            console.error('存储初始化失败:', error);
        });
        
        this.setupStorageListener();
        
        // 初始化时清理过期数据
        this.initializeCleanup();
    }
    
    // 初始化Firebase连接
    initFirebase() {
        try {
            if (typeof window !== 'undefined' && window.FirebaseConfig) {
                const success = window.FirebaseConfig.initializeFirebase();
                if (success) {
                    this.database = window.FirebaseConfig.getDatabase();
                    console.log('通信模块Firebase连接已建立');
                } else {
                    console.warn('Firebase初始化失败，将使用本地存储');
                }
            } else {
                console.warn('Firebase配置不可用，将使用本地存储');
            }
        } catch (error) {
            console.error('Firebase初始化错误:', error);
        }
    }
    
    // 初始化存储系统
    async initStorage() {
        try {
            console.log('初始化混合存储系统...');
            this.hybridStorage = new HybridStorage();
            await this.hybridStorage.init();
            
            // 初始化存储监控器
            this.storageMonitor = new StorageMonitor(this.hybridStorage);
            await this.storageMonitor.init();
            
            // 初始化大文件处理器
            this.largeFileHandler = new LargeFileHandler(this.hybridStorage);
            
            this.storageReady = true;
            console.log('混合存储系统、监控器和大文件处理器初始化完成');
            
            // 获取存储统计信息
            const stats = await this.hybridStorage.getStorageStats();
            console.log('存储统计信息:', stats);
            
            // 启动存储监控
            this.storageMonitor.startMonitoring();
        } catch (error) {
            console.error('混合存储初始化失败，尝试删除数据库并重试:', error);
            try {
                if (this.hybridStorage && this.hybridStorage.indexedDBStorage) {
                    await this.hybridStorage.indexedDBStorage.deleteDatabase();
                    console.log('数据库删除成功，正在重试初始化...');
                    // 重新初始化
                    this.hybridStorage = new HybridStorage();
                    await this.hybridStorage.init();
                    console.log('混合存储重试成功');
                } else {
                    throw new Error('无法访问indexedDBStorage实例');
                }
            } catch (retryError) {
                console.error('混合存储重试失败，回退到localStorage:', retryError);
                this.hybridStorage = null;
                this.storageMonitor = null;
                this.largeFileHandler = null;
            }
        }
        this.storageReady = true; // 确保在任何情况下都设置
    }
    
    // 初始化清理机制
    initializeCleanup() {
        console.log('初始化存储清理机制...');
        
        // 立即执行一次清理
        const cleanedCount = this.cleanupExpiredSessions();
        console.log('初始清理完成，清理了', cleanedCount, '个过期会话');
        
        // 设置定期清理（每30分钟）
        setInterval(() => {
            console.log('执行定期存储清理...');
            const cleaned = this.cleanupExpiredSessions();
            if (cleaned > 0) {
                console.log('定期清理完成，清理了', cleaned, '个过期会话');
            }
        }, 30 * 60 * 1000); // 30分钟
        
        // 检查当前存储使用情况
        const usage = this.getStorageUsage();
        console.log('当前存储使用情况:', usage);
        
        // 如果使用率超过80%，执行更激进的清理
        if (parseFloat(usage.usagePercentage) > 80) {
            console.warn('存储使用率过高，执行激进清理...');
            this.aggressiveCleanup();
        }
    }
    
    // 激进清理机制
    aggressiveCleanup() {
        console.log('开始激进清理...');
        
        // 清理超过1小时的会话
        const now = new Date();
        const expiredKeys = [];
        const fullSessionPrefix = this.storagePrefix + this.sessionPrefix;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(fullSessionPrefix)) {
                try {
                    const sessionData = JSON.parse(localStorage.getItem(key));
                    const lastActivity = new Date(sessionData.lastActivity || sessionData.createdAt);
                    const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
                    
                    if (hoursSinceActivity > 1) { // 1小时
                        expiredKeys.push(key);
                    }
                } catch (error) {
                    expiredKeys.push(key);
                }
            }
        }
        
        expiredKeys.forEach(key => localStorage.removeItem(key));
        console.log('激进清理完成，清理了', expiredKeys.length, '个会话');
        
        return expiredKeys.length;
    }
    
    // 设置localStorage变化监听器
    setupStorageListener() {
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith(this.storagePrefix)) {
                this.handleStorageChange(e.key, e.newValue, e.oldValue);
            }
        });
        
        // 对于同一页面内的变化，使用自定义事件
        window.addEventListener('woz-storage-change', (e) => {
            this.handleStorageChange(e.detail.key, e.detail.newValue, e.detail.oldValue);
        });
    }
    
    // 处理存储变化
    handleStorageChange(key, newValue, oldValue) {
        const listeners = this.listeners.get(key);
        if (listeners) {
            listeners.forEach(callback => {
                try {
                    callback(newValue ? JSON.parse(newValue) : null, oldValue ? JSON.parse(oldValue) : null);
                } catch (error) {
                    console.error('处理存储变化时出错:', error);
                }
            });
        }
    }
    
    // 添加监听器
    addListener(key, callback) {
        const fullKey = this.storagePrefix + key;
        if (!this.listeners.has(fullKey)) {
            this.listeners.set(fullKey, new Set());
        }
        this.listeners.get(fullKey).add(callback);
    }
    
    // 移除监听器
    removeListener(key, callback) {
        const fullKey = this.storagePrefix + key;
        const listeners = this.listeners.get(fullKey);
        if (listeners) {
            listeners.delete(callback);
            if (listeners.size === 0) {
                this.listeners.delete(fullKey);
            }
        }
    }
    
    // 设置数据到localStorage
    async setData(key, data) {
        // 等待存储系统准备就绪
        while (!this.storageReady) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        try {
            const fullKey = this.storagePrefix + key;
            const jsonData = JSON.stringify(data);
            console.log('保存数据:', { key: fullKey, dataSize: jsonData.length, storage: this.hybridStorage ? 'hybrid' : 'localStorage' });
            
            let success = false;
            let oldValue = null;
            
            if (this.hybridStorage) {
                // 使用混合存储管理器
                oldValue = await this.hybridStorage.getItem(fullKey);
                success = await this.hybridStorage.setItem(fullKey, data);
            } else {
                // 回退到localStorage
                oldValue = localStorage.getItem(fullKey);
                localStorage.setItem(fullKey, jsonData);
                success = true;
            }
            
            if (success) {
                console.log('数据保存成功');
                
                // 触发自定义事件以处理同一页面内的变化
                window.dispatchEvent(new CustomEvent('woz-storage-change', {
                    detail: {
                        key: fullKey,
                        newValue: jsonData,
                        oldValue: oldValue ? JSON.stringify(oldValue) : null
                    }
                }));
                return true;
            } else {
                throw new Error('存储操作失败');
            }
        } catch (error) {
            console.error('存储数据失败:', error);
            
            // 如果混合存储失败，尝试回退到localStorage
            if (this.hybridStorage && !error.message.includes('localStorage')) {
                console.warn('混合存储失败，尝试回退到localStorage...');
                try {
                    const fullKey = this.storagePrefix + key;
                    const jsonData = JSON.stringify(data);
                    const oldValue = localStorage.getItem(fullKey);
                    localStorage.setItem(fullKey, jsonData);
                    
                    // 触发自定义事件
                    window.dispatchEvent(new CustomEvent('woz-storage-change', {
                        detail: {
                            key: fullKey,
                            newValue: jsonData,
                            oldValue: oldValue
                        }
                    }));
                    return true;
                } catch (fallbackError) {
                    console.error('localStorage回退也失败:', fallbackError);
                }
            }
            
            return false;
        }
    }
    
    // 获取数据
    async getData(key) {
        // 等待存储系统准备就绪
        while (!this.storageReady) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        try {
            const fullKey = this.storagePrefix + key;
            
            if (this.hybridStorage) {
                // 使用混合存储管理器
                return await this.hybridStorage.getItem(fullKey);
            } else {
                // 回退到localStorage
                const data = localStorage.getItem(fullKey);
                return data ? JSON.parse(data) : null;
            }
        } catch (error) {
            console.error('获取数据失败:', error);
            
            // 如果混合存储失败，尝试从localStorage获取
            if (this.hybridStorage) {
                try {
                    const fullKey = this.storagePrefix + key;
                    const data = localStorage.getItem(fullKey);
                    return data ? JSON.parse(data) : null;
                } catch (fallbackError) {
                    console.error('localStorage回退获取也失败:', fallbackError);
                }
            }
            
            return null;
        }
    }
    
    // 删除数据
    async removeData(key) {
        // 等待存储系统准备就绪
        while (!this.storageReady) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        try {
            const fullKey = this.storagePrefix + key;
            
            if (this.hybridStorage) {
                // 使用混合存储管理器
                await this.hybridStorage.removeItem(fullKey);
            } else {
                // 回退到localStorage
                localStorage.removeItem(fullKey);
            }
            
            window.dispatchEvent(new CustomEvent('woz-storage-change', {
                detail: {
                    key: fullKey,
                    newValue: null,
                    oldValue: null
                }
            }));
        } catch (error) {
            console.error('删除数据失败:', error);
        }
    }
    
    // 获取所有活跃会话
    async getActiveSessions() {
        const sessions = [];
        const fullSessionPrefix = this.sessionPrefix;
        console.log('搜索会话，完整前缀:', fullSessionPrefix);
        
        // 首先检查Firebase数据库
        if (this.database) {
            try {
                const snapshot = await this.database.ref('sessions').once('value');
                const firebaseSessions = snapshot.val();
                console.log('Firebase会话数据:', firebaseSessions);
                
                if (firebaseSessions) {
                    Object.keys(firebaseSessions).forEach(sessionId => {
                        const sessionData = firebaseSessions[sessionId];
                        if (sessionData && sessionData.status === 'active') {
                            sessions.push({
                                sessionId: sessionId,
                                createdAt: sessionData.createdAt,
                                status: sessionData.status,
                                participantMessages: [],
                                aiResponses: []
                            });
                            console.log('添加Firebase活跃会话:', sessionId);
                        }
                    });
                }
            } catch (error) {
                console.error('从Firebase获取会话时出错:', error);
            }
        }
        
        // 然后检查localStorage
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            console.log('检查localStorage键:', key);
            if (key && key.startsWith(fullSessionPrefix)) {
                try {
                    const sessionData = JSON.parse(localStorage.getItem(key));
                    console.log('找到localStorage会话数据:', sessionData);
                    if (sessionData && sessionData.status === 'active') {
                        // 检查是否已经在Firebase中找到了这个会话
                        const existingSession = sessions.find(s => s.sessionId === sessionData.sessionId);
                        if (!existingSession) {
                            sessions.push(sessionData);
                            console.log('添加localStorage活跃会话:', sessionData.sessionId);
                        }
                    }
                } catch (error) {
                    console.error('解析localStorage会话数据时出错:', error);
                }
            }
        }
        
        // 最后检查IndexedDB（如果混合存储可用）
        if (this.hybridStorage && this.hybridStorage.indexedDBStorage) {
            try {
                const allKeys = await this.hybridStorage.indexedDBStorage.getAllKeys();
                console.log('IndexedDB所有键:', allKeys);
                
                for (const key of allKeys) {
                    if (key.startsWith(fullSessionPrefix)) {
                        try {
                            const sessionData = await this.hybridStorage.indexedDBStorage.getItem(key);
                            console.log('找到IndexedDB会话数据:', sessionData);
                            if (sessionData && sessionData.status === 'active') {
                                // 检查是否已经在其他存储中找到了这个会话
                                const existingSession = sessions.find(s => s.sessionId === sessionData.sessionId);
                                if (!existingSession) {
                                    sessions.push(sessionData);
                                    console.log('添加IndexedDB活跃会话:', sessionData.sessionId);
                                }
                            }
                        } catch (error) {
                            console.error('解析IndexedDB会话数据时出错:', error);
                        }
                    }
                }
            } catch (error) {
                console.error('检查IndexedDB会话时出错:', error);
            }
        }
        
        console.log('找到的活跃会话总数:', sessions.length);
        return sessions.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    
    // 获取特定会话数据
    async getSessionData(sessionId) {
        const key = this.sessionPrefix + sessionId;
        console.log('获取会话数据，键:', key);
        
        // 使用混合存储系统获取数据
        const result = await this.getData(key);
        console.log('会话数据结果:', result ? '找到数据' : '未找到数据');
        return result;
    }
    
    // 保存会话数据（创建新会话或更新现有会话）
    async saveSession(sessionData) {
        console.log('保存会话数据:', sessionData);
        const sessionId = sessionData.sessionId || sessionData.id;
        if (!sessionId) {
            console.error('会话数据缺少sessionId');
            return false;
        }
        
        const key = this.sessionPrefix + sessionId;
        const saveResult = await this.setData(key, sessionData);
        
        // 同时保存到Firebase
        if (this.database) {
            try {
                await this.database.ref(`sessions/${sessionId}`).set(sessionData);
                console.log('会话数据已保存到Firebase:', sessionId);
            } catch (error) {
                console.error('保存会话到Firebase失败:', error);
            }
        }
        
        if (!saveResult) {
            console.error('会话数据保存失败');
            return false;
        }
        console.log('会话数据保存成功');
        return true;
    }
    
    // 更新会话数据
    async updateSessionData(sessionId, updates) {
        const currentData = await this.getSessionData(sessionId) || {};
        const updatedData = { ...currentData, ...updates };
        console.log('更新会话数据:', { sessionId, updates });
        const key = this.sessionPrefix + sessionId;
        const saveResult = await this.setData(key, updatedData);
        if (!saveResult) {
            console.error('会话数据更新失败');
            return null;
        }
        console.log('会话数据更新成功');
        return updatedData;
    }
    
    // 添加AI回复到会话
    async addAIResponse(sessionId, content, metadata = {}) {
        const sessionData = await this.getSessionData(sessionId);
        if (!sessionData) {
            console.error('会话不存在:', sessionId);
            return false;
        }
        
        const response = {
            content,
            timestamp: new Date().toISOString(),
            ...metadata
        };
        
        if (!sessionData.aiResponses) {
            sessionData.aiResponses = [];
        }
        
        sessionData.aiResponses.push(response);
        sessionData.lastActivity = new Date().toISOString();
        
        const key = this.storagePrefix + this.sessionPrefix + sessionId;
        localStorage.setItem(key, JSON.stringify(sessionData));
        console.log('AI回复已保存到:', key);
        
        // 触发ai_response事件通知被测者端
        console.log('准备触发ai_response事件:', { sessionId, content });
        this.handleStorageChange('ai_response', JSON.stringify({
            sessionId,
            content,
            timestamp: response.timestamp
        }), null);
        console.log('ai_response事件已触发');
        
        return true;
    }
    
    // 获取会话的新消息（自指定时间戳后）
    async getNewMessages(sessionId, afterTimestamp = null) {
        const sessionData = await this.getSessionData(sessionId);
        if (!sessionData || !sessionData.participantMessages) {
            return [];
        }
        
        if (!afterTimestamp) {
            return sessionData.participantMessages;
        }
        
        return sessionData.participantMessages.filter(msg => 
            new Date(msg.timestamp) > new Date(afterTimestamp)
        );
    }
    
    // 标记会话为已读
    async markSessionAsRead(sessionId, wizardId = 'wizard') {
        const readKey = `session_read_${sessionId}_${wizardId}`;
        await this.setData(readKey, {
            timestamp: new Date().toISOString(),
            sessionId,
            wizardId
        });
    }
    
    // 检查会话是否有未读消息
    async hasUnreadMessages(sessionId, wizardId = 'wizard') {
        const sessionData = await this.getSessionData(sessionId);
        if (!sessionData || !sessionData.participantMessages || sessionData.participantMessages.length === 0) {
            return false;
        }
        
        const readKey = `session_read_${sessionId}_${wizardId}`;
        const readData = await this.getData(readKey);
        
        if (!readData) {
            return true; // 从未读过
        }
        
        const lastReadTime = new Date(readData.timestamp);
        const lastMessageTime = new Date(sessionData.participantMessages[sessionData.participantMessages.length - 1].timestamp);
        
        return lastMessageTime > lastReadTime;
    }
    
    // 清理过期会话（超过24小时无活动）
    cleanupExpiredSessions() {
        const now = new Date();
        const expiredKeys = [];
        const fullSessionPrefix = this.storagePrefix + this.sessionPrefix;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(fullSessionPrefix)) {
                try {
                    const sessionData = JSON.parse(localStorage.getItem(key));
                    const lastActivity = new Date(sessionData.lastActivity || sessionData.createdAt);
                    const hoursSinceActivity = (now - lastActivity) / (1000 * 60 * 60);
                    
                    if (hoursSinceActivity > 24) {
                        expiredKeys.push(key);
                    }
                } catch (error) {
                    // 如果数据损坏，也删除
                    expiredKeys.push(key);
                }
            }
        }
        
        expiredKeys.forEach(key => localStorage.removeItem(key));
        return expiredKeys.length;
    }
    
    // 获取localStorage使用情况
    getStorageUsage() {
        let totalSize = 0;
        let itemCount = 0;
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) {
                const value = localStorage.getItem(key);
                totalSize += key.length + (value ? value.length : 0);
                itemCount++;
            }
        }
        
        return {
            totalSize: totalSize,
            totalSizeMB: (totalSize / (1024 * 1024)).toFixed(2),
            itemCount: itemCount,
            estimatedQuota: 5 * 1024 * 1024, // 5MB估计配额
            usagePercentage: ((totalSize / (5 * 1024 * 1024)) * 100).toFixed(2)
        };
    }
    
    // 导出会话数据（用于分析）
    exportSessionData(sessionId) {
        const sessionData = this.getSessionData(sessionId);
        if (!sessionData) {
            return null;
        }
        
        return {
            sessionInfo: {
                sessionId: sessionData.sessionId,
                createdAt: sessionData.createdAt,
                lastActivity: sessionData.lastActivity,
                status: sessionData.status
            },
            messages: sessionData.participantMessages || [],
            responses: sessionData.aiResponses || []
        };
    }

    // 删除会话（同时删除本地存储和Firebase）
    async deleteSession(sessionId) {
        try {
            console.log('删除会话:', sessionId);
            let success = true;
            
            // 1. 删除本地存储中的会话数据
            const localKey = this.sessionPrefix + sessionId;
            const fullKey = this.storagePrefix + localKey;
            
            // 从localStorage删除
            if (localStorage.getItem(fullKey)) {
                localStorage.removeItem(fullKey);
                console.log('已从localStorage删除会话:', sessionId);
            }
            
            // 从IndexedDB删除（如果使用混合存储）
            if (this.hybridStorage && this.hybridStorage.indexedDBStorage) {
                try {
                    await this.hybridStorage.indexedDBStorage.removeData(localKey);
                    console.log('已从IndexedDB删除会话:', sessionId);
                } catch (error) {
                    console.warn('从IndexedDB删除会话失败:', error);
                }
            }
            
            // 2. 删除Firebase中的会话数据
            if (this.firebaseComm) {
                try {
                    const firebaseSuccess = await this.firebaseComm.deleteSession(sessionId);
                    if (!firebaseSuccess) {
                        console.warn('Firebase会话删除失败');
                        success = false;
                    }
                } catch (error) {
                    console.error('删除Firebase会话时出错:', error);
                    success = false;
                }
            }
            
            // 3. 清理相关的本地缓存
            const readKey = `session_read_${sessionId}_wizard`;
            localStorage.removeItem(readKey);
            
            // 清理文件相关的localStorage缓存
            for (let i = localStorage.length - 1; i >= 0; i--) {
                const key = localStorage.key(i);
                if (key && key.startsWith(`file_content_${sessionId}_`)) {
                    localStorage.removeItem(key);
                }
            }
            
            console.log(`会话 ${sessionId} 删除${success ? '成功' : '部分成功'}`);
            return success;
        } catch (error) {
            console.error('删除会话失败:', error);
            return false;
        }
    }
    
    // 获取统计信息
    getStatistics() {
        const sessions = this.getActiveSessions();
        const totalSessions = sessions.length;
        let totalMessages = 0;
        let totalResponses = 0;
        
        sessions.forEach(session => {
            totalMessages += (session.participantMessages || []).length;
            totalResponses += (session.aiResponses || []).length;
        });
        
        return {
            totalSessions,
            totalMessages,
            totalResponses,
            averageMessagesPerSession: totalSessions > 0 ? (totalMessages / totalSessions).toFixed(2) : 0,
            averageResponsesPerSession: totalSessions > 0 ? (totalResponses / totalSessions).toFixed(2) : 0
        };
    }
    
    // 生成唯一ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    // 保存上传的文件
    async saveUploadedFile(sessionId, fileData) {
        console.log('=== 通信模块开始保存文件 ===');
        console.log('会话ID:', sessionId);
        console.log('文件数据:', {
            id: fileData.id,
            name: fileData.name,
            type: fileData.type,
            size: fileData.size,
            contentLength: fileData.content ? fileData.content.length : 0,
            uploader: fileData.uploader,
            uploadTime: fileData.uploadTime
        });
        
        try {
            // 检查存储空间并清理过期会话
            console.log('检查存储空间...');
            const cleanedCount = this.cleanupExpiredSessions();
            console.log('清理过期会话数量:', cleanedCount);
            
            // 检查当前localStorage使用情况
            const currentUsage = this.getStorageUsage();
            console.log('当前存储使用情况:', currentUsage);
            
            // 如果文件太大，尝试压缩或拒绝
            const estimatedSize = JSON.stringify(fileData).length;
            console.log('预估文件存储大小:', estimatedSize, 'bytes');
            
            if (estimatedSize > 2 * 1024 * 1024) { // 2MB限制
                console.warn('文件过大，尝试优化存储...');
                // 移除文件内容，只保存元数据
                fileData = {
                    ...fileData,
                    content: null,
                    contentRemoved: true,
                    reason: 'File too large for localStorage'
                };
                console.log('已移除文件内容，仅保存元数据');
            }
            console.log('获取会话数据...');
            let sessionData = await this.getSessionData(sessionId);
            console.log('现有会话数据:', {
                exists: !!sessionData,
                hasMessages: sessionData && sessionData.messages ? sessionData.messages.length : 0,
                hasUploadedFiles: sessionData && sessionData.uploadedFiles ? sessionData.uploadedFiles.length : 0
            });
            
            if (!sessionData) {
                console.log('创建新的会话数据...');
                sessionData = {
                    id: sessionId,
                    participantMessages: [],
                    aiResponses: [],
                    uploadedFiles: [],
                    createdAt: new Date().toISOString(),
                    lastActivity: new Date().toISOString()
                };
            }
            
            if (!sessionData.uploadedFiles) {
                console.log('初始化uploadedFiles数组...');
                sessionData.uploadedFiles = [];
            }
            
            console.log('添加文件到会话数据...');
            sessionData.uploadedFiles.push(fileData);
            sessionData.lastActivity = new Date().toISOString();
            console.log('文件添加后的数组长度:', sessionData.uploadedFiles.length);
            
            // 单独保存文件数据以供下载使用
            console.log('保存文件数据到localStorage...');
            const fileKey = `file_${fileData.id}`;
            const fileSaveResult = await this.setData(fileKey, fileData);
            if (!fileSaveResult) {
                console.error('文件数据保存失败');
                return null;
            }
            
            // 同时保存到内存中
            this.uploadedFiles.set(fileData.id, fileData);
            
            // 使用正确的方法保存会话数据
            console.log('保存会话数据到localStorage...');
            const saveResult = await this.setData(this.sessionPrefix + sessionId, sessionData);
            if (!saveResult) {
                console.error('会话数据保存失败');
                return null;
            }
            
            // 验证保存结果
            const savedSession = await this.getSessionData(sessionId);
            console.log('保存验证:', {
                sessionExists: !!savedSession,
                filesCount: savedSession && savedSession.uploadedFiles ? savedSession.uploadedFiles.length : 0,
                lastFileId: savedSession && savedSession.uploadedFiles && savedSession.uploadedFiles.length > 0 ? 
                    savedSession.uploadedFiles[savedSession.uploadedFiles.length - 1].id : null
            });
            
            console.log('=== 通信模块文件保存成功 ===');
            console.log('文件保存成功:', fileData.name);
            
            // 触发文件上传事件通知巫师端
            console.log('准备触发file_uploaded事件:', { sessionId, fileId: fileData.id, fileName: fileData.name });
            this.handleStorageChange('file_uploaded', JSON.stringify({
                sessionId,
                fileId: fileData.id,
                fileName: fileData.name,
                fileType: fileData.type,
                fileSize: fileData.size,
                timestamp: fileData.uploadTime,
                uploader: fileData.uploader
            }), null);
            console.log('file_uploaded事件已触发');
            
            return fileData.id;
        } catch (error) {
            console.error('=== 通信模块文件保存失败 ===');
            console.error('保存文件失败:', {
                error: error.message,
                stack: error.stack,
                sessionId: sessionId,
                fileName: fileData ? fileData.name : 'unknown',
                fileId: fileData ? fileData.id : 'unknown'
            });
            
            // 如果是存储配额超限，尝试更激进的清理
            if (error.name === 'QuotaExceededError') {
                console.log('检测到存储配额超限，尝试清理所有会话数据...');
                try {
                    // 清理所有wozSessions数据
                    localStorage.removeItem('wozSessions');
                    console.log('已清理wozSessions数据');
                    
                    // 清理所有会话相关的localStorage项
                    const keysToRemove = [];
                    for (let i = 0; i < localStorage.length; i++) {
                        const key = localStorage.key(i);
                        if (key && (key.startsWith('woz_') || key.startsWith('participant_') || key.startsWith('wizard_'))) {
                            keysToRemove.push(key);
                        }
                    }
                    keysToRemove.forEach(key => localStorage.removeItem(key));
                    console.log('清理了', keysToRemove.length, '个相关存储项');
                    
                    // 重新尝试保存（仅元数据）
                    const metadataOnly = {
                        id: fileData.id,
                        name: fileData.name,
                        type: fileData.type,
                        size: fileData.size,
                        uploadTime: fileData.uploadTime,
                        uploader: fileData.uploader,
                        content: null,
                        contentRemoved: true,
                        reason: 'Storage quota exceeded, content removed'
                    };
                    
                    console.log('重新尝试保存文件元数据...');
                    return await this.saveUploadedFile(sessionId, metadataOnly);
                    
                } catch (retryError) {
                    console.error('清理后重试仍然失败:', retryError.message);
                    return null;
                }
            }
            
            return null;
        }
    }
    
    // 获取文件数据
    getFileData(fileId) {
        // 首先尝试从内存中获取
        let fileData = this.uploadedFiles.get(fileId);
        
        // 如果内存中没有，从localStorage中获取
        if (!fileData) {
            const fileKey = `file_${fileId}`;
            fileData = this.getData(fileKey);
            
            // 如果找到了，存储到内存中以提高后续访问速度
            if (fileData) {
                this.uploadedFiles.set(fileId, fileData);
            }
        }
        
        return fileData;
    }
    
    // 获取会话的所有文件
    getSessionFiles(sessionId) {
        const sessionData = this.getSessionData(sessionId);
        return sessionData ? (sessionData.uploadedFiles || []) : [];
    }
    
    // 保存被测者消息（支持文件附件）
    async saveParticipantMessage(sessionId, message, fileId = null) {
        const sessionData = await this.getSessionData(sessionId) || {};
        
        const messageData = {
            id: this.generateId(),
            content: message,
            timestamp: new Date().toISOString(),
            type: 'participant',
            fileId: fileId
        };
        
        if (!sessionData.participantMessages) {
            sessionData.participantMessages = [];
        }
        
        sessionData.participantMessages.push(messageData);
        sessionData.lastActivity = new Date().toISOString();
        
        console.log('保存被测者消息:', { sessionId, message, messageId: messageData.id });
        const success = await this.updateSessionData(sessionId, sessionData);
        
        if (!success) {
            console.error('保存被测者消息失败');
            return null;
        }
        
        console.log('被测者消息保存成功');
        return messageData.id;
    }
    
    // 获取存储监控状态
    async getStorageMonitorStatus() {
        if (!this.storageMonitor) {
            return { available: false, message: '存储监控器未初始化' };
        }
        
        try {
            const report = await this.storageMonitor.getDetailedReport();
            return {
                available: true,
                ...report
            };
        } catch (error) {
            console.error('获取存储监控状态失败:', error);
            return { available: false, error: error.message };
        }
    }
    
    // 执行存储优化
    async optimizeStorage() {
        if (!this.storageMonitor) {
            console.warn('存储监控器未初始化，无法执行优化');
            return false;
        }
        
        try {
            await this.storageMonitor.optimizeStorage();
            console.log('存储优化完成');
            return true;
        } catch (error) {
            console.error('存储优化失败:', error);
            return false;
        }
    }
    
    // 获取存储建议
    async getStorageRecommendations() {
        if (!this.storageMonitor) {
            return [];
        }
        
        try {
            return await this.storageMonitor.getStorageRecommendations();
        } catch (error) {
            console.error('获取存储建议失败:', error);
            return [];
        }
    }
    
    // 添加存储事件监听器
    addStorageEventListener(eventType, callback) {
        if (this.storageMonitor) {
            this.storageMonitor.addEventListener(eventType, callback);
        }
    }
    
    // 移除存储事件监听器
    removeStorageEventListener(eventType, callback) {
        if (this.storageMonitor) {
            this.storageMonitor.removeEventListener(eventType, callback);
        }
    }
    
    // 上传大文件（新的优化方法）
    async uploadLargeFile(file, sessionId, progressCallback = null) {
        if (!this.largeFileHandler) {
            console.warn('大文件处理器未初始化，使用传统方法');
            return this.uploadFileTraditional(file, sessionId);
        }
        
        try {
            console.log('使用大文件处理器上传文件:', file.name);
            const result = await this.largeFileHandler.handleLargeFile(file, sessionId, progressCallback);
            
            if (result.success) {
                // 更新会话数据
                const sessionData = this.getSessionData(sessionId) || {
                    id: sessionId,
                    participantMessages: [],
                    aiResponses: [],
                    uploadedFiles: [],
                    createdAt: new Date().toISOString(),
                    lastActivity: new Date().toISOString()
                };
                
                if (!sessionData.uploadedFiles) {
                    sessionData.uploadedFiles = [];
                }
                
                // 添加文件信息到会话
                const fileInfo = {
                    id: result.fileId,
                    name: result.metadata.name,
                    type: result.metadata.type,
                    size: result.metadata.size,
                    uploadTime: result.metadata.uploadTime,
                    uploader: result.metadata.uploader,
                    isLargeFile: true
                };
                
                sessionData.uploadedFiles.push(fileInfo);
                sessionData.lastActivity = new Date().toISOString();
                
                // 保存会话数据
                const saveResult = await this.setData(this.sessionPrefix + sessionId, sessionData);
                if (!saveResult) {
                    throw new Error('会话数据保存失败');
                }
                
                // 触发文件上传事件
                this.handleStorageChange('file_uploaded', JSON.stringify({
                    sessionId,
                    fileId: result.fileId,
                    fileName: result.metadata.name,
                    fileType: result.metadata.type,
                    fileSize: result.metadata.size,
                    timestamp: result.metadata.uploadTime,
                    uploader: result.metadata.uploader,
                    isLargeFile: true
                }), null);
                
                console.log('大文件上传成功:', result.fileId);
                return result.fileId;
            }
            
        } catch (error) {
            console.error('大文件上传失败:', error);
            throw error;
        }
    }
    
    // 获取大文件内容
    async getLargeFileContent(fileId) {
        if (!this.largeFileHandler) {
            console.warn('大文件处理器未初始化');
            return null;
        }
        
        try {
            return await this.largeFileHandler.reconstructLargeFile(fileId);
        } catch (error) {
            console.error('获取大文件内容失败:', error);
            return null;
        }
    }
    
    // 删除大文件
    async deleteLargeFile(fileId) {
        if (!this.largeFileHandler) {
            console.warn('大文件处理器未初始化');
            return false;
        }
        
        try {
            await this.largeFileHandler.deleteLargeFile(fileId);
            return true;
        } catch (error) {
            console.error('删除大文件失败:', error);
            return false;
        }
    }
    
    // 获取大文件信息
    async getLargeFileInfo(fileId) {
        if (!this.largeFileHandler) {
            return null;
        }
        
        try {
            return await this.largeFileHandler.getFileInfo(fileId);
        } catch (error) {
            console.error('获取大文件信息失败:', error);
            return null;
        }
    }
    
    // 传统文件上传方法（作为备用）
    async uploadFileTraditional(file, sessionId) {
        // 这里保留原有的文件上传逻辑作为备用
        console.log('使用传统文件上传方法');
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = async (e) => {
                const fileData = {
                    id: this.generateId(),
                    name: file.name,
                    type: file.type,
                    size: file.size,
                    content: e.target.result,
                    uploadTime: new Date().toISOString(),
                    uploader: 'participant'
                };
                
                try {
                    const result = await this.saveUploadedFile(sessionId, fileData);
                    if (result) {
                        resolve(result);
                    } else {
                        reject(new Error('文件保存失败'));
                    }
                } catch (error) {
                    reject(error);
                }
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}

// 创建全局通信实例
if (typeof window !== 'undefined') {
    window.WozComm = new WizardOfOzCommunication();
}

// 导出类以供Node.js环境使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = WizardOfOzCommunication;
}