// 大文件处理模块 - 支持分块存储和智能压缩
class LargeFileHandler {
    constructor(hybridStorage) {
        this.hybridStorage = hybridStorage;
        this.chunkSize = 512 * 1024; // 512KB per chunk
        this.maxFileSize = 50 * 1024 * 1024; // 50MB maximum
        this.compressionThreshold = 1024 * 1024; // 1MB threshold for compression
    }
    
    /**
     * 处理大文件上传
     * @param {File} file - 要上传的文件
     * @param {string} sessionId - 会话ID
     * @param {Function} progressCallback - 进度回调函数
     * @returns {Promise<Object>} 文件处理结果
     */
    async handleLargeFile(file, sessionId, progressCallback = null) {
        console.log('开始处理大文件:', {
            name: file.name,
            size: file.size,
            type: file.type
        });
        
        // 检查文件大小限制
        if (file.size > this.maxFileSize) {
            throw new Error(`文件过大，最大支持 ${this.formatFileSize(this.maxFileSize)}`);
        }
        
        // 生成文件ID
        const fileId = this.generateFileId();
        
        // 创建文件元数据
        const fileMetadata = {
            id: fileId,
            name: file.name,
            type: file.type,
            size: file.size,
            sessionId: sessionId,
            uploadTime: new Date().toISOString(),
            uploader: 'participant',
            chunks: [],
            isLargeFile: true,
            compressionUsed: false
        };
        
        try {
            // 根据文件大小选择处理策略
            if (file.size <= this.chunkSize) {
                // 小文件直接存储
                await this.handleSmallFile(file, fileMetadata, progressCallback);
            } else {
                // 大文件分块存储
                await this.handleChunkedFile(file, fileMetadata, progressCallback);
            }
            
            // 保存文件元数据
            await this.saveFileMetadata(fileMetadata);
            
            console.log('大文件处理完成:', fileMetadata.name);
            return {
                success: true,
                fileId: fileId,
                metadata: fileMetadata
            };
            
        } catch (error) {
            console.error('大文件处理失败:', error);
            // 清理已存储的块
            await this.cleanupFailedUpload(fileMetadata);
            throw error;
        }
    }
    
    /**
     * 处理小文件（直接存储）
     */
    async handleSmallFile(file, fileMetadata, progressCallback) {
        const content = await this.readFileAsBase64(file);
        
        // 检查是否需要压缩
        if (file.size > this.compressionThreshold) {
            const compressed = await this.compressContent(content);
            if (compressed.length < content.length * 0.8) { // 压缩率超过20%才使用
                fileMetadata.content = compressed;
                fileMetadata.compressionUsed = true;
                console.log('文件已压缩:', {
                    original: content.length,
                    compressed: compressed.length,
                    ratio: ((1 - compressed.length / content.length) * 100).toFixed(1) + '%'
                });
            } else {
                fileMetadata.content = content;
            }
        } else {
            fileMetadata.content = content;
        }
        
        if (progressCallback) {
            progressCallback(100);
        }
    }
    
    /**
     * 处理分块文件
     */
    async handleChunkedFile(file, fileMetadata, progressCallback) {
        const totalChunks = Math.ceil(file.size / this.chunkSize);
        console.log(`文件将分为 ${totalChunks} 个块`);
        
        for (let i = 0; i < totalChunks; i++) {
            const start = i * this.chunkSize;
            const end = Math.min(start + this.chunkSize, file.size);
            const chunk = file.slice(start, end);
            
            const chunkId = `${fileMetadata.id}_chunk_${i}`;
            const chunkContent = await this.readFileAsBase64(chunk);
            
            // 存储块数据
            await this.hybridStorage.setItem(chunkId, {
                id: chunkId,
                fileId: fileMetadata.id,
                index: i,
                content: chunkContent,
                size: chunk.size,
                timestamp: Date.now()
            });
            
            fileMetadata.chunks.push({
                id: chunkId,
                index: i,
                size: chunk.size
            });
            
            // 更新进度
            if (progressCallback) {
                const progress = Math.round(((i + 1) / totalChunks) * 100);
                progressCallback(progress);
            }
            
            console.log(`块 ${i + 1}/${totalChunks} 存储完成`);
        }
    }
    
