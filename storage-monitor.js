/**
 * 存储监控器
 * 实时监控存储使用情况，自动优化存储策略
 */
class StorageMonitor {
    constructor(hybridStorage) {
        this.hybridStorage = hybridStorage;
        this.monitoringInterval = null;
        this.checkInterval = 30000; // 30秒检查一次
        this.criticalThreshold = 0.9; // 90%使用率为临界值
        this.warningThreshold = 0.8; // 80%使用率为警告值
        this.listeners = new Map();
        this.lastStats = null;
    }

    /**
     * 初始化存储监控器
     */
    async init() {
        console.log('初始化存储监控器...');
        try {
            // 执行初始检查
            await this.checkStorageStatus();
            console.log('存储监控器初始化完成');
            return true;
        } catch (error) {
            console.error('存储监控器初始化失败:', error);
            return false;
        }
    }

    /**
     * 开始监控存储使用情况
     */
    startMonitoring() {
        console.log('开始存储监控...');
        
        // 立即执行一次检查
        this.checkStorageStatus();
        
        // 设置定期检查
        this.monitoringInterval = setInterval(() => {
            this.checkStorageStatus();
        }, this.checkInterval);
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
            console.log('存储监控已停止');
        }
    }

    /**
     * 检查存储状态
     */
    async checkStorageStatus() {
        try {
            const stats = await this.hybridStorage.getStorageStats();
            this.lastStats = stats;
            
            console.log('存储状态检查:', stats);
            
            // 检查IndexedDB使用情况
            if (stats.indexedDB.supported && stats.indexedDB.usage) {
                const usage = stats.indexedDB.usage;
                const usagePercentage = usage.percentage / 100;
                
                if (usagePercentage >= this.criticalThreshold) {
                    await this.handleCriticalStorage('indexedDB', usage);
                } else if (usagePercentage >= this.warningThreshold) {
                    await this.handleWarningStorage('indexedDB', usage);
                }
            }
            
            // 检查localStorage使用情况
            if (stats.localStorage.usage) {
                const usage = stats.localStorage.usage;
                const usagePercentage = usage.percentage / 100;
                
                if (usagePercentage >= this.criticalThreshold) {
                    await this.handleCriticalStorage('localStorage', usage);
                } else if (usagePercentage >= this.warningThreshold) {
                    await this.handleWarningStorage('localStorage', usage);
                }
            }
            
            // 触发状态更新事件
            this.emit('statusUpdate', stats);
            
        } catch (error) {
            console.error('存储状态检查失败:', error);
            this.emit('error', error);
        }
    }

    /**
     * 处理临界存储情况
     */
    async handleCriticalStorage(storageType, usage) {
        console.warn(`${storageType}存储使用率达到临界值: ${usage.percentage}%`);
        
        // 立即执行清理
        const cleanedCount = await this.hybridStorage.cleanupStorage();
        console.log(`紧急清理完成，删除了${cleanedCount}个过期条目`);
        
        // 如果是localStorage达到临界值，尝试迁移数据到IndexedDB
        if (storageType === 'localStorage' && this.hybridStorage.preferIndexedDB) {
            await this.migrateDataToIndexedDB();
        }
        
        // 触发临界警告事件
        this.emit('criticalWarning', {
            storageType,
            usage,
            cleanedCount
        });
    }

    /**
     * 处理警告存储情况
     */
    async handleWarningStorage(storageType, usage) {
        console.warn(`${storageType}存储使用率达到警告值: ${usage.percentage}%`);
        
        // 执行轻度清理
        const cleanedCount = await this.hybridStorage.cleanupStorage();
        console.log(`预防性清理完成，删除了${cleanedCount}个过期条目`);
        
        // 触发警告事件
        this.emit('warning', {
            storageType,
            usage,
            cleanedCount
        });
    }

    /**
     * 将localStorage数据迁移到IndexedDB
     */
    async migrateDataToIndexedDB() {
        console.log('开始将localStorage数据迁移到IndexedDB...');
        
        try {
            let migratedCount = 0;
            const keysToMigrate = [];
            
            // 找出需要迁移的键
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('woz_')) {
                    keysToMigrate.push(key);
                }
            }
            
            // 迁移数据
            for (const key of keysToMigrate) {
                try {
                    const value = localStorage.getItem(key);
                    if (value) {
                        const success = await this.hybridStorage.indexedDBStorage.setItem(key, JSON.parse(value));
                        if (success) {
                            localStorage.removeItem(key);
                            migratedCount++;
                        }
                    }
                } catch (error) {
                    console.error(`迁移键${key}失败:`, error);
                }
            }
            
            console.log(`数据迁移完成，成功迁移${migratedCount}个条目`);
            this.emit('migrationComplete', { migratedCount });
            
        } catch (error) {
            console.error('数据迁移失败:', error);
            this.emit('migrationError', error);
        }
    }

    /**
     * 获取存储建议
     */
    async getStorageRecommendations() {
        const stats = await this.hybridStorage.getStorageStats();
        const recommendations = [];
        
        // IndexedDB建议
        if (stats.indexedDB.supported && stats.indexedDB.usage) {
            const usage = stats.indexedDB.usage;
            if (usage.percentage > 80) {
                recommendations.push({
                    type: 'cleanup',
                    storage: 'IndexedDB',
                    message: `IndexedDB使用率${usage.percentage}%，建议清理过期数据`,
                    priority: usage.percentage > 90 ? 'high' : 'medium'
                });
            }
        }
        
        // localStorage建议
        if (stats.localStorage.usage) {
            const usage = stats.localStorage.usage;
            if (usage.percentage > 80) {
                recommendations.push({
                    type: 'migrate',
                    storage: 'localStorage',
                    message: `localStorage使用率${usage.percentage}%，建议迁移到IndexedDB`,
                    priority: usage.percentage > 90 ? 'high' : 'medium'
                });
            }
        }
        
        return recommendations;
    }

    /**
     * 添加存储事件监听器
     */
    addEventListener(eventType, callback) {
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(callback);
    }

    /**
     * 移除存储事件监听器
     */
    removeEventListener(eventType, callback) {
        if (this.listeners.has(eventType)) {
            const callbacks = this.listeners.get(eventType);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    /**
     * 获取详细的存储分析报告
     */
    async getDetailedReport() {
        await this.checkStorageStatus();
        
        return {
            timestamp: Date.now(),
            stats: this.lastStats,
            recommendations: await this.getStorageRecommendations(),
            trends: this.getUsageTrends(),
            health: this.getStorageHealth()
        };
    }

    /**
     * 获取使用趋势
     */
    getUsageTrends() {
        // 简化的趋势分析，实际应用中可以存储历史数据
        return {
            indexedDB: 'stable',
            localStorage: 'increasing',
            overall: 'stable'
        };
    }

    /**
     * 获取存储健康状态
     */
    getStorageHealth() {
        if (!this.lastStats) return 'unknown';
        
        const { indexedDB, localStorage } = this.lastStats;
        let maxUsage = 0;
        
        if (indexedDB.usage) {
            maxUsage = Math.max(maxUsage, indexedDB.usage.percentage);
        }
        if (localStorage.usage) {
            maxUsage = Math.max(maxUsage, localStorage.usage.percentage);
        }
        
        if (maxUsage > 90) return 'critical';
        if (maxUsage > 80) return 'warning';
        if (maxUsage > 60) return 'caution';
        return 'healthy';
    }

    /**
     * 强制优化存储
     */
    async forceOptimization() {
        console.log('开始强制存储优化...');
        
        try {
            // 1. 清理过期数据
            const cleanedCount = await this.hybridStorage.cleanupStorage();
            
            // 2. 迁移localStorage数据到IndexedDB
            if (this.hybridStorage.preferIndexedDB) {
                await this.migrateDataToIndexedDB();
            }
            
            // 3. 重新检查存储状态
            await this.checkStorageStatus();
            
            console.log('强制存储优化完成');
            this.emit('optimizationComplete', { cleanedCount });
            
        } catch (error) {
            console.error('强制存储优化失败:', error);
            this.emit('optimizationError', error);
        }
    }

    /**
     * 事件监听器管理
     */
    on(event, callback) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.listeners.has(event)) {
            const callbacks = this.listeners.get(event);
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.listeners.has(event)) {
            this.listeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`事件${event}的回调函数执行失败:`, error);
                }
            });
        }
    }

    /**
     * 获取最新的存储统计
     */
    getLastStats() {
        return this.lastStats;
    }

    /**
     * 设置监控间隔
     */
    setCheckInterval(interval) {
        this.checkInterval = interval;
        
        // 如果正在监控，重新启动
        if (this.monitoringInterval) {
            this.stopMonitoring();
            this.startMonitoring();
        }
    }

    /**
     * 设置阈值
     */
    setThresholds(warning, critical) {
        this.warningThreshold = warning;
        this.criticalThreshold = critical;
        console.log(`存储阈值已更新: 警告=${warning*100}%, 临界=${critical*100}%`);
    }
}

// 导出存储监控器
if (typeof window !== 'undefined') {
    window.StorageMonitor = StorageMonitor;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageMonitor;
}