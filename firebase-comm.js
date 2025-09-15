// Firebase Communication Module
// Replaces localStorage-based communication with Firebase Realtime Database

class FirebaseComm {
    constructor() {
        this.database = null;
        this.sessionRef = null;
        this.messagesRef = null;
        this.currentSessionId = null;
        this.messageListeners = [];
        this.sessionListeners = [];
        this.storageReady = false; // 添加storageReady属性以兼容wizard-script.js
    }

    // Get file data including content
    async getFileData(fileId, sessionId = null) {
        try {
            console.log('=== Firebase getFileData 开始 ===');
            const targetSessionId = sessionId || this.currentSessionId;
            console.log('目标会话ID:', targetSessionId);
            console.log('请求的文件ID:', fileId);
            
            if (!targetSessionId) {
                console.error('没有提供会话ID');
                throw new Error('No session ID provided for file retrieval');
            }

            const filePath = `sessions/${targetSessionId}/files/${fileId}`;
            console.log('Firebase文件路径:', filePath);
            const fileRef = this.database.ref(filePath);
            const snapshot = await fileRef.once('value');
            console.log('Firebase快照存在:', snapshot.exists());
            
            if (!snapshot.exists()) {
                console.error('Firebase中未找到文件:', fileId);
                console.error('检查路径:', filePath);
                return null;
            }

            const fileData = snapshot.val();
            
            // Handle large files based on storage method
            if (fileData.isLargeFile) {
                if (fileData.status === 'stored_in_firebase_storage' && fileData.downloadURL) {
                    // File is stored in Firebase Storage, provide download URL
                    console.log('Large file stored in Firebase Storage:', fileData.downloadURL);
                    fileData.content = null; // Don't load content directly, use downloadURL
                } else if (fileData.status === 'metadata_only_localStorage_fallback' || fileData.status === 'metadata_only') {
                    // Fallback to localStorage
                    const localStorageKey = `file_content_${fileId}`;
                    const content = localStorage.getItem(localStorageKey);
                    
                    if (content) {
                        fileData.content = content;
                        console.log('Retrieved large file content from localStorage');
                    } else {
                        console.warn('Large file content not found in localStorage');
                        fileData.content = null;
                    }
                }
            }

            return fileData;
        } catch (error) {
            console.error('Failed to get file data:', error);
            return null;
        }
    }

    // Get all files for a session
    async getSessionFiles(sessionId = null) {
        try {
            const targetSessionId = sessionId || this.currentSessionId;
            if (!targetSessionId) {
                throw new Error('No session ID provided for files retrieval');
            }

            const filesRef = this.database.ref(`sessions/${targetSessionId}/files`);
            const snapshot = await filesRef.once('value');
            
            if (!snapshot.exists()) {
                return [];
            }

            const filesData = snapshot.val();
            const files = [];
            
            for (const fileId in filesData) {
                const fileData = filesData[fileId];
                
                // Handle large files based on storage method
                if (fileData.isLargeFile) {
                    if (fileData.status === 'stored_in_firebase_storage' && fileData.downloadURL) {
                        // File is stored in Firebase Storage, provide download URL
                        console.log('Large file stored in Firebase Storage:', fileData.downloadURL);
                        fileData.content = null; // Don't load content directly, use downloadURL
                    } else if (fileData.status === 'metadata_only_localStorage_fallback' || fileData.status === 'metadata_only') {
                        // Fallback to localStorage
                        const localStorageKey = `file_content_${fileId}`;
                        const content = localStorage.getItem(localStorageKey);
                        if (content) {
                            fileData.content = content;
                        }
                    }
                }
                
                files.push(fileData);
            }

            return files;
        } catch (error) {
            console.error('Failed to get session files:', error);
            return [];
        }
    }

    // Initialize Firebase connection
    async initialize() {
        try {
            if (!window.FirebaseConfig) {
                throw new Error('Firebase configuration not loaded');
            }
            
            const success = window.FirebaseConfig.initializeFirebase();
            if (!success) {
                throw new Error('Firebase initialization failed');
            }
            
            this.database = window.FirebaseConfig.getDatabase();
            this.storageReady = true; // 设置存储就绪状态
            console.log('Firebase communication module initialized');
            return true;
        } catch (error) {
            console.error('Firebase communication initialization failed:', error);
            return null;
        }
    }

