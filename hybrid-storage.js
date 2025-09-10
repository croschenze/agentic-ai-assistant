/**
 * 混合存储管理器
 * 自动在localStorage和IndexedDB之间切换，提供最佳存储策略
 */
class HybridStorage {
    constructor() {
        this.indexedDBStorage = new IndexedDBStorage();
        this.preferIndexedDB = true; // 优先使用IndexedDB
        this.fallbackToLocalStorage = true;
        this.storageQuotaThreshold = 0.8; // 80%使用率时切换存储策略
        this.initPromise = null;
    }

    /**
     * 初始化混合存储
     */
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }

        this.initPromise = (async () => {
            console.log('初始化混合存储管理器...');
            
            // 尝试初始化IndexedDB
            const indexedDBReady = await this.indexedDBStorage.init();
            
            if (indexedDBReady) {
                console.log('IndexedDB可用，优先使用IndexedDB存储');
                this.preferIndexedDB = true;
            } else {
                console.log('IndexedDB不可用，回退到localStorage');
                this.preferIndexedDB = false;
            }
            
            // 检查存储使用情况
            await this.checkStorageUsage();
            
            return true;
        })();

        return this.initPromise;
    }

    /**
     * 检查存储使用情况
     */
    async checkStorageUsage() {
        try {
            if (this.preferIndexedDB) {
                const usage = await this.indexedDBStorage.getStorageUsage();
                console.log('IndexedDB存储使用情况:', usage);
                
                if (usage.percentage > this.storageQuotaThreshold * 100) {
                    console.warn('IndexedDB存储使用率过高，将执行清理');
                    await this.cleanupStorage();
                }
            } else {
                // 检查localStorage使用情况
                const localStorageUsage = this.getLocalStorageUsage();
                console.log('localStorage使用情况:', localStorageUsage);
            }
        } catch (error) {
            console.error('检查存储使用情况失败:', error);
        }
    }

    /**
     * 获取localStorage使用情况
     */
    getLocalStorageUsage() {
        try {
            let totalSize = 0;
            for (let key in localStorage) {
                if (localStorage.hasOwnProperty(key)) {
                    totalSize += localStorage[key].length + key.length;
                }
            }
            
            // localStorage通常限制在5-10MB
            const estimatedQuota = 5 * 1024 * 1024; // 5MB
            return {
                used: totalSize,
                available: estimatedQuota,
                percentage: (totalSize / estimatedQuota * 100).toFixed(2)
            };
        } catch (error) {
            console.error('获取localStorage使用情况失败:', error);
            return { used: 0, available: 0, percentage: 0 };
        }
    }

    /**
     * 智能存储数据
     */
    async setItem(key, value) {
        await this.init();
        
        try {
            const dataSize = JSON.stringify(value).length;
            console.log(`存储数据: ${key}, 大小: ${dataSize} bytes`);
            
            // 优先尝试IndexedDB
            if (this.preferIndexedDB) {
                const success = await this.indexedDBStorage.setItem(key, value);
                if (success) {
                    console.log('数据已存储到IndexedDB');
                    return true;
                }
                
                console.warn('IndexedDB存储失败，尝试localStorage');
            }
            
            // 回退到localStorage
            if (this.fallbackToLocalStorage) {
                return this.setItemToLocalStorage(key, value);
            }
            
            return false;
        } catch (error) {
            console.error('混合存储setItem失败:', error);
            return false;
        }
    }

    /**
     * 存储到localStorage（带错误处理）
     */
    setItemToLocalStorage(key, value) {
        try {
            const jsonData = JSON.stringify(value);
            localStorage.setItem(key, jsonData);
            console.log('数据已存储到localStorage');
            return true;
        } catch (error) {
            if (error.name === 'QuotaExceededError' || error.code === 22) {
                console.warn('localStorage配额超限，尝试清理并重试');
                
                // 清理localStorage
                this.cleanupLocalStorage();
                
                // 重试
                try {
                    const jsonData = JSON.stringify(value);
                    localStorage.setItem(key, jsonData);
                    console.log('清理后重试存储成功');
                    return true;
                } catch (retryError) {
                    console.error('重试存储仍然失败:', retryError);
                    return false;
                }
            }
            
            console.error('localStorage存储失败:', error);
            return false;
        }
    }

    /**
     * 获取数据
     */
    async getItem(key) {
        await this.init();
        
        try {
            // 优先从IndexedDB获取
            if (this.preferIndexedDB) {
                const value = await this.indexedDBStorage.getItem(key);
                if (value !== null) {
                    return value;
                }
            }
            
            // 从localStorage获取
            const localValue = localStorage.getItem(key);
            if (localValue !== null) {
                try {
                    return JSON.parse(localValue);
                } catch (parseError) {
                    console.warn('JSON解析失败，返回原始字符串:', parseError);
                    return localValue;
                }
            }
            
            return null;
        } catch (error) {
            console.error('混合存储getItem失败:', error);
            return null;
        }
    }

    /**
     * 删除数据
     */
    async removeItem(key) {
        await this.init();
        
        try {
            let removed = false;
            
            // 从IndexedDB删除
            if (this.preferIndexedDB) {
                const indexedDBRemoved = await this.indexedDBStorage.removeItem(key);
                if (indexedDBRemoved) removed = true;
            }
            
            // 从localStorage删除
            if (localStorage.getItem(key) !== null) {
                localStorage.removeItem(key);
                removed = true;
            }
            
            return removed;
        } catch (error) {
            console.error('混合存储removeItem失败:', error);
            return false;
        }
    }

    /**
     * 获取所有键
     */
    async getAllKeys() {
        await this.init();
        
        try {
            const keys = new Set();
            
            // 从IndexedDB获取键
            if (this.preferIndexedDB) {
                const indexedDBKeys = await this.indexedDBStorage.getAllKeys();
                indexedDBKeys.forEach(key => keys.add(key));
            }
            
            // 从localStorage获取键
            for (let i = 0; i < localStorage.length; i++) {
                keys.add(localStorage.key(i));
            }
            
            return Array.from(keys);
        } catch (error) {
            console.error('获取所有键失败:', error);
            return [];
        }
    }

    /**
     * 清理存储
     */
    async cleanupStorage() {
        console.log('开始清理存储...');
        let totalCleaned = 0;
        
        try {
            // 清理IndexedDB
            if (this.preferIndexedDB) {
                const indexedDBCleaned = await this.indexedDBStorage.cleanupExpiredData();
                totalCleaned += indexedDBCleaned;
                console.log('IndexedDB清理完成，删除条目:', indexedDBCleaned);
            }
            
            // 清理localStorage
            const localStorageCleaned = this.cleanupLocalStorage();
            totalCleaned += localStorageCleaned;
            
            console.log('存储清理完成，总删除条目:', totalCleaned);
            return totalCleaned;
        } catch (error) {
            console.error('存储清理失败:', error);
            return totalCleaned;
        }
    }

    /**
     * 清理localStorage中的过期数据
     */
    cleanupLocalStorage() {
        let cleanedCount = 0;
        const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24小时前
        
        try {
            const keysToRemove = [];
            
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('woz_')) {
                    try {
                        const data = JSON.parse(localStorage.getItem(key));
                        if (data && data.lastActivity) {
                            const lastActivity = new Date(data.lastActivity).getTime();
                            if (lastActivity < cutoffTime) {
                                keysToRemove.push(key);
                            }
                        }
                    } catch (parseError) {
                        // 如果解析失败，可能是旧数据，也删除
                        keysToRemove.push(key);
                    }
                }
            }
            
            keysToRemove.forEach(key => {
                localStorage.removeItem(key);
                cleanedCount++;
            });
            
            console.log('localStorage清理完成，删除条目:', cleanedCount);
        } catch (error) {
            console.error('localStorage清理失败:', error);
        }
        
        return cleanedCount;
    }

    /**
     * 获取存储统计信息
     */
    async getStorageStats() {
        await this.init();
        
        const stats = {
            indexedDB: { supported: false, usage: null },
            localStorage: { usage: null },
            preferredStorage: this.preferIndexedDB ? 'IndexedDB' : 'localStorage'
        };
        
        try {
            if (this.preferIndexedDB) {
                stats.indexedDB.supported = true;
                stats.indexedDB.usage = await this.indexedDBStorage.getStorageUsage();
            }
            
            stats.localStorage.usage = this.getLocalStorageUsage();
        } catch (error) {
            console.error('获取存储统计失败:', error);
        }
        
        return stats;
    }

    /**
     * 关闭存储连接
     */
    close() {
        if (this.indexedDBStorage) {
            this.indexedDBStorage.close();
        }
    }
}

// 导出混合存储管理器
if (typeof window !== 'undefined') {
    window.HybridStorage = HybridStorage;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = HybridStorage;
}