/**
 * IndexedDB存储管理器
 * 提供大容量文件存储能力，替代localStorage的容量限制
 */
class IndexedDBStorage {
    constructor() {
        this.dbName = 'WizardOfOzStorage';
        this.version = 1;
        this.db = null;
        this.isSupported = this.checkSupport();
        this.initPromise = null;
    }

    /**
     * 检查浏览器是否支持IndexedDB
     */
    checkSupport() {
        return 'indexedDB' in window && window.indexedDB !== null;
    }

    /**
     * 初始化IndexedDB数据库
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        if (!this.isSupported) {
            console.warn('IndexedDB不支持，将回退到localStorage');
            return false;
        }

        this.initPromise = new Promise((resolve, reject) => {
            try {
                console.log('初始化IndexedDB数据库...');
                const request = indexedDB.open(this.dbName, this.version);

                request.onerror = (event) => {
                    console.error('IndexedDB打开失败:', event.target.error);
                    reject(event.target.error);
                };

                request.onblocked = () => {
                    console.warn('IndexedDB open is blocked. Please close other tabs with this application open.');
                    reject(new Error('IndexedDB open is blocked.'));
                };

                request.onsuccess = () => {
                    this.db = request.result;
                    console.log('IndexedDB初始化成功');
                    resolve(true);
                };

                request.onupgradeneeded = (event) => {
                    console.log('创建IndexedDB对象存储...');
                    const db = event.target.result;
                    
                    // 创建会话数据存储
                    if (!db.objectStoreNames.contains('sessions')) {
                        const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
                        sessionStore.createIndex('lastActivity', 'lastActivity', { unique: false });
                        console.log('创建sessions对象存储');
                    }
                    
                    // 创建文件数据存储
                    if (!db.objectStoreNames.contains('files')) {
                        const fileStore = db.createObjectStore('files', { keyPath: 'id' });
                        fileStore.createIndex('sessionId', 'sessionId', { unique: false });
                        fileStore.createIndex('uploadTime', 'uploadTime', { unique: false });
                        console.log('创建files对象存储');
                    }
                    
                    // 创建键值对存储（兼容localStorage接口）
                    if (!db.objectStoreNames.contains('keyvalue')) {
                        db.createObjectStore('keyvalue', { keyPath: 'key' });
                        console.log('创建keyvalue对象存储');
                    }
                };
            } catch (e) {
                console.error('IndexedDB同步打开错误:', e);
                reject(e);
            }
        });

        return this.initPromise;
    }

    /**
     * 存储数据到IndexedDB
     */
    async setItem(key, value) {
        try {
            await this.init();
            if (!this.db) return false;

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyvalue'], 'readwrite');
                const store = transaction.objectStore('keyvalue');
                
                const data = {
                    key: key,
                    value: value,
                    timestamp: Date.now()
                };
                
                const request = store.put(data);
                
                request.onsuccess = () => {
                    console.log('IndexedDB存储成功:', key);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('IndexedDB存储失败:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('IndexedDB setItem错误:', error);
            return false;
        }
    }

    /**
     * 从IndexedDB获取数据
     */
    async getItem(key) {
        try {
            await this.init();
            if (!this.db) return null;

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyvalue'], 'readonly');
                const store = transaction.objectStore('keyvalue');
                const request = store.get(key);
                
                request.onsuccess = () => {
                    const result = request.result;
                    resolve(result ? result.value : null);
                };
                
                request.onerror = () => {
                    console.error('IndexedDB获取失败:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('IndexedDB getItem错误:', error);
            return null;
        }
    }

    /**
     * 从IndexedDB删除数据
     */
    async removeItem(key) {
        try {
            await this.init();
            if (!this.db) return false;

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyvalue'], 'readwrite');
                const store = transaction.objectStore('keyvalue');
                const request = store.delete(key);
                
                request.onsuccess = () => {
                    console.log('IndexedDB删除成功:', key);
                    resolve(true);
                };
                
                request.onerror = () => {
                    console.error('IndexedDB删除失败:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('IndexedDB removeItem错误:', error);
            return false;
        }
    }

    /**
     * 获取所有键
     */
    async getAllKeys() {
        try {
            await this.init();
            if (!this.db) return [];

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyvalue'], 'readonly');
                const store = transaction.objectStore('keyvalue');
                const request = store.getAllKeys();
                
                request.onsuccess = () => {
                    resolve(request.result || []);
                };
                
                request.onerror = () => {
                    console.error('IndexedDB getAllKeys失败:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('IndexedDB getAllKeys错误:', error);
            return [];
        }
    }

    /**
     * 清理过期数据
     */
    async cleanupExpiredData(maxAge = 24 * 60 * 60 * 1000) {
        try {
            await this.init();
            if (!this.db) return 0;

            const cutoffTime = Date.now() - maxAge;
            let cleanedCount = 0;

            return new Promise((resolve, reject) => {
                const transaction = this.db.transaction(['keyvalue'], 'readwrite');
                const store = transaction.objectStore('keyvalue');
                const request = store.openCursor();
                
                request.onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const data = cursor.value;
                        if (data.timestamp && data.timestamp < cutoffTime) {
                            cursor.delete();
                            cleanedCount++;
                        }
                        cursor.continue();
                    } else {
                        console.log('IndexedDB清理完成，删除条目数:', cleanedCount);
                        resolve(cleanedCount);
                    }
                };
                
                request.onerror = () => {
                    console.error('IndexedDB清理失败:', request.error);
                    reject(request.error);
                };
            });
        } catch (error) {
            console.error('IndexedDB清理错误:', error);
            return 0;
        }
    }

    /**
     * 获取存储使用情况
     */
    async getStorageUsage() {
        try {
            if ('storage' in navigator && 'estimate' in navigator.storage) {
                const estimate = await navigator.storage.estimate();
                return {
                    used: estimate.usage || 0,
                    available: estimate.quota || 0,
                    percentage: estimate.quota ? (estimate.usage / estimate.quota * 100).toFixed(2) : 0
                };
            }
            return { used: 0, available: 0, percentage: 0 };
        } catch (error) {
            console.error('获取存储使用情况失败:', error);
            return { used: 0, available: 0, percentage: 0 };
        }
    }

    /**
     * 关闭数据库连接
     */
    close() {
        if (this.db) {
            this.db.close();
            this.db = null;
            console.log('IndexedDB连接已关闭');
        }
    }

    /**
     * 删除数据库
     */
    async deleteDatabase() {
        return new Promise((resolve, reject) => {
            console.log(`正在删除IndexedDB数据库: ${this.dbName}`);
            const deleteRequest = indexedDB.deleteDatabase(this.dbName);

            deleteRequest.onsuccess = () => {
                console.log(`数据库 ${this.dbName} 删除成功`);
                this.db = null;
                resolve(true);
            };

            deleteRequest.onerror = (event) => {
                console.error(`删除数据库 ${this.dbName} 失败:`, event.target.error);
                reject(event.target.error);
            };

            deleteRequest.onblocked = (event) => {
                console.warn(`删除数据库 ${this.dbName} 被阻塞。`);
                // 如果有连接，先关闭
                if (this.db) {
                    this.db.close();
                    // 再次尝试删除
                    return this.deleteDatabase().then(resolve, reject);
                }
                reject(new Error('Deletion was blocked.'));
            };
        });
    }
}

// 导出IndexedDB存储管理器
if (typeof window !== 'undefined') {
    window.IndexedDBStorage = IndexedDBStorage;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = IndexedDBStorage;
}