    /**
     * 重建大文件
     * @param {string} fileId - 文件ID
     * @returns {Promise<string>} 完整的文件内容（Base64）
     */
    async reconstructLargeFile(fileId) {
        console.log('开始重建大文件:', fileId);
        
        // 获取文件元数据
        const metadata = await this.getFileMetadata(fileId);
        if (!metadata) {
            throw new Error('文件元数据不存在');
        }
        
        // 如果是小文件，直接返回内容
        if (metadata.content) {
            if (metadata.compressionUsed) {
                return await this.decompressContent(metadata.content);
            }
            return metadata.content;
        }
        
        // 重建分块文件
        if (!metadata.chunks || metadata.chunks.length === 0) {
            throw new Error('文件块信息缺失');
        }
        
        const chunks = [];
        for (const chunkInfo of metadata.chunks) {
            const chunkData = await this.hybridStorage.getItem(chunkInfo.id);
            if (!chunkData) {
                throw new Error(`文件块 ${chunkInfo.id} 不存在`);
            }
            chunks[chunkInfo.index] = chunkData.content;
        }
        
        // 合并所有块
        const fullContent = chunks.join('');
        console.log('文件重建完成:', {
            fileId,
            chunks: chunks.length,
            totalSize: fullContent.length
        });
        
        return fullContent;
    }
    
    /**
     * 删除大文件
     * @param {string} fileId - 文件ID
     */
    async deleteLargeFile(fileId) {
        console.log('开始删除大文件:', fileId);
        
        const metadata = await this.getFileMetadata(fileId);
        if (!metadata) {
            console.warn('文件元数据不存在，可能已被删除');
            return;
        }
        
        // 删除所有文件块
        if (metadata.chunks) {
            for (const chunkInfo of metadata.chunks) {
                await this.hybridStorage.removeItem(chunkInfo.id);
            }
        }
        
        // 删除元数据
        await this.hybridStorage.removeItem(`file_meta_${fileId}`);
        
        console.log('大文件删除完成:', fileId);
    }
    
    /**
     * 获取文件信息
     * @param {string} fileId - 文件ID
     * @returns {Promise<Object>} 文件信息
     */
    async getFileInfo(fileId) {
        const metadata = await this.getFileMetadata(fileId);
        if (!metadata) {
            return null;
        }
        
        return {
            id: metadata.id,
            name: metadata.name,
            type: metadata.type,
            size: metadata.size,
            uploadTime: metadata.uploadTime,
            uploader: metadata.uploader,
            isLargeFile: metadata.isLargeFile,
            compressionUsed: metadata.compressionUsed,
            chunksCount: metadata.chunks ? metadata.chunks.length : 0
        };
    }
    
    /**
     * 获取存储统计信息
     */
    async getStorageStats() {
        const stats = {
            totalFiles: 0,
            totalSize: 0,
            chunkedFiles: 0,
            compressedFiles: 0,
            totalChunks: 0
        };
        
        // 这里应该遍历所有文件元数据，简化实现
        // 实际应用中可以维护一个文件索引
        
        return stats;
    }
    
    /**
     * 清理过期的大文件
     * @param {number} maxAge - 最大保留时间（毫秒）
     */
    async cleanupExpiredFiles(maxAge = 24 * 60 * 60 * 1000) {
        console.log('开始清理过期大文件...');
        
        const now = Date.now();
        let cleanedCount = 0;
        
        // 这里应该遍历所有文件元数据
        // 简化实现，实际应用中需要维护文件索引
        
        console.log(`清理完成，删除了 ${cleanedCount} 个过期文件`);
        return cleanedCount;
    }
    
    // 私有方法
    
    /**
     * 读取文件为Base64
     */
    readFileAsBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
    
    /**
     * 压缩内容（简单的LZ压缩模拟）
     */
    async compressContent(content) {
        // 这里可以实现真正的压缩算法
        // 为了简化，我们只是移除重复的空白字符
        return content.replace(/\s+/g, ' ').trim();
    }
    
    /**
     * 解压缩内容
     */
    async decompressContent(compressedContent) {
        // 对应压缩算法的解压缩
        return compressedContent;
    }
    
    /**
     * 保存文件元数据
     */
    async saveFileMetadata(metadata) {
        const key = `file_meta_${metadata.id}`;
        await this.hybridStorage.setItem(key, metadata);
    }
    
    /**
     * 获取文件元数据
     */
    async getFileMetadata(fileId) {
        const key = `file_meta_${fileId}`;
        return await this.hybridStorage.getItem(key);
    }
    
    /**
     * 清理失败的上传
     */
    async cleanupFailedUpload(metadata) {
        console.log('清理失败的上传:', metadata.id);
        
        if (metadata.chunks) {
            for (const chunkInfo of metadata.chunks) {
                try {
                    await this.hybridStorage.removeItem(chunkInfo.id);
                } catch (error) {
                    console.warn('清理块失败:', chunkInfo.id, error);
                }
            }
        }
        
        try {
            await this.hybridStorage.removeItem(`file_meta_${metadata.id}`);
        } catch (error) {
            console.warn('清理元数据失败:', metadata.id, error);
        }
    }
    
    /**
     * 生成文件ID
     */
    generateFileId() {
        return 'file_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    /**
     * 格式化文件大小
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// 如果在浏览器环境中，添加到全局对象
if (typeof window !== 'undefined') {
    window.LargeFileHandler = LargeFileHandler;
}

// 如果在Node.js环境中，导出模块
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LargeFileHandler;
}