    // Create a new session
    async createSession(sessionId, initialData = {}) {
        try {
            if (!this.database) {
                throw new Error('Firebase not initialized');
            }

            const sessionData = {
                id: sessionId,
                createdAt: initialData.createdAt || firebase.database.ServerValue.TIMESTAMP,
                lastActivity: firebase.database.ServerValue.TIMESTAMP,
                status: initialData.status || 'active',
                participants: {
                    wizard: true,
                    participant: initialData.participantConnected || false
                },
                ...initialData
            };

            await this.database.ref(`sessions/${sessionId}`).set(sessionData);
            
            // Initialize messages collection for this session - don't set empty object
            // Just set the references, messages will be added when needed
            
            this.currentSessionId = sessionId;
            this.sessionRef = this.database.ref(`sessions/${sessionId}`);
            this.messagesRef = this.database.ref(`messages/${sessionId}`);
            
            console.log(`Session references set: sessionRef=${this.sessionRef.toString()}, messagesRef=${this.messagesRef.toString()}`);
            
            console.log(`Session ${sessionId} created successfully`);
            return true;
        } catch (error) {
            console.error('Failed to create session:', error);
            return false;
        }
    }

    // Join an existing session
    async joinSession(sessionId) {
        try {
            if (!this.database) {
                throw new Error('Firebase not initialized');
            }

            // Check if session exists
            const sessionSnapshot = await this.database.ref(`sessions/${sessionId}`).once('value');
            if (!sessionSnapshot.exists()) {
                throw new Error('Session not found');
            }

            // Update participant status
            await this.database.ref(`sessions/${sessionId}/participants/participant`).set(true);
            await this.database.ref(`sessions/${sessionId}/lastActivity`).set(firebase.database.ServerValue.TIMESTAMP);

            this.currentSessionId = sessionId;
            this.sessionRef = this.database.ref(`sessions/${sessionId}`);
            this.messagesRef = this.database.ref(`messages/${sessionId}`);
            
            console.log(`Joined session ${sessionId} successfully`);
            return true;
        } catch (error) {
            console.error('Failed to join session:', error);
            return false;
        }
    }

    // Send a message
    async sendMessage(messageData) {
        try {
            console.log('=== Firebase sendMessage 开始 ===');
            console.log('消息数据:', messageData);
            console.log('messagesRef存在:', !!this.messagesRef);
            console.log('当前会话ID:', this.currentSessionId);
            
            if (!this.messagesRef) {
                console.error('没有活动会话的messagesRef');
                throw new Error('No active session');
            }

            const message = {
                ...messageData,
                timestamp: new Date().toISOString(),
                serverTimestamp: firebase.database.ServerValue.TIMESTAMP,
                id: this.database.ref().push().key
            };
            
            console.log('准备推送的完整消息:', message);
            await this.messagesRef.push(message);
            console.log('消息推送成功');
            
            // Update session last activity
            if (this.sessionRef) {
                await this.sessionRef.child('lastActivity').set(firebase.database.ServerValue.TIMESTAMP);
                console.log('会话活动时间更新成功');
            }
            
            return true;
        } catch (error) {
            console.error('发送消息失败:', error);
            return false;
        }
    }

    // Listen for new messages
    onNewMessage(callback) {
        if (!this.messagesRef) {
            console.error('No active session for message listening');
            return null;
        }

        const listener = this.messagesRef.on('child_added', (snapshot) => {
            const message = snapshot.val();
            if (message) {
                callback(message);
            }
        });

        this.messageListeners.push({ ref: this.messagesRef, listener });
        return listener;
    }

    // Listen for session updates
    onSessionUpdate(callback) {
        if (!this.sessionRef) {
            console.error('No active session for session listening');
            return null;
        }

        const listener = this.sessionRef.on('value', (snapshot) => {
            const sessionData = snapshot.val();
            if (sessionData) {
                callback(sessionData);
            }
        });

        this.sessionListeners.push({ ref: this.sessionRef, listener });
        return listener;
    }

    // Get all messages for current session
    async getMessages() {
        try {
            if (!this.messagesRef) {
                throw new Error('No active session');
            }

            const snapshot = await this.messagesRef.orderByChild('timestamp').once('value');
            const messages = [];
            
            snapshot.forEach((childSnapshot) => {
                messages.push(childSnapshot.val());
            });

            return messages;
        } catch (error) {
            console.error('Failed to get messages:', error);
            return [];
        }
    }

    // Get session info
    async getSessionInfo(sessionId = null) {
        try {
            const id = sessionId || this.currentSessionId;
            if (!id) {
                throw new Error('No session ID provided');
            }

            const snapshot = await this.database.ref(`sessions/${id}`).once('value');
            return snapshot.exists() ? snapshot.val() : null;
        } catch (error) {
            console.error('Failed to get session info:', error);
            return null;
        }
    }

    // Get session data with messages (for wizard interface compatibility)
    async getSessionData(sessionId = null) {
        try {
            const id = sessionId || this.currentSessionId;
            if (!id) {
                return null;
            }

            // Get session info
            const sessionInfo = await this.getSessionInfo(id);
            if (!sessionInfo) {
                return null;
            }

            // Get all messages for this session
            const messagesSnapshot = await this.database.ref(`messages/${id}`).orderByChild('timestamp').once('value');
            const participantMessages = [];
            const aiResponses = [];

            if (messagesSnapshot.exists()) {
                messagesSnapshot.forEach((childSnapshot) => {
                    const message = childSnapshot.val();
                    if (message.sender === 'participant') {
                        participantMessages.push(message);
                    } else if (message.sender === 'wizard') {
                        aiResponses.push(message);
                    }
                });
            }

            return {
                ...sessionInfo,
                participantMessages: participantMessages,
                aiResponses: aiResponses
            };
        } catch (error) {
            console.error('Failed to get session data:', error);
            return null;
        }
    }

    // Check if session exists
    async sessionExists(sessionId) {
        try {
            const snapshot = await this.database.ref(`sessions/${sessionId}`).once('value');
            return snapshot.exists();
        } catch (error) {
            console.error('Failed to check session existence:', error);
            return false;
        }
    }

    // Clean up listeners
    removeAllListeners() {
        // Remove message listeners
        this.messageListeners.forEach(({ ref, listener }) => {
            ref.off('child_added', listener);
        });
        this.messageListeners = [];

        // Remove session listeners
        this.sessionListeners.forEach(({ ref, listener }) => {
            ref.off('value', listener);
        });
        this.sessionListeners = [];
    }

    // Disconnect from current session
    disconnect() {
        this.removeAllListeners();
        this.sessionRef = null;
        this.messagesRef = null;
        this.currentSessionId = null;
    }

    // Update session status
    async updateSessionStatus(status) {
        try {
            if (!this.sessionRef) {
                throw new Error('No active session');
            }

            await this.sessionRef.child('status').set(status);
            await this.sessionRef.child('lastActivity').set(firebase.database.ServerValue.TIMESTAMP);
            return true;
        } catch (error) {
            console.error('Failed to update session status:', error);
            return false;
        }
    }

    // Save session data
    async saveSession(sessionData) {
        try {
            if (!this.database) {
                throw new Error('Firebase not initialized');
            }

            const sessionId = sessionData.sessionId || sessionData.id;
            if (!sessionId) {
                throw new Error('Session data missing sessionId');
            }

            console.log('保存会话数据到Firebase:', sessionId, sessionData);
            await this.database.ref(`sessions/${sessionId}`).set({
                ...sessionData,
                lastActivity: firebase.database.ServerValue.TIMESTAMP
            });
            
            console.log('会话数据已保存到Firebase:', sessionId);
            return true;
        } catch (error) {
            console.error('Failed to save session:', error);
            return false;
        }
    }

    // Upload file to Firebase
    async uploadFile(fileData) {
        try {
            console.log('=== Firebase uploadFile 开始 ===');
            console.log('当前会话ID:', this.currentSessionId);
            console.log('文件数据结构:', { id: fileData.id, name: fileData.name, size: fileData.size, type: fileData.type, hasContent: !!fileData.content });
            
            if (!this.currentSessionId) {
                console.error('没有活动会话');
                throw new Error('No active session for file upload');
            }

            // Check file size limit for Realtime Database (10MB limit)
            const fileSizeMB = fileData.size / (1024 * 1024);
            const base64SizeMB = (fileData.content.length * 0.75) / (1024 * 1024); // Base64 is ~33% larger
            
            console.log(`文件大小检查: ${fileSizeMB.toFixed(2)}MB, Base64大小: ${base64SizeMB.toFixed(2)}MB`);
            
            if (base64SizeMB > 8) { // Leave some margin below 10MB limit
                console.log('大文件，使用Firebase Storage');
                console.warn('File too large for Realtime Database, using Firebase Storage');
                
                try {
                    // Convert base64 to blob for Firebase Storage
                    const base64Data = fileData.content.split(',')[1]; // Remove data URL prefix
                    const byteCharacters = atob(base64Data);
                    const byteNumbers = new Array(byteCharacters.length);
                    for (let i = 0; i < byteCharacters.length; i++) {
                        byteNumbers[i] = byteCharacters.charCodeAt(i);
                    }
                    const byteArray = new Uint8Array(byteNumbers);
                    const blob = new Blob([byteArray], { type: fileData.type });
                    
                    // Upload to Firebase Storage
                    const storage = firebase.storage();
                    const storageRef = storage.ref();
                    const fileRef = storageRef.child(`files/${this.currentSessionId}/${fileData.id}`);
                    
                    console.log('Uploading large file to Firebase Storage...');
                    const uploadTask = await fileRef.put(blob);
                    const downloadURL = await uploadTask.ref.getDownloadURL();
                    
                    console.log('Large file uploaded to Firebase Storage:', downloadURL);
                    
                    // Store metadata with download URL in Realtime Database
                    const dbFileRef = this.database.ref(`sessions/${this.currentSessionId}/files/${fileData.id}`);
                    await dbFileRef.set({
                        id: fileData.id,
                        name: fileData.name,
                        type: fileData.type,
                        size: fileData.size,
                        uploadTime: fileData.uploadTime,
                        uploader: fileData.uploader,
                        sessionId: fileData.sessionId,
                        isLargeFile: true,
                        status: 'stored_in_firebase_storage',
                        downloadURL: downloadURL,
                        storagePath: `files/${this.currentSessionId}/${fileData.id}`
                    });
                    
                } catch (storageError) {
                    console.error('Failed to upload large file to Firebase Storage:', storageError);
                    
                    // Fallback to localStorage only if Firebase Storage fails
                    console.warn('Falling back to localStorage for large file');
                    const localStorageKey = `file_content_${fileData.id}`;
                    try {
                        localStorage.setItem(localStorageKey, fileData.content);
                        console.log('Large file content stored in localStorage as fallback');
                        
                        // Store metadata indicating localStorage fallback
                        const dbFileRef = this.database.ref(`sessions/${this.currentSessionId}/files/${fileData.id}`);
                        await dbFileRef.set({
                            id: fileData.id,
                            name: fileData.name,
                            type: fileData.type,
                            size: fileData.size,
                            uploadTime: fileData.uploadTime,
                            uploader: fileData.uploader,
                            sessionId: fileData.sessionId,
                            isLargeFile: true,
                            status: 'metadata_only_localStorage_fallback'
                        });
                    } catch (localStorageError) {
                        console.error('Failed to store large file in localStorage:', localStorageError);
                        throw new Error('File too large and both Firebase Storage and localStorage failed');
                    }
                }
            } else {
                // Store complete file data in Firebase for smaller files
                const fileRef = this.database.ref(`sessions/${this.currentSessionId}/files/${fileData.id}`);
                await fileRef.set({
                    id: fileData.id,
                    name: fileData.name,
                    type: fileData.type,
                    size: fileData.size,
                    content: fileData.content,
                    uploadTime: fileData.uploadTime,
                    uploader: fileData.uploader,
                    sessionId: fileData.sessionId,
                    isLargeFile: false
                });
            }

            // Also send a message about the file upload
            /*
            const fileMessage = {
                sessionId: this.currentSessionId,
                content: `File uploaded: ${fileData.name} (${fileSizeMB.toFixed(2)}MB)`,
                sender: fileData.uploader,
                timestamp: fileData.uploadTime,
                fileId: fileData.id,
                messageType: 'file'
            };

            await this.sendMessage(fileMessage);
            */
            console.log('File uploaded successfully to Firebase:', fileData.id);
            return fileData.id;
        } catch (error) {
            console.error('Failed to upload file to Firebase:', error);
            console.error('Error details:', {
                message: error.message,
                code: error.code,
                stack: error.stack
            });
            return null;
        }
    }

    // Get all active sessions
    async getActiveSessions() {
        try {
            const snapshot = await this.database.ref('sessions').orderByChild('status').equalTo('active').once('value');
            const sessions = [];
            
            if (snapshot.exists()) {
                const sessionPromises = [];
                
                snapshot.forEach((childSnapshot) => {
                    const sessionData = childSnapshot.val();
                    const sessionId = childSnapshot.key;
                    
                    // Get messages for this session from the messages node
                    const messagePromise = this.database.ref(`messages/${sessionId}`).once('value')
                        .then(messageSnapshot => {
                            const participantMessages = [];
                            const aiResponses = [];
                            
                            if (messageSnapshot.exists()) {
                                Object.values(messageSnapshot.val()).forEach(message => {
                                    if (message && message.sender) {
                                        if (message.sender === 'participant') {
                                            participantMessages.push(message);
                                        } else if (message.sender === 'wizard') {
                                            aiResponses.push(message);
                                        }
                                    }
                                });
                            }
                            
                            return {
                                sessionId: sessionId,
                                createdAt: sessionData.createdAt,
                                participantMessages: participantMessages,
                                aiResponses: aiResponses,
                                status: sessionData.status,
                                lastActivity: sessionData.lastActivity
                            };
                        })
                        .catch(error => {
                            console.error(`Failed to get messages for session ${sessionId}:`, error);
                            return {
                                sessionId: sessionId,
                                createdAt: sessionData.createdAt,
                                participantMessages: [],
                                aiResponses: [],
                                status: sessionData.status,
                                lastActivity: sessionData.lastActivity
                            };
                        });
                    
                    sessionPromises.push(messagePromise);
                });
                
                const resolvedSessions = await Promise.all(sessionPromises);
                sessions.push(...resolvedSessions);
            }
            
            console.log('Retrieved active sessions from Firebase:', sessions.length);
            return sessions;
        } catch (error) {
            console.error('Failed to get active sessions:', error);
            return [];
        }
    }

    // Check if session has unread messages
    async hasUnreadMessages(sessionId, wizardId = 'wizard') {
        try {
            const sessionData = await this.getSessionData(sessionId);
            if (!sessionData || !sessionData.participantMessages || Object.keys(sessionData.participantMessages).length === 0) {
                return false;
            }
            
            // Get read status from localStorage (simple implementation)
            const readKey = `session_read_${sessionId}_${wizardId}`;
            const readData = localStorage.getItem(readKey);
            
            if (!readData) {
                return true; // Never read before
            }
            
            const lastReadTime = new Date(JSON.parse(readData).timestamp);
            
            // Check if there are any participant messages after the last read time
            const participantMessages = Object.values(sessionData.participantMessages);
            const hasNewerMessages = participantMessages.some(msg => 
                new Date(msg.timestamp) > lastReadTime
            );
            
            return hasNewerMessages;
        } catch (error) {
            console.error('Failed to check unread messages:', error);
            return false;
        }
    }

    // Mark session as read
    async markSessionAsRead(sessionId, wizardId = 'wizard') {
        try {
            const readKey = `session_read_${sessionId}_${wizardId}`;
            const readData = {
                timestamp: new Date().toISOString(),
                sessionId: sessionId,
                wizardId: wizardId
            };
            localStorage.setItem(readKey, JSON.stringify(readData));
            console.log(`Marked session ${sessionId} as read for ${wizardId}`);
            return true;
        } catch (error) {
            console.error('Failed to mark session as read:', error);
            return false;
        }
    }

    // Delete session from Firebase
    async deleteSession(sessionId) {
        try {
            if (!this.database) {
                throw new Error('Firebase not initialized');
            }

            console.log('删除Firebase会话:', sessionId);
            
            // Delete session data
            await this.database.ref(`sessions/${sessionId}`).remove();
            
            // Delete messages for this session
            await this.database.ref(`messages/${sessionId}`).remove();
            
            // Delete files for this session if any
            const filesSnapshot = await this.database.ref(`sessions/${sessionId}/files`).once('value');
            if (filesSnapshot.exists()) {
                // If using Firebase Storage, also delete files from storage
                const files = filesSnapshot.val();
                for (const fileId in files) {
                    const fileData = files[fileId];
                    if (fileData.isLargeFile && fileData.storagePath) {
                        try {
                            const storage = firebase.storage();
                            const fileRef = storage.ref(fileData.storagePath);
                            await fileRef.delete();
                            console.log('删除Firebase Storage文件:', fileData.storagePath);
                        } catch (storageError) {
                            console.warn('删除Firebase Storage文件失败:', storageError);
                        }
                    }
                }
            }
            
            // Clean up read status from localStorage
            const readKey = `session_read_${sessionId}_wizard`;
            localStorage.removeItem(readKey);
            
            console.log(`会话 ${sessionId} 已从Firebase删除`);
            return true;
        } catch (error) {
            console.error('删除Firebase会话失败:', error);
            return false;
        }
    }
}

// Export for global use
window.FirebaseComm = FirebaseComm;