(function () {
    'use strict';
    const version = 20250820

    // 保存原始的XMLHttpRequest
    const OriginalXHR = window.XMLHttpRequest;

    // 重写XMLHttpRequest
    window.XMLHttpRequest = function () {
        const xhr = new OriginalXHR();

        // 保存原始方法
        const originalOpen = xhr.open;
        const originalSend = xhr.send;
        const originalSetRequestHeader = xhr.setRequestHeader;

        let method, url, headers = {};

        // 重写open方法
        xhr.open = function (m, u, ...args) {
            method = m;
            url = u;
            return originalOpen.apply(this, [m, u, ...args]);
        };

        // 重写setRequestHeader方法
        xhr.setRequestHeader = function (header, value) {
            headers[header] = value;
            return originalSetRequestHeader.apply(this, arguments);
        };

        // 重写send方法
        xhr.send = function (data) {
            // 检查是否是目标API
            if (url && url.includes('api/submedia/add')) {
                console.log('=== 拦截到 XMLHttpRequest api/submedia/add 请求 ===');
                console.log('请求方法:', method);
                console.log('请求URL:', url);
                console.log('请求头:', headers);
                console.log('请求数据:', data);

                // 解析请求数据
                let mediaData = null;

                if (typeof data === 'string') {
                    try {
                        mediaData = JSON.parse(data);
                        console.log('解析的媒体数据:', mediaData);
                    } catch (e) {
                        console.error('JSON解析失败:', e);
                    }
                } else if (data instanceof FormData) {
                    mediaData = {};
                    for (let [key, value] of data.entries()) {
                        mediaData[key] = value;
                    }
                    console.log('FormData媒体数据:', mediaData);
                }

                // 显示资源详情弹窗
                if (mediaData && mediaData.tmdb_id) {
                    showMediaDetailsModal(mediaData);
                } else {
                    // 显示简化的alert弹框
                    showSimpleAlert(mediaData, url, method);
                }

                console.log('====================================================');
                console.log('⚠️ 请求已被拦截，不会自动发送。请在弹窗中手动点击订阅按钮。');

                // 阻止原始请求发送
                return;
            }

            return originalSend.apply(this, arguments);
        };

        return xhr;
    };

    // 显示简化的alert弹框
    function showSimpleAlert(data, url, method) {
        let alertMessage = `🚀 拦截到 api/submedia/add 请求！\n\n`;
        alertMessage += `📍 URL: ${url}\n`;
        alertMessage += `🔧 方法: ${method}\n`;

        if (data) {
            alertMessage += `📄 数据: ${JSON.stringify(data, null, 2)}`;
        } else {
            alertMessage += `📭 无请求体数据`;
        }

        alert(alertMessage);
    }

    // 显示资源详情弹窗（Arco Design风格）
    function showMediaDetailsModal(mediaData) {
        // 移除现有的弹窗
        const existingModal = document.getElementById('media-details-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // 创建弹窗遮罩
        const overlay = document.createElement('div');
        overlay.id = 'media-details-modal';
        // 存储媒体数据到弹窗元素上
        overlay.dataset.tmdbId = mediaData.tmdb_id;
        overlay.dataset.mediaType = mediaData.type || 'movie';
        overlay.dataset.mediaTitle = mediaData.title || '未知标题';

        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.6);
            z-index: 10000;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

        // 创建弹窗容器
        const modal = document.createElement('div');
        modal.style.cssText = `
            background: var(--color-bg-2, white);
            border-radius: 12px;
            width: 1000px;
            max-width: 95vw;
            max-height: 85vh;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            animation: slideUp 0.3s ease;
            margin: 20px;
            position: relative;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        `;

        // 创建弹窗内容
        modal.innerHTML = createModalContent(mediaData);

        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        // 添加关闭事件
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                closeModal();
            }
        });

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                closeModal();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        function closeModal() {
            overlay.style.animation = 'fadeOut 0.3s ease';
            modal.style.animation = 'slideDown 0.3s ease';
            setTimeout(() => {
                overlay.remove();
            }, 300);
        }

        // 绑定关闭按钮事件
        const closeBtn = modal.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', closeModal);
        }

        // 绑定操作按钮事件
        setupModalButtons(modal, mediaData);

        // 获取资源详情
        if (mediaData.tmdb_id) {
            fetchResourceDetails(mediaData.tmdb_id, mediaData.type || 'movie', modal);
            // 自动触发资源搜索
            searchResources(mediaData, modal);
        }
    }

    // 创建弹窗内容HTML（Arco Design风格）
    function createModalContent(mediaData) {
        const posterUrl = mediaData.poster_path
            ? `https://image.tmdb.org/t/p/w300${mediaData.poster_path}`
            : getPlaceholderImage(300, 450);

        const backdropUrl = mediaData.backdrop_path
            ? `https://image.tmdb.org/t/p/w780${mediaData.backdrop_path}`
            : '';

        return `
            <!-- 固定头部 -->
            <div class="modal-header" style="
                flex-shrink: 0;
                background: var(--color-bg-2, white);
                padding: 24px 24px 16px;
                border-bottom: 1px solid var(--color-border-2, #e5e6eb);
                border-radius: 12px 12px 0 0;
            ">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <h2 style="
                        margin: 0;
                        font-size: 20px;
                        font-weight: 600;
                        color: var(--color-text-1, #1a1a1a);
                    ">${mediaData.title || '未知标题'} - 资源详情</h2>
                    <button class="close-btn" style="
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        color: var(--color-text-3, #86909c);
                        padding: 4px;
                        border-radius: 4px;
                        transition: all 0.2s;
                    " onmouseover="this.style.backgroundColor='var(--color-fill-2, #f2f3f5)'" 
                       onmouseout="this.style.backgroundColor='transparent'">×</button>
                </div>
            </div>
            
            <!-- 可滚动内容区域 -->
            <div class="modal-body" style="
                flex: 1;
                overflow-y: auto;
                padding: 24px;
            ">
                <!-- 整体loading状态 -->
                <div id="modal-loading" style="
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 80px 20px;
                    min-height: 400px;
                ">
                    <div style="
                        width: 60px;
                        height: 60px;
                        border: 4px solid var(--color-border-2, #e0e0e0);
                        border-left: 4px solid var(--color-primary-6, #3370ff);
                        border-radius: 50%;
                        animation: spin 1s linear infinite;
                        margin-bottom: 24px;
                    "></div>
                    <div style="
                        font-size: 18px;
                        font-weight: 600;
                        color: var(--color-text-1, #333);
                        margin-bottom: 12px;
                    ">正在加载资源详情...</div>
                    <div style="
                        font-size: 14px;
                        color: var(--color-text-3, #999);
                        text-align: center;
                        line-height: 1.5;
                    ">正在获取《${mediaData.title || '未知标题'}》的资源详情</div>
                </div>
                
                <!-- 实际内容（初始隐藏） -->
                <div id="modal-content" style="display: none;">
                    <!-- 媒体信息卡片 -->
                    <div style="
                        background: var(--color-bg-3, #fafafa);
                        border-radius: 8px;
                        border: 1px solid var(--color-border-2, #e5e6eb);
                        padding: 24px;
                        margin-bottom: 24px;
                    ">
                        <div style="display: flex; gap: 24px;">
                            <!-- 海报 -->
                            <div style="flex-shrink: 0;">
                                <img 
                                    src="${posterUrl}" 
                                    alt="${mediaData.title || '未知标题'}"
                                    style="
                                        width: 180px;
                                        height: 270px;
                                        object-fit: cover;
                                        border-radius: 12px;
                                        box-shadow: 0 8px 24px rgba(0,0,0,0.12);
                                    "
                                    onerror="this.src='${getPlaceholderImage(180, 270)}'"
                                >
                            </div>
                            
                            <!-- 详细信息 -->
                            <div style="flex: 1; display: flex; flex-direction: column; gap: 16px;">
                                <div>
                                    <h1 style="
                                        margin: 0 0 8px;
                                        font-size: 28px;
                                        font-weight: 700;
                                        color: var(--color-text-1, #1a1a1a);
                                    ">
                                        ${mediaData.title || '未知标题'}
                                    </h1>
                                    <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 16px;">
                                        <span style="
                                            background: ${mediaData.type === 'tv' ? 'var(--color-success-light-1, rgba(0, 180, 42, 0.1))' : 'var(--color-primary-light-1, rgba(51, 112, 255, 0.1))'};
                                            color: ${mediaData.type === 'tv' ? 'var(--color-success-6, #00b42a)' : 'var(--color-primary-6, #3370ff)'};
                                            padding: 4px 12px;
                                            border-radius: 16px;
                                            font-size: 12px;
                                            font-weight: 600;
                                            text-transform: uppercase;
                                        ">${mediaData.type === 'tv' ? '电视剧' : '电影'}</span>
                                        
                                        ${mediaData.year ? `<span style="
                                            background: var(--color-fill-2, #f2f3f5);
                                            color: var(--color-text-2, #666);
                                            padding: 4px 12px;
                                            border-radius: 16px;
                                            font-size: 12px;
                                            font-weight: 600;
                                        ">${mediaData.year}</span>` : ''}
                                    </div>
                                </div>
                                
                                <!-- TMDB信息 -->
                                <div style="
                                    background: var(--color-bg-1, white);
                                    border: 1px solid var(--color-border-3, #e5e6eb);
                                    border-radius: 6px;
                                    padding: 16px;
                                ">
                                    <div style="font-size: 14px; font-weight: 600; color: var(--color-text-1, #333); margin-bottom: 8px;">
                                        📺 TMDB信息
                                    </div>
                                    <div style="font-size: 13px; color: var(--color-text-3, #666); word-break: break-all;">
                                        ID: ${mediaData.tmdb_id || 'N/A'}
                                    </div>
                                </div>
                                
                                <!-- 剧情简介区域 -->
                                <div id="plot-overview" style="
                                    background: var(--color-bg-1, white);
                                    border: 1px solid var(--color-border-3, #e5e6eb);
                                    border-radius: 6px;
                                    padding: 16px;
                                    display: block;
                                ">
                                    <div style="font-size: 14px; font-weight: 600; color: var(--color-text-1, #333); margin-bottom: 8px;">
                                        📖 剧情简介
                                    </div>
                                    <div id="plot-content" style="font-size: 13px; color: var(--color-text-2, #666); line-height: 1.5;">
                                        暂无剧情信息
                                    </div>
                                </div>
                                
                                <!-- 操作按钮 -->
                                <div style="
                                    display: flex;
                                    gap: 12px;
                                    flex-wrap: wrap;
                                    margin-top: 8px;
                                ">
                                    <button class="add-subscription-btn" style="
                                        background: var(--color-success-6, #00b42a);
                                        color: white;
                                        border: none;
                                        padding: 8px 16px;
                                        border-radius: 6px;
                                        font-size: 14px;
                                        font-weight: 500;
                                        cursor: pointer;
                                        transition: all 0.2s;
                                    " onmouseover="this.style.backgroundColor='var(--color-success-7, #009a29)'"
                                       onmouseout="this.style.backgroundColor='var(--color-success-6, #00b42a)'">
                                        ➕ 添加订阅
                                    </button>
                                    
                                    <button class="view-tmdb-btn" style="
                                        background: transparent;
                                        color: var(--color-text-2, #666);
                                        border: 1px solid var(--color-border-2, #e5e6eb);
                                        padding: 8px 16px;
                                        border-radius: 6px;
                                        font-size: 14px;
                                        font-weight: 500;
                                        cursor: pointer;
                                        transition: all 0.2s;
                                    " onmouseover="this.style.borderColor='var(--color-primary-6, #3370ff)'; this.style.color='var(--color-primary-6, #3370ff)'"
                                       onmouseout="this.style.borderColor='var(--color-border-2, #e5e6eb)'; this.style.color='var(--color-text-2, #666)'">
                                        🌐 查看TMDB
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- 资源详情区域 - Tab样式 -->
                    <div id="resource-details" style="display: block;">
                        <!-- Tab标签栏 -->
                        <div id="resource-tabs" style="
                            display: flex;
                            background: var(--color-bg-2, white);
                            border-bottom: 2px solid var(--color-border-2, #e5e6eb);
                            margin-bottom: 0;
                            border-radius: 8px 8px 0 0;
                            overflow-x: auto;
                        ">
                            <!-- 115网盘标签 -->
                            <div id="tab-115" class="resource-tab" data-type="115" style="
                                padding: 16px 20px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: 500;
                                color: var(--color-text-2, #666);
                                border-bottom: 3px solid transparent;
                                white-space: nowrap;
                                transition: all 0.3s ease;
                                user-select: none;
                                display: none;
                            ">
                                📁 115
                            </div>
                            
                            <!-- 磁力链接标签 -->
                            <div id="tab-magnet" class="resource-tab" data-type="magnet" style="
                                padding: 16px 20px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: 500;
                                color: var(--color-text-2, #666);
                                border-bottom: 3px solid transparent;
                                white-space: nowrap;
                                transition: all 0.3s ease;
                                user-select: none;
                                display: none;
                            ">
                                🧲 磁力
                            </div>
                            
                            <!-- ed2k标签 -->
                            <div id="tab-ed2k" class="resource-tab" data-type="ed2k" style="
                                padding: 16px 20px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: 500;
                                color: var(--color-text-2, #666);
                                border-bottom: 3px solid transparent;
                                white-space: nowrap;
                                transition: all 0.3s ease;
                                user-select: none;
                                display: none;
                            ">
                                🔗 ed2k
                            </div>
                            
                            <!-- 在线视频标签 -->
                            <div id="tab-video" class="resource-tab" data-type="video" style="
                                padding: 16px 20px;
                                cursor: pointer;
                                font-size: 14px;
                                font-weight: 500;
                                color: var(--color-text-2, #666);
                                border-bottom: 3px solid transparent;
                                white-space: nowrap;
                                transition: all 0.3s ease;
                                user-select: none;
                                display: none;
                            ">
                                📺 视频
                            </div>
                        </div>

                        <!-- Tab内容区域 -->
                        <div id="resource-tab-content" style="
                            background: var(--color-bg-3, #fafafa);
                            border: 1px solid var(--color-border-2, #e5e6eb);
                            border-top: none;
                            border-radius: 0 0 8px 8px;
                            min-height: 400px;
                        ">
                            <!-- 115网盘资源面板 -->
                            <div id="panel-115" class="resource-panel" data-type="115" style="
                                padding: 20px;
                                display: none;
                            ">
                                <div id="pan115-resources">
                                    <div style="text-align: center; color: var(--color-text-3, #999); padding: 40px 20px;">
                                        <div style="font-size: 48px; margin-bottom: 16px;">📁</div>
                                        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">115网盘资源</div>
                                        <div style="font-size: 14px; color: var(--color-text-3, #999);">点击上方tab加载资源</div>
                                    </div>
                                </div>
                            </div>

                            <!-- 磁力链接资源面板 -->
                            <div id="panel-magnet" class="resource-panel" data-type="magnet" style="
                                padding: 20px;
                                display: none;
                            ">
                                <div id="magnet-resources">
                                    <div style="text-align: center; color: var(--color-text-3, #999); padding: 40px 20px;">
                                        <div style="font-size: 48px; margin-bottom: 16px;">🧲</div>
                                        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">磁力链接资源</div>
                                        <div style="font-size: 14px; color: var(--color-text-3, #999);">点击上方tab加载资源</div>
                                    </div>
                                </div>
                            </div>

                            <!-- ed2k资源面板 -->
                            <div id="panel-ed2k" class="resource-panel" data-type="ed2k" style="
                                padding: 20px;
                                display: none;
                            ">
                                <div id="ed2k-resources">
                                    <div style="text-align: center; color: var(--color-text-3, #999); padding: 40px 20px;">
                                        <div style="font-size: 48px; margin-bottom: 16px;">🔗</div>
                                        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">ed2k资源</div>
                                        <div style="font-size: 14px; color: var(--color-text-3, #999);">点击上方tab加载资源</div>
                                    </div>
                                </div>
                            </div>

                            <!-- 在线视频资源面板 -->
                            <div id="panel-video" class="resource-panel" data-type="video" style="
                                padding: 20px;
                                display: none;
                            ">
                                <div id="video-resources">
                                    <div style="text-align: center; color: var(--color-text-3, #999); padding: 40px 20px;">
                                        <div style="font-size: 48px; margin-bottom: 16px;">📺</div>
                                        <div style="font-size: 16px; font-weight: 500; margin-bottom: 8px;">在线视频资源</div>
                                        <div style="font-size: 14px; color: var(--color-text-3, #999);">点击上方tab加载资源</div>
                                    </div>
                                </div>
                            </div>

                            <!-- 默认显示：暂无可用资源 -->
                            <div id="no-resources-panel" style="
                                padding: 60px 20px;
                                text-align: center;
                                color: var(--color-text-3, #999);
                                display: block;
                            ">
                                <div style="font-size: 64px; margin-bottom: 20px;">📭</div>
                                <div style="font-size: 18px; font-weight: 500; margin-bottom: 12px;">暂无可用资源</div>
                                <div style="font-size: 14px; line-height: 1.5;">
                                    正在搜索可用的115网盘、磁力链接、ed2k和在线视频资源...
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
            
            <!-- 样式 -->
            <style>
                @keyframes fadeIn {
                    from { opacity: 0; }
                    to { opacity: 1; }
                }
                
                @keyframes fadeOut {
                    from { opacity: 1; }
                    to { opacity: 0; }
                }
                
                @keyframes slideUp {
                    from { transform: translateY(30px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                
                @keyframes slideDown {
                    from { transform: translateY(0); opacity: 1; }
                    to { transform: translateY(30px); opacity: 0; }
                }
                
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* Tab样式 */
                .resource-tab {
                    position: relative;
                    overflow: hidden;
                }
                
                .resource-tab:hover {
                    background: var(--color-fill-1, #f7f8fa) !important;
                    color: var(--color-text-1, #333) !important;
                }
                
                .resource-tab.active {
                    background: var(--color-bg-3, #fafafa) !important;
                    color: var(--color-primary-6, #3370ff) !important;
                    border-bottom-color: var(--color-primary-6, #3370ff) !important;
                    font-weight: 600 !important;
                }
                
                .resource-tab::after {
                    content: '';
                    position: absolute;
                    bottom: 0;
                    left: 0;
                    right: 0;
                    height: 3px;
                    background: var(--color-primary-6, #3370ff);
                    transform: scaleX(0);
                    transition: transform 0.3s ease;
                }
                
                .resource-tab.active::after {
                    transform: scaleX(1);
                }
                
                /* 资源面板过渡动画 */
                .resource-panel {
                    transition: opacity 0.3s ease, transform 0.3s ease;
                }
                
                .resource-panel.fade-in {
                    opacity: 1;
                    transform: translateY(0);
                }
                
                .resource-panel.fade-out {
                    opacity: 0;
                    transform: translateY(10px);
                }
                
                /* 响应式设计 */
                @media (max-width: 768px) {
                    /* 弹窗容器调整 */
                    #media-details-modal > div {
                        width: 95vw !important;
                        max-width: 95vw !important;
                        margin: 10px !important;
                        overflow: hidden !important;
                    }
                    
                    /* 弹窗头部调整 */
                    .modal-header {
                        padding: 16px 16px 12px !important;
                        flex-shrink: 0 !important;
                    }
                    
                    .modal-header h2 {
                        font-size: 16px !important;
                        line-height: 1.4 !important;
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        margin-right: 8px !important;
                    }
                    
                    /* 弹窗内容调整 */
                    .modal-body {
                        padding: 16px !important;
                        flex: 1 !important;
                        overflow-y: auto !important;
                    }
                    
                    /* 媒体信息卡片布局调整 */
                    .modal-body > div:nth-child(2) > div:first-child {
                        padding: 16px !important;
                        margin-bottom: 16px !important;
                    }
                    
                    .modal-body > div:nth-child(2) > div:first-child > div:first-child {
                        flex-direction: column !important;
                        align-items: center !important;
                        text-align: center !important;
                        gap: 20px !important;
                    }
                    
                    /* 海报容器调整 */
                    .modal-body > div:nth-child(2) > div:first-child > div:first-child > div:first-child {
                        flex-shrink: 0 !important;
                        width: 100% !important;
                        display: flex !important;
                        justify-content: center !important;
                        margin-bottom: 16px !important;
                    }
                    
                    /* 海报图片调整 */
                    .modal-body img {
                        width: 140px !important;
                        height: 210px !important;
                        margin: 0 !important;
                    }
                    
                    /* 详细信息容器调整 */
                    .modal-body > div:nth-child(2) > div:first-child > div:first-child > div:last-child {
                        flex: none !important;
                        width: 100% !important;
                        display: flex !important;
                        flex-direction: column !important;
                        gap: 12px !important;
                        text-align: left !important;
                    }
                    
                    /* 媒体标题调整 */
                    .modal-body h1 {
                        font-size: 22px !important;
                        line-height: 1.3 !important;
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        text-align: left !important;
                        margin-bottom: 12px !important;
                    }
                    
                    /* 标签容器调整 */
                    .modal-body h1 + div {
                        justify-content: flex-start !important;
                        margin-bottom: 16px !important;
                    }
                    
                    /* TMDB信息区域调整 */
                    .modal-body > div:nth-child(2) div[style*="background: var(--color-bg-1"] {
                        margin-bottom: 12px !important;
                        padding: 12px !important;
                    }
                    
                    /* 剧情简介区域调整 */
                    #plot-overview {
                        margin-bottom: 16px !important;
                        padding: 12px !important;
                    }
                    
                    #plot-content {
                        font-size: 13px !important;
                        line-height: 1.6 !important;
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        text-align: left !important;
                    }
                    
                    /* 操作按钮区域调整 */
                    .modal-body button {
                        padding: 12px 20px !important;
                        font-size: 14px !important;
                        border-radius: 8px !important;
                        min-height: 44px !important;
                        flex: 1 !important;
                        font-weight: 600 !important;
                    }
                    
                    /* 按钮容器调整为垂直布局 */
                    .modal-body > div:nth-child(2) > div:first-child > div:first-child > div:last-child > div:last-child {
                        flex-direction: column !important;
                        gap: 10px !important;
                        margin-top: 16px !important;
                        width: 100% !important;
                    }
                    
                    /* 手机端资源标题防溢出 */
                    .resource-title {
                        word-break: break-word !important;
                        overflow-wrap: break-word !important;
                        hyphens: auto !important;
                    }
                    
                    /* 手机端按钮组调整 */
                    .resource-buttons {
                        flex-direction: column !important;
                        gap: 6px !important;
                    }
                    
                    .resource-buttons button {
                        width: 100% !important;
                        min-width: auto !important;
                        padding: 8px 12px !important;
                        font-size: 12px !important;
                    }
                    
                    /* 手机端资源项调整 */
                    .resource-item {
                        flex-direction: column !important;
                        align-items: stretch !important;
                        gap: 12px !important;
                    }
                    
                    /* 资源区域标题调整 */
                    #pan115-section > div:first-child,
                    #magnet-section > div:first-child {
                        padding: 12px 16px !important;
                        font-size: 14px !important;
                    }
                    
                    /* 资源区域内容调整 */
                    #pan115-resources,
                    #magnet-resources {
                        padding: 12px !important;
                    }
                    
                    /* Loading状态调整 */
                    #modal-loading {
                        padding: 40px 20px !important;
                        min-height: 300px !important;
                    }
                    
                    #modal-loading > div:first-child {
                        width: 40px !important;
                        height: 40px !important;
                        margin-bottom: 16px !important;
                    }
                    
                    #modal-loading > div:nth-child(2) {
                        font-size: 16px !important;
                        margin-bottom: 8px !important;
                    }
                    
                    #modal-loading > div:last-child {
                        font-size: 12px !important;
                        line-height: 1.4 !important;
                    }
                }
            </style>
        `;
    }

    // 获取占位图片
    function getPlaceholderImage(width, height) {
        // 使用 encodeURIComponent 替代 btoa 来支持中文字符
        const svgContent = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#f0f0f0"/>
            <text x="50%" y="50%" font-family="Arial" font-size="14" fill="#999999" text-anchor="middle" dy=".3em">
                No Image
            </text>
        </svg>`;

        // 使用 encodeURIComponent 进行 URL 编码
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgContent)}`;
    }

    // 设置弹窗按钮事件
    function setupModalButtons(modal, mediaData) {
        // 添加订阅按钮
        const subscribeBtn = modal.querySelector('.add-subscription-btn');
        if (subscribeBtn) {
            subscribeBtn.addEventListener('click', () => {
                addSubscription(mediaData, null, modal);
            });
        }
    }

    // 设置资源Tab切换功能
    function setupResourceTabs(modal, mediaData, mediaInfo = null) {
        const tabs = modal.querySelectorAll('.resource-tab');
        const panels = modal.querySelectorAll('.resource-panel');

        // 存储已加载的资源类型，避免重复加载
        const loadedResources = new Set();

        // 将已加载资源存储到modal上，供其他函数使用
        modal._loadedResources = loadedResources;

        // Tab点击事件
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const resourceType = tab.dataset.type;

                // 更新tab状态
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                // 更新面板显示
                panels.forEach(panel => {
                    if (panel.dataset.type === resourceType) {
                        panel.style.display = 'block';
                        panel.classList.add('fade-in');
                        panel.classList.remove('fade-out');
                    } else {
                        panel.style.display = 'none';
                        panel.classList.add('fade-out');
                        panel.classList.remove('fade-in');
                    }
                });

                // 隐藏默认面板
                const noResourcesPanel = modal.querySelector('#no-resources-panel');
                if (noResourcesPanel) {
                    noResourcesPanel.style.display = 'none';
                }

                // 如果尚未加载该资源，则触发加载
                if (!loadedResources.has(resourceType)) {
                    loadResourceByType(mediaData, resourceType, modal, mediaInfo);
                    loadedResources.add(resourceType);
                }
            });
        });
    }

    // 根据资源类型加载资源
    function loadResourceByType(mediaData, resourceType, modal, mediaInfo = null) {
        const container = modal.querySelector(`#${resourceType === '115' ? 'pan115' : resourceType}-resources`);

        if (!container) {
            console.warn(`未找到资源容器: ${resourceType}`);
            return;
        }

        // 显示加载状态
        container.innerHTML = createLoadingHTML(`正在加载${getResourceTypeName(resourceType)}选择器...`);

        try {
            if (mediaData.type === 'tv') {
                // 电视剧资源需要显示选择器
                if (resourceType === 'magnet') {
                    // 磁力资源可以按季或按集获取
                    const numberOfSeasons = mediaInfo?.number_of_seasons || 1;
                    container.innerHTML = createTVMagnetSelectorHTML(mediaData, numberOfSeasons);
                } else if (resourceType === 'ed2k' || resourceType === 'video') {
                    // ed2k和video仅按集获取
                    const numberOfSeasons = mediaInfo?.number_of_seasons || 1;
                    container.innerHTML = createTVEpisodeOnlySelectorHTML(mediaData, resourceType, numberOfSeasons);
                } else {
                    // 115网盘资源直接获取
                    container.innerHTML = createResourceButtonHTML(mediaData, resourceType);
                }
            } else {
                // 电影资源直接显示获取按钮
                container.innerHTML = createResourceButtonHTML(mediaData, resourceType);
            }
        } catch (error) {
            console.error(`加载${resourceType}资源失败:`, error);
            container.innerHTML = createErrorHTML(`加载${getResourceTypeName(resourceType)}失败: ${error.message}`);
        }
    }

    // 获取资源类型中文名称
    function getResourceTypeName(resourceType) {
        const typeNames = {
            '115': '115网盘资源',
            'magnet': '磁力链接资源',
            'ed2k': 'ed2k资源',
            'video': '在线视频资源'
        };
        return typeNames[resourceType] || resourceType;
    }

    // 初始化资源Tab显示
    function initializeResourceTabs(modal, availableResources, mediaData, mediaInfo) {
        const noResourcesPanel = modal.querySelector('#no-resources-panel');
        const tabsContainer = modal.querySelector('#resource-tabs');
        const contentContainer = modal.querySelector('#resource-tab-content');

        // 检查是否有可用资源
        const hasResources = availableResources.has_115 ||
            availableResources.has_magnet ||
            availableResources.has_ed2k ||
            availableResources.has_video;

        if (!hasResources) {
            // 没有可用资源时显示默认面板
            noResourcesPanel.innerHTML = `
                <div style="font-size: 64px; margin-bottom: 20px;">😞</div>
                <div style="font-size: 18px; font-weight: 500; margin-bottom: 12px;">暂无可用资源</div>
                <div style="font-size: 14px; line-height: 1.5; color: var(--color-text-3, #999);">
                    该媒体暂时没有找到115网盘、磁力链接、ed2k和在线视频资源
                </div>
            `;
            noResourcesPanel.style.display = 'block';
            return;
        }

        // 设置tab切换事件，传递媒体信息
        setupResourceTabs(modal, mediaData, mediaInfo);

        // 显示对应的Tab
        let firstActiveTab = null;

        if (availableResources.has_115) {
            const tab115 = modal.querySelector('#tab-115');
            tab115.style.display = 'block';
            if (!firstActiveTab) firstActiveTab = tab115;
        }

        if (availableResources.has_magnet) {
            const tabMagnet = modal.querySelector('#tab-magnet');
            tabMagnet.style.display = 'block';
            if (!firstActiveTab) firstActiveTab = tabMagnet;
        }

        if (availableResources.has_ed2k) {
            const tabEd2k = modal.querySelector('#tab-ed2k');
            tabEd2k.style.display = 'block';
            if (!firstActiveTab) firstActiveTab = tabEd2k;
        }

        if (availableResources.has_video) {
            const tabVideo = modal.querySelector('#tab-video');
            tabVideo.style.display = 'block';
            if (!firstActiveTab) firstActiveTab = tabVideo;
        }

        // 隐藏默认面板
        noResourcesPanel.style.display = 'none';

        // 激活第一个可用的tab
        if (firstActiveTab) {
            setTimeout(() => {
                firstActiveTab.click();
            }, 100);
        }
        // 查看TMDB按钮
        const tmdbBtn = modal.querySelector('.view-tmdb-btn');
        if (tmdbBtn) {
            tmdbBtn.addEventListener('click', () => {
                const tmdbUrl = `https://www.themoviedb.org/${mediaData.type === 'tv' ? 'tv' : 'movie'}/${mediaData.tmdb_id}`;
                window.open(tmdbUrl, '_blank');
            });
        }
    }


    // 搜索资源
    async function searchResources(mediaData, modal) {
        const modalLoading = modal.querySelector('#modal-loading');
        const modalContent = modal.querySelector('#modal-content');

        try {
            // 模拟API调用 - 这里需要根据实际的API来调整
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证token');
            }

            // 根据媒体类型构建资源搜索API
            const resourceEndpoint = mediaData.type === 'tv' ?
                `/api/nullbr/tv/${mediaData.tmdb_id}/resources` :
                `/api/nullbr/movie/${mediaData.tmdb_id}/resources`;

            const response = await fetch(resourceEndpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('资源搜索失败');
            }

            const resourceData = await response.json();

            // 隐藏整体loading，显示实际内容
            modalLoading.style.display = 'none';
            modalContent.style.display = 'block';

            // 显示剧情信息
            const plotContent = modal.querySelector('#plot-content');

            // 处理电影和电视剧的不同数据结构
            let mediaInfo = null;
            if (resourceData.data && resourceData.data.tv_info) {
                mediaInfo = resourceData.data.tv_info;
            } else if (resourceData.data && resourceData.data.movie_info) {
                mediaInfo = resourceData.data.movie_info;
            }

            if (mediaInfo && mediaInfo.overview) {
                plotContent.innerHTML = `
                    <div style="line-height: 1.6; color: var(--color-text-2, #666);">
                        ${mediaInfo.overview}
                    </div>
                `;
            } else {
                plotContent.innerHTML = `
                    <div style="color: var(--color-text-3, #999);">
                        暂无剧情信息
                    </div>
                `;
            }

            // 初始化资源Tab显示
            if (resourceData.data && resourceData.data.available_resources) {
                initializeResourceTabs(modal, resourceData.data.available_resources, mediaData, mediaInfo);
            } else {
                // 没有资源可用性数据，显示默认状态
                const noResourcesPanel = modal.querySelector('#no-resources-panel');
                noResourcesPanel.innerHTML = `
                    <div style="font-size: 64px; margin-bottom: 20px;">⚠️</div>
                    <div style="font-size: 18px; font-weight: 500; margin-bottom: 12px;">资源信息获取失败</div>
                    <div style="font-size: 14px; line-height: 1.5; color: var(--color-text-3, #999);">
                        无法获取资源可用性信息，请稍后重试
                    </div>
                `;
                noResourcesPanel.style.display = 'block';
            }

        } catch (error) {
            console.error('搜索资源失败:', error);

            // 隐藏整体loading，显示实际内容
            modalLoading.style.display = 'none';
            modalContent.style.display = 'block';

            // 显示错误信息
            const plotContent = modal.querySelector('#plot-content');
            plotContent.innerHTML = `
                <div style="color: var(--color-text-3, #999);">
                    暂无剧情信息
                </div>
            `;

            // 显示资源获取错误
            const noResourcesPanel = modal.querySelector('#no-resources-panel');
            noResourcesPanel.innerHTML = `
                <div style="font-size: 64px; margin-bottom: 20px;">❌</div>
                <div style="font-size: 18px; font-weight: 500; margin-bottom: 12px; color: var(--color-danger-6, #f53f3f);">资源搜索失败</div>
                <div style="font-size: 14px; line-height: 1.5; color: var(--color-text-3, #999);">
                    ${error.message || '网络连接错误，请检查网络后重试'}
                </div>
            `;
            noResourcesPanel.style.display = 'block';
        }
    }

    // 添加订阅
    async function addSubscription(mediaData, requestInfo = null, modal = null) {
        const subscribeBtn = modal?.querySelector('.add-subscription-btn');

        try {
            // 更新按钮状态为加载中
            if (subscribeBtn) {
                subscribeBtn.disabled = true;
                subscribeBtn.innerHTML = '⏳ 添加中...';
                subscribeBtn.style.opacity = '0.6';
            }

            // 直接使用fetch发送请求，简单高效
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证token，请先登录');
            }

            const response = await fetch('/api/submedia/add', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mediaData)
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: 订阅添加失败`);
            }

            const responseData = await response.json();
            console.log('✅ 手动订阅请求成功:', responseData);

            // 更新按钮状态
            if (subscribeBtn) {
                // 检查是否是"已存在"的情况
                if (responseData && responseData.msg && responseData.msg.includes('已存在')) {
                    subscribeBtn.innerHTML = 'ℹ️ 已存在';
                    subscribeBtn.style.backgroundColor = 'var(--color-warning-6, #ff7d00)';
                } else {
                    subscribeBtn.innerHTML = '✅ 订阅成功';
                    subscribeBtn.style.backgroundColor = 'var(--color-success-6, #00b42a)';
                }
            }

            // 显示成功消息
            let successMessage = '✅ 订阅添加成功！';
            let shouldAutoClose = false; // 订阅成功后也不自动关闭，让用户继续查看资源

            if (responseData && responseData.msg) {
                if (responseData.msg.includes('已存在')) {
                    successMessage = `ℹ️ ${responseData.msg}`;
                    shouldAutoClose = false; // 已存在时不自动关闭
                    showMessage(successMessage, 'info');
                } else {
                    successMessage = `✅ ${responseData.msg}`;
                    shouldAutoClose = false; // 成功时也不自动关闭
                    showMessage(successMessage, 'success');
                }
            } else {
                showMessage(successMessage, 'success');
            }

            // 不自动关闭弹窗，让用户手动关闭或继续查看资源
            if (shouldAutoClose) {
                setTimeout(() => {
                    const overlay = document.getElementById('media-details-modal');
                    if (overlay) {
                        overlay.remove();
                    }
                }, 3000);
            }

        } catch (error) {
            console.error('添加订阅失败:', error);

            // 恢复按钮状态
            if (subscribeBtn) {
                subscribeBtn.disabled = false;
                subscribeBtn.innerHTML = '❌ 订阅失败';
                subscribeBtn.style.backgroundColor = 'var(--color-danger-6, #f53f3f)';
                subscribeBtn.style.opacity = '1';

                // 3秒后恢复原始状态
                setTimeout(() => {
                    subscribeBtn.innerHTML = '➕ 添加订阅';
                    subscribeBtn.style.backgroundColor = 'var(--color-success-6, #00b42a)';
                }, 3000);
            }

            showMessage(`❌ ${error.message}`, 'error');
        }
    }

    // 显示消息提示
    function showMessage(message, type = 'info') {
        // 移除现有提示
        const existingToast = document.getElementById('api-interceptor-toast');
        if (existingToast) {
            existingToast.remove();
        }

        // 创建提示元素
        const toast = document.createElement('div');
        toast.id = 'api-interceptor-toast';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10001;
            padding: 12px 20px;
            border-radius: 6px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            animation: slideInRight 0.3s ease;
            max-width: 400px;
            word-wrap: break-word;
            background: ${type === 'success' ? 'var(--color-success-6, #00b42a)' :
                type === 'error' ? 'var(--color-danger-6, #f53f3f)' :
                    type === 'info' ? 'var(--color-warning-6, #ff7d00)' :
                        'var(--color-primary-6, #3370ff)'};
        `;

        toast.textContent = message;
        document.body.appendChild(toast);

        // 3秒后自动移除
        setTimeout(() => {
            if (toast.parentNode) {
                toast.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => {
                    if (toast.parentNode) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 3000);

        // 添加动画样式
        if (!document.getElementById('toast-animations')) {
            const style = document.createElement('style');
            style.id = 'toast-animations';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    // 创建加载HTML
    function createLoadingHTML(message) {
        return `
            <div style="text-align: center; padding: 20px; color: var(--color-text-3, #999);">
                <div style="
                    width: 20px;
                    height: 20px;
                    border: 2px solid var(--color-border-2, #e0e0e0);
                    border-left: 2px solid var(--color-primary-6, #3370ff);
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto 12px;
                "></div>
                <div style="font-size: 14px;">${message}</div>
                <div style="font-size: 12px; color: var(--color-text-4, #ccc); margin-top: 8px;">
                    如果长时间无响应，请刷新页面重试
                </div>
            </div>
        `;
    }

    // 创建空状态HTML
    function createEmptyHTML(message) {
        return `
            <div style="text-align: center; padding: 20px; color: var(--color-text-3, #999);">
                <div style="font-size: 48px; margin-bottom: 12px;">📭</div>
                <div style="font-size: 14px;">${message}</div>
            </div>
        `;
    }

    // 创建错误状态HTML
    function createErrorHTML(message) {
        return `
            <div style="text-align: center; padding: 20px; color: var(--color-danger-6, #f53f3f);">
                <div style="font-size: 48px; margin-bottom: 12px;">⚠️</div>
                <div style="font-size: 14px;">${message}</div>
            </div>
        `;
    }

    // 创建单个资源按钮HTML
    function createResourceButtonHTML(mediaData, resourceType) {
        const buttonText = {
            '115': '获取115网盘资源',
            'magnet': '获取磁力链接',
            'ed2k': '获取ed2k资源',
            'video': '获取在线视频'
        };

        const buttonColors = {
            '115': 'var(--color-primary-6, #3370ff)',
            'magnet': 'var(--color-success-6, #00b42a)',
            'ed2k': 'var(--color-warning-6, #ff7d00)',
            'video': 'var(--color-purple-6, #7c5eff)'
        };

        return `
            <div style="text-align: center; padding: 20px;">
                <button onclick="fetchSpecificResource('${mediaData.tmdb_id}', '${mediaData.type}', '${resourceType}', this)" style="
                    background: ${buttonColors[resourceType]};
                    color: white;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 6px;
                    font-size: 14px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                " onmouseover="this.style.opacity='0.8'"
                   onmouseout="this.style.opacity='1'">
                    ${buttonText[resourceType]}
                </button>
            </div>
        `;
    }

    // 创建电视剧磁力选择器HTML（magnet可以在season和episode level提供）
    function createTVMagnetSelectorHTML(mediaData, numberOfSeasons) {
        return `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 14px; color: var(--color-text-2, #666); margin-bottom: 16px;">
                    磁力资源可按季或单集获取，请选择获取方式：
                </div>
                
                <!-- 按季获取 -->
                <div style="margin-bottom: 20px; padding: 16px; background: var(--color-bg-1, white); border: 1px solid var(--color-border-2, #e5e6eb); border-radius: 6px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--color-text-1, #333); margin-bottom: 12px;">
                        📁 按季获取磁力资源
                    </div>
                    <div style="display: flex; flex-wrap: wrap; justify-content: center; gap: 6px;">
                        ${Array.from({ length: numberOfSeasons }, (_, i) =>
            `<button onclick="fetchTVSeasonMagnet('${mediaData.tmdb_id}', ${i + 1}, this)" style="
                                background: var(--color-success-6, #00b42a);
                                color: white;
                                border: none;
                                padding: 6px 12px;
                                border-radius: 4px;
                                font-size: 12px;
                                font-weight: 500;
                                cursor: pointer;
                                transition: all 0.2s;
                                margin: 2px;
                            " onmouseover="this.style.opacity='0.8'"
                               onmouseout="this.style.opacity='1'">
                                第${i + 1}季
                            </button>`
        ).join('')}
                    </div>
                </div>
                
                <!-- 按单集获取 -->
                <div style="padding: 16px; background: var(--color-bg-1, white); border: 1px solid var(--color-border-2, #e5e6eb); border-radius: 6px;">
                    <div style="font-size: 13px; font-weight: 600; color: var(--color-text-1, #333); margin-bottom: 12px;">
                        📄 按单集获取磁力资源
                    </div>
                    <div style="margin-bottom: 12px;">
                        <label style="font-size: 12px; color: var(--color-text-2, #666); margin-right: 8px;">选择季数:</label>
                        <select id="magnet-season-select" style="
                            padding: 6px 10px;
                            border: 1px solid var(--color-border-2, #e5e6eb);
                            border-radius: 4px;
                            font-size: 12px;
                            background: white;
                            margin-right: 8px;
                        " onchange="loadEpisodesForMagnet('${mediaData.tmdb_id}', this.value)">
                            <option value="">请选择季数</option>
                            ${Array.from({ length: numberOfSeasons }, (_, i) =>
            `<option value="${i + 1}">第${i + 1}季</option>`
        ).join('')}
                        </select>
                    </div>
                    <div id="magnet-episodes-container" style="display: none;">
                        <label style="font-size: 12px; color: var(--color-text-2, #666); margin-right: 8px;">选择集数:</label>
                        <select id="magnet-episode-select" style="
                            padding: 6px 10px;
                            border: 1px solid var(--color-border-2, #e5e6eb);
                            border-radius: 4px;
                            font-size: 12px;
                            background: white;
                            margin-right: 8px;
                        ">
                            <option value="">请选择集数</option>
                        </select>
                        <button onclick="fetchTVEpisodeMagnet('${mediaData.tmdb_id}', this)" style="
                            background: var(--color-success-6, #00b42a);
                            color: white;
                            border: none;
                            padding: 6px 12px;
                            border-radius: 4px;
                            font-size: 12px;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s;
                        " onmouseover="this.style.opacity='0.8'"
                           onmouseout="this.style.opacity='1'">
                            获取单集磁力
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    // 创建电视剧仅单集级别的选择器HTML（ed2k和video仅在episode level提供）
    function createTVEpisodeOnlySelectorHTML(mediaData, resourceType, numberOfSeasons) {
        const resourceName = resourceType === 'ed2k' ? 'ed2k资源' : '在线视频';
        const buttonColor = resourceType === 'ed2k' ? 'var(--color-warning-6, #ff7d00)' : 'var(--color-purple-6, #7c5eff)';

        return `
            <div style="text-align: center;">
                <div style="font-size: 14px; color: var(--color-text-2, #666); margin-bottom: 16px;">
                    ${resourceName}仅按单集提供，请选择季数和集数
                </div>
                <div style="margin-bottom: 16px;">
                    <label style="font-size: 13px; color: var(--color-text-2, #666); margin-right: 8px;">选择季数:</label>
                    <select id="season-select-${resourceType}" style="
                        padding: 8px 12px;
                        border: 1px solid var(--color-border-2, #e5e6eb);
                        border-radius: 4px;
                        font-size: 13px;
                        background: white;
                        margin-right: 12px;
                    " onchange="loadEpisodesForSeason('${mediaData.tmdb_id}', this.value, '${resourceType}')">
                        <option value="">请选择季数</option>
                        ${Array.from({ length: numberOfSeasons }, (_, i) =>
            `<option value="${i + 1}">第${i + 1}季</option>`
        ).join('')}
                    </select>
                </div>
                <div id="episodes-container-${resourceType}" style="display: none;">
                    <label style="font-size: 13px; color: var(--color-text-2, #666); margin-right: 8px;">选择集数:</label>
                    <select id="episode-select-${resourceType}" style="
                        padding: 8px 12px;
                        border: 1px solid var(--color-border-2, #e5e6eb);
                        border-radius: 4px;
                        font-size: 13px;
                        background: white;
                        margin-right: 12px;
                    ">
                        <option value="">请选择集数</option>
                    </select>
                    <button onclick="fetchTVEpisodeResource('${mediaData.tmdb_id}', '${resourceType}', this)" style="
                        background: ${buttonColor};
                        color: white;
                        border: none;
                        padding: 8px 16px;
                        border-radius: 4px;
                        font-size: 13px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.2s;
                    " onmouseover="this.style.opacity='0.8'"
                       onmouseout="this.style.opacity='1'">
                        获取${resourceName}
                    </button>
                </div>
            </div>
        `;
    }

    // 全局函数：显示资源选择器（返回按钮功能）
    window.showResourceSelector = function (resourceType) {
        const container = document.getElementById(`${resourceType === '115' ? 'pan115' : resourceType}-resources`);
        if (!container) {
            console.warn(`未找到资源容器: ${resourceType}`);
            return;
        }

        // 从container中获取存储的媒体信息
        const modal = container.closest('#media-details-modal');
        if (!modal) {
            console.warn('未找到弹窗容器');
            return;
        }

        // 从modal的dataset中获取媒体数据
        const mediaData = {
            tmdb_id: modal.dataset.tmdbId,
            type: modal.dataset.mediaType || 'movie',
            title: modal.dataset.mediaTitle || '未知标题'
        };

        if (!mediaData.tmdb_id) {
            container.innerHTML = createErrorHTML('无法获取媒体ID，请重新打开弹窗');
            return;
        }

        // 清除已加载标记，强制重新加载选择器
        if (modal._loadedResources) {
            modal._loadedResources.delete(resourceType);
        }

        // 显示加载状态
        container.innerHTML = createLoadingHTML('正在加载选择器...');

        // 延迟一点再重新加载，确保UI更新
        setTimeout(() => {
            // 重新加载选择器
            loadResourceByType(mediaData, resourceType, modal);
        }, 200);
    };

    // 全局函数：获取特定资源
    window.fetchSpecificResource = async function (tmdbId, mediaType, resourceType, buttonElement) {
        const originalText = buttonElement.textContent;
        buttonElement.disabled = true;
        buttonElement.textContent = '获取中...';
        buttonElement.style.opacity = '0.6';

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证token');
            }

            const endpoint = `${mediaType === 'tv' ? '/api/nullbr/tv' : '/api/nullbr/movie'}/${tmdbId}/${resourceType}`;

            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('获取资源失败');
            }

            const resourceData = await response.json();

            // 更新对应的资源容器
            const containerId = `${resourceType === '115' ? 'pan115' : resourceType}-resources`;
            const container = document.getElementById(containerId);

            if (container && resourceData.data && resourceData.data.resources) {
                container.innerHTML = createResourceListHTML(resourceData.data.resources, resourceType, false);
            } else {
                container.innerHTML = createEmptyHTML(`暂无${resourceType}资源`);
            }

        } catch (error) {
            console.error('获取资源失败:', error);
            showMessage(`❌ ${error.message}`, 'error');
        } finally {
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.opacity = '1';
        }
    };

    // 全局函数：获取电视剧季磁力资源
    window.fetchTVSeasonMagnet = async function (tmdbId, season, buttonElement) {
        const originalText = buttonElement.textContent;
        buttonElement.disabled = true;
        buttonElement.textContent = '获取中...';
        buttonElement.style.opacity = '0.6';

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证token');
            }

            const endpoint = `/api/nullbr/tv/${tmdbId}/season/${season}/magnet`;

            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('获取季磁力资源失败');
            }

            const resourceData = await response.json();

            // 更新磁力容器
            const container = document.getElementById('magnet-resources');

            if (container && resourceData.data && resourceData.data.resources) {
                container.innerHTML = createResourceListHTML(resourceData.data.resources, 'magnet', true);
            } else {
                container.innerHTML = createEmptyHTML(`暂无第${season}季磁力资源`);
            }

        } catch (error) {
            console.error('获取季磁力资源失败:', error);
            showMessage(`❌ ${error.message}`, 'error');
        } finally {
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.opacity = '1';
        }
    };

    // 全局函数：加载磁力资源的剧集信息
    window.loadEpisodesForMagnet = async function (tmdbId, season) {
        if (!season) {
            document.getElementById('magnet-episodes-container').style.display = 'none';
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证token');
            }

            const endpoint = `/api/nullbr/tv/${tmdbId}/season/${season}/episodes`;

            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('获取季信息失败');
            }

            const seasonData = await response.json();

            const episodeSelect = document.getElementById('magnet-episode-select');
            episodeSelect.innerHTML = '<option value="">请选择集数</option>';

            if (seasonData.data && seasonData.data.episode_count) {
                for (let ep = 1; ep <= seasonData.data.episode_count; ep++) {
                    episodeSelect.innerHTML += `<option value="${ep}">第${ep}集</option>`;
                }
            }

            document.getElementById('magnet-episodes-container').style.display = 'block';

        } catch (error) {
            console.error('加载剧集信息失败:', error);
            showMessage(`❌ ${error.message}`, 'error');
        }
    };

    // 全局函数：获取电视剧单集磁力资源
    window.fetchTVEpisodeMagnet = async function (tmdbId, buttonElement) {
        const season = document.getElementById('magnet-season-select').value;
        const episode = document.getElementById('magnet-episode-select').value;

        if (!season || !episode) {
            showMessage('请先选择季数和集数', 'error');
            return;
        }

        const originalText = buttonElement.textContent;
        buttonElement.disabled = true;
        buttonElement.textContent = '获取中...';
        buttonElement.style.opacity = '0.6';

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证token');
            }

            // 注意：这里需要根据实际API来调整，可能需要特殊的单集磁力接口
            // 目前使用season接口作为fallback
            const endpoint = `/api/nullbr/tv/${tmdbId}/season/${season}/magnet`;

            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`获取第${season}季第${episode}集磁力资源失败`);
            }

            const resourceData = await response.json();

            // 更新磁力容器
            const container = document.getElementById('magnet-resources');

            if (container && resourceData.data && resourceData.data.resources) {
                // 过滤出指定集数的资源（如果可能的话）
                const filteredResources = resourceData.data.resources.filter(item => {
                    return item.name && (
                        item.name.includes(`E${episode.padStart(2, '0')}`) ||
                        item.name.includes(`EP${episode.padStart(2, '0')}`) ||
                        item.name.includes(`第${episode}集`) ||
                        item.name.includes(`${episode.padStart(2, '0')}`)
                    );
                });

                if (filteredResources.length > 0) {
                    container.innerHTML = createResourceListHTML(filteredResources, 'magnet', true);
                } else {
                    container.innerHTML = createResourceListHTML(resourceData.data.resources, 'magnet', true);
                    showMessage(`显示第${season}季所有资源（未找到第${episode}集特定资源）`, 'info');
                }
            } else {
                container.innerHTML = createEmptyHTML(`暂无第${season}季第${episode}集磁力资源`);
            }

        } catch (error) {
            console.error('获取单集磁力资源失败:', error);
            showMessage(`❌ ${error.message}`, 'error');
        } finally {
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.opacity = '1';
        }
    };

    // 全局函数：加载季的剧集信息
    window.loadEpisodesForSeason = async function (tmdbId, season, resourceType) {
        if (!season) {
            document.getElementById(`episodes-container-${resourceType}`).style.display = 'none';
            return;
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证token');
            }

            const endpoint = `/api/nullbr/tv/${tmdbId}/season/${season}/episodes`;

            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error('获取季信息失败');
            }

            const seasonData = await response.json();

            const episodeSelect = document.getElementById(`episode-select-${resourceType}`);
            episodeSelect.innerHTML = '<option value="">请选择集数</option>';

            if (seasonData.data && seasonData.data.episode_count) {
                for (let ep = 1; ep <= seasonData.data.episode_count; ep++) {
                    episodeSelect.innerHTML += `<option value="${ep}">第${ep}集</option>`;
                }
            }

            document.getElementById(`episodes-container-${resourceType}`).style.display = 'block';

        } catch (error) {
            console.error('加载剧集信息失败:', error);
            showMessage(`❌ ${error.message}`, 'error');
        }
    };

    // 全局函数：获取电视剧剧集资源（ed2k或video）
    window.fetchTVEpisodeResource = async function (tmdbId, resourceType, buttonElement) {
        const season = document.getElementById(`season-select-${resourceType}`).value;
        const episode = document.getElementById(`episode-select-${resourceType}`).value;

        if (!season || !episode) {
            showMessage('请先选择季数和集数', 'error');
            return;
        }

        const originalText = buttonElement.textContent;
        buttonElement.disabled = true;
        buttonElement.textContent = '获取中...';
        buttonElement.style.opacity = '0.6';

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                throw new Error('未找到认证token');
            }

            const endpoint = `/api/nullbr/tv/${tmdbId}/episode/${season}/${episode}/${resourceType}`;

            const response = await fetch(endpoint, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`获取第${season}季第${episode}集${resourceType}资源失败`);
            }

            const resourceData = await response.json();

            // 更新对应的资源容器
            const container = document.getElementById(`${resourceType}-resources`);

            if (container && resourceData.data && resourceData.data.resources) {
                container.innerHTML = createResourceListHTML(resourceData.data.resources, resourceType, true);
            } else {
                container.innerHTML = createEmptyHTML(`暂无第${season}季第${episode}集${resourceType}资源`);
            }

        } catch (error) {
            console.error('获取剧集资源失败:', error);
            showMessage(`❌ ${error.message}`, 'error');
        } finally {
            buttonElement.disabled = false;
            buttonElement.textContent = originalText;
            buttonElement.style.opacity = '1';
        }
    };

    // 创建资源列表HTML
    function createResourceListHTML(resources, type, showBackButton = false) {
        let html = '';

        // 添加返回按钮
        if (showBackButton) {
            html += `
                <div style="
                    padding: 16px 0;
                    border-bottom: 2px solid var(--color-border-2, #e5e6eb);
                    margin-bottom: 16px;
                ">
                    <button onclick="showResourceSelector('${type}')" style="
                        background: var(--color-fill-2, #f2f3f5);
                        color: var(--color-text-1, #333);
                        border: 1px solid var(--color-border-2, #e5e6eb);
                        padding: 8px 16px;
                        border-radius: 6px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                        transition: all 0.2s;
                    " onmouseover="this.style.backgroundColor='var(--color-fill-3, #e5e6eb)'"
                       onmouseout="this.style.backgroundColor='var(--color-fill-2, #f2f3f5)'">
                        ← 返回选择
                    </button>
                </div>
            `;
        }

        if (!resources || resources.length === 0) {
            const typeNames = {
                '115': '115网盘',
                'magnet': '磁力链接',
                'ed2k': 'ed2k',
                'video': '在线视频'
            };
            return html + createEmptyHTML(`暂无${typeNames[type] || type}资源`);
        }

        return html + resources.map(item => {
            if (type === '115') {
                // 115网盘资源 - 添加新的标签
                const tags = [];
                if (item.resolution) tags.push(`<span style="background: var(--color-success-light-1, #e8f5e8); color: var(--color-success-6, #00b42a); padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.resolution}</span>`);
                if (item.quality) tags.push(`<span style="background: var(--color-warning-light-1, #fff7e6); color: var(--color-warning-6, #ff7d00); padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.quality}</span>`);
                if (item.season_list && item.season_list.length > 0) {
                    const seasonText = item.season_list.join(', ');
                    tags.push(`<span style="background: var(--color-purple-light-1, #f5f0ff); color: var(--color-purple-6, #7c5eff); padding: 2px 6px; border-radius: 3px; font-size: 10px;">季度: ${seasonText}</span>`);
                }

                return `
                    <div style="
                        padding: 16px 0;
                        border-bottom: 1px solid var(--color-border-3, #e5e6eb);
                    ">
                        <div class="resource-item" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            gap: 16px;
                        ">
                            <div style="flex: 1; min-width: 0;">
                                <div class="resource-title" style="
                                    font-size: 14px;
                                    font-weight: 600;
                                    color: var(--color-text-1, #333);
                                    margin-bottom: 8px;
                                    line-height: 1.4;
                                    word-break: break-word;
                                    overflow-wrap: break-word;
                                ">
                                    ${item.title || item.name || '未知资源'}
                                </div>
                                <div style="
                                    font-size: 12px;
                                    color: var(--color-text-3, #999);
                                    margin-bottom: 8px;
                                ">
                                    文件大小：${item.size || 'N/A'}
                                </div>
                                ${tags.length > 0 ? `<div style="display: flex; gap: 4px; flex-wrap: wrap;">${tags.join('')}</div>` : ''}
                            </div>
                            <div class="resource-buttons" style="
                                display: flex;
                                gap: 8px;
                                flex-shrink: 0;
                            ">
                                <button onclick="addToCloudDownload('${item.share_link.replace(/'/g, "\\'")}', '115网盘链接', this)" style="
                                    background: var(--color-primary-6, #3370ff);
                                    color: white;
                                    border: none;
                                    padding: 6px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    cursor: pointer;
                                    white-space: nowrap;
                                    min-width: 48px;
                                    transition: all 0.2s;
                                ">转存</button>
                                <button onclick="window.copyToClipboard('${item.share_link.replace(/'/g, "\\'")}');" style="
                                    background: transparent;
                                    color: var(--color-text-2, #666);
                                    border: 1px solid var(--color-border-2, #e5e6eb);
                                    padding: 6px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    cursor: pointer;
                                    white-space: nowrap;
                                ">复制链接</button>
                            </div>
                        </div>
                    </div>
                `;
            } else if (type === 'magnet') {
                // 磁力链接
                const tags = [];
                if (item.resolution) tags.push(`<span style="background: var(--color-success-light-1, #e8f5e8); color: var(--color-success-6, #00b42a); padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.resolution}</span>`);
                if (item.source) tags.push(`<span style="background: var(--color-primary-light-1, #e8f0ff); color: var(--color-primary-6, #3370ff); padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.source}</span>`);
                if (item.zh_sub) tags.push(`<span style="background: var(--color-warning-light-1, #fff7e6); color: var(--color-warning-6, #ff7d00); padding: 2px 6px; border-radius: 3px; font-size: 10px;">中文字幕</span>`);
                if (item.season) tags.push(`<span style="background: var(--color-purple-light-1, #f5f0ff); color: var(--color-purple-6, #7c5eff); padding: 2px 6px; border-radius: 3px; font-size: 10px;">第${item.season}季</span>`);

                return `
                    <div style="
                        padding: 16px 0;
                        border-bottom: 1px solid var(--color-border-3, #e5e6eb);
                    ">
                        <div class="resource-item" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            gap: 16px;
                        ">
                            <div style="flex: 1; min-width: 0;">
                                <div class="resource-title" style="
                                    font-size: 14px;
                                    font-weight: 600;
                                    color: var(--color-text-1, #333);
                                    margin-bottom: 8px;
                                    line-height: 1.4;
                                    word-break: break-word;
                                    overflow-wrap: break-word;
                                ">
                                    ${item.name || item.title || '未知资源'}
                                </div>
                                <div style="
                                    font-size: 12px;
                                    color: var(--color-text-3, #999);
                                    margin-bottom: 8px;
                                ">
                                    文件大小：${item.size || 'N/A'}
                                </div>
                                ${tags.length > 0 ? `<div style="display: flex; gap: 4px; flex-wrap: wrap;">${tags.join('')}</div>` : ''}
                            </div>
                            <div class="resource-buttons" style="
                                display: flex;
                                gap: 8px;
                                flex-shrink: 0;
                            ">
                                <button onclick="addToCloudDownload('${item.magnet.replace(/'/g, "\\'")}', '磁力链接', this)" style="
                                    background: var(--color-primary-6, #3370ff);
                                    color: white;
                                    border: none;
                                    padding: 6px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    cursor: pointer;
                                    white-space: nowrap;
                                    min-width: 48px;
                                    transition: all 0.2s;
                                ">转存</button>
                                <button onclick="window.copyToClipboard('${item.magnet.replace(/'/g, "\\'")}');" style="
                                    background: transparent;
                                    color: var(--color-text-2, #666);
                                    border: 1px solid var(--color-border-2, #e5e6eb);
                                    padding: 6px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    cursor: pointer;
                                    white-space: nowrap;
                                ">复制磁力</button>
                            </div>
                        </div>
                    </div>
                `;
            } else if (type === 'ed2k') {
                // ed2k资源
                const tags = [];
                if (item.resolution) tags.push(`<span style="background: var(--color-success-light-1, #e8f5e8); color: var(--color-success-6, #00b42a); padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.resolution}</span>`);
                if (item.source) tags.push(`<span style="background: var(--color-primary-light-1, #e8f0ff); color: var(--color-primary-6, #3370ff); padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.source}</span>`);
                if (item.zh_sub) tags.push(`<span style="background: var(--color-warning-light-1, #fff7e6); color: var(--color-warning-6, #ff7d00); padding: 2px 6px; border-radius: 3px; font-size: 10px;">中文字幕</span>`);

                return `
                    <div style="
                        padding: 16px 0;
                        border-bottom: 1px solid var(--color-border-3, #e5e6eb);
                    ">
                        <div class="resource-item" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            gap: 16px;
                        ">
                            <div style="flex: 1; min-width: 0;">
                                <div class="resource-title" style="
                                    font-size: 14px;
                                    font-weight: 600;
                                    color: var(--color-text-1, #333);
                                    margin-bottom: 8px;
                                    line-height: 1.4;
                                    word-break: break-word;
                                    overflow-wrap: break-word;
                                ">
                                    ${item.name || item.title || '未知资源'}
                                </div>
                                <div style="
                                    font-size: 12px;
                                    color: var(--color-text-3, #999);
                                    margin-bottom: 8px;
                                ">
                                    文件大小：${item.size || 'N/A'}
                                </div>
                                ${tags.length > 0 ? `<div style="display: flex; gap: 4px; flex-wrap: wrap;">${tags.join('')}</div>` : ''}
                            </div>
                            <div class="resource-buttons" style="
                                display: flex;
                                gap: 8px;
                                flex-shrink: 0;
                            ">
                                <button onclick="addToCloudDownload('${item.ed2k.replace(/'/g, "\\'")}', 'ed2k链接', this)" style="
                                    background: var(--color-primary-6, #3370ff);
                                    color: white;
                                    border: none;
                                    padding: 6px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    cursor: pointer;
                                    white-space: nowrap;
                                    min-width: 48px;
                                    transition: all 0.2s;
                                ">转存</button>
                                <button onclick="window.copyToClipboard('${item.ed2k.replace(/'/g, "\\'")}');" style="
                                    background: transparent;
                                    color: var(--color-text-2, #666);
                                    border: 1px solid var(--color-border-2, #e5e6eb);
                                    padding: 6px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    cursor: pointer;
                                    white-space: nowrap;
                                ">复制ed2k</button>
                            </div>
                        </div>
                    </div>
                `;
            } else if (type === 'video') {
                // 在线视频资源 - 添加source标签
                const tags = [];

                // 类型标签
                const typeTag = item.type === 'm3u8' ?
                    `<span style="background: var(--color-purple-light-1, #f5f0ff); color: var(--color-purple-6, #7c5eff); padding: 2px 6px; border-radius: 3px; font-size: 10px;">M3U8</span>` :
                    `<span style="background: var(--color-cyan-light-1, #e8fcfc); color: var(--color-cyan-6, #00bcd4); padding: 2px 6px; border-radius: 3px; font-size: 10px;">HTTP</span>`;
                tags.push(typeTag);

                // 来源标签
                if (item.source) {
                    tags.push(`<span style="background: var(--color-primary-light-1, #e8f0ff); color: var(--color-primary-6, #3370ff); padding: 2px 6px; border-radius: 3px; font-size: 10px;">${item.source}</span>`);
                }

                return `
                    <div style="
                        padding: 16px 0;
                        border-bottom: 1px solid var(--color-border-3, #e5e6eb);
                    ">
                        <div class="resource-item" style="
                            display: flex;
                            justify-content: space-between;
                            align-items: flex-start;
                            gap: 16px;
                        ">
                            <div style="flex: 1; min-width: 0;">
                                <div class="resource-title" style="
                                    font-size: 14px;
                                    font-weight: 600;
                                    color: var(--color-text-1, #333);
                                    margin-bottom: 8px;
                                    line-height: 1.4;
                                    word-break: break-word;
                                    overflow-wrap: break-word;
                                ">
                                    ${item.name || item.title || '未知资源'}
                                </div>
                                <div style="display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 8px;">
                                    ${tags.join('')}
                                </div>
                            </div>
                            <div class="resource-buttons" style="
                                display: flex;
                                gap: 8px;
                                flex-shrink: 0;
                            ">
                                <button onclick="playVideoWithVideoJS('${item.link.replace(/'/g, "\\'")}', '${(item.name || item.title || '未知资源').replace(/'/g, "\\'")}', this)" style="
                                    background: var(--color-purple-6, #7c5eff);
                                    color: white;
                                    border: none;
                                    padding: 6px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    cursor: pointer;
                                    white-space: nowrap;
                                    min-width: 48px;
                                    transition: all 0.2s;
                                ">在线播放</button>
                                <button onclick="window.copyToClipboard('${item.link.replace(/'/g, "\\'")}');" style="
                                    background: transparent;
                                    color: var(--color-text-2, #666);
                                    border: 1px solid var(--color-border-2, #e5e6eb);
                                    padding: 6px 12px;
                                    border-radius: 4px;
                                    font-size: 12px;
                                    cursor: pointer;
                                    white-space: nowrap;
                                ">复制链接</button>
                            </div>
                        </div>
                    </div>
                `;
            }
        }).join('');
    }

    // 全局函数：使用video.js播放在线视频
    window.playVideoWithVideoJS = function (videoUrl, videoTitle, buttonElement) {
        // 确保video.js已加载
        if (typeof videojs === 'undefined') {
            // 动态加载video.js
            loadVideoJS().then(() => {
                showVideoJSPlayer(videoUrl, videoTitle, buttonElement);
            }).catch(error => {
                console.error('加载video.js失败:', error);
                // 降级到直接打开链接
                window.open(videoUrl, '_blank');
            });
        } else {
            showVideoJSPlayer(videoUrl, videoTitle, buttonElement);
        }
    };

    // 动态加载video.js
    function loadVideoJS() {
        return new Promise((resolve, reject) => {
            // 检查是否已经有video.js的CSS
            if (!document.querySelector('link[href*="video-js.css"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = 'https://vjs.zencdn.net/8.6.1/video-js.css';
                document.head.appendChild(cssLink);
            }

            // 检查是否已经有video.js的脚本
            if (!document.querySelector('script[src*="video.min.js"]')) {
                const script = document.createElement('script');
                script.src = 'https://vjs.zencdn.net/8.6.1/video.min.js';
                script.onload = resolve;
                script.onerror = reject;
                document.head.appendChild(script);
            } else {
                resolve();
            }
        });
    }

    // 显示video.js播放器
    function showVideoJSPlayer(videoUrl, videoTitle, buttonElement) {
        // 创建播放器模态框
        const playerModal = document.createElement('div');
        playerModal.id = 'video-player-modal';
        playerModal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.9);
            z-index: 10001;
            display: flex;
            align-items: center;
            justify-content: center;
            animation: fadeIn 0.3s ease;
        `;

        playerModal.innerHTML = `
            <div style="
                width: 90vw;
                max-width: 1200px;
                background: black;
                border-radius: 8px;
                overflow: hidden;
                position: relative;
            ">
                <div style="
                    background: var(--color-bg-2, white);
                    padding: 12px 20px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    border-bottom: 1px solid var(--color-border-2, #e5e6eb);
                ">
                    <h3 style="margin: 0; color: var(--color-text-1, #333); font-size: 16px;">${videoTitle}</h3>
                    <button onclick="closeVideoPlayer()" style="
                        background: none;
                        border: none;
                        font-size: 20px;
                        cursor: pointer;
                        color: var(--color-text-3, #999);
                        padding: 4px;
                    ">×</button>
                </div>
                <video
                    id="video-player"
                    class="video-js vjs-default-skin"
                    controls
                    preload="auto"
                    width="100%"
                    height="500"
                    data-setup="{}">
                    <source src="${videoUrl}" type="application/x-mpegURL">
                    <source src="${videoUrl}" type="video/mp4">
                    <p class="vjs-no-js">
                        To view this video please enable JavaScript, and consider upgrading to a web browser that 
                        <a href="https://videojs.com/html5-video-support/" target="_blank">supports HTML5 video</a>.
                    </p>
                </video>
            </div>
        `;

        document.body.appendChild(playerModal);

        // 初始化video.js播放器
        const player = videojs('video-player', {
            fluid: true,
            responsive: true,
            playbackRates: [0.5, 1, 1.25, 1.5, 2],
            plugins: {
                // 可以添加插件配置
            }
        });

        // 关闭播放器函数
        window.closeVideoPlayer = function () {
            if (player) {
                player.dispose();
            }
            if (playerModal.parentNode) {
                playerModal.parentNode.removeChild(playerModal);
            }
            delete window.closeVideoPlayer;
        };

        // ESC键关闭
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                window.closeVideoPlayer();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);

        // 点击模态框背景关闭
        playerModal.addEventListener('click', (e) => {
            if (e.target === playerModal) {
                window.closeVideoPlayer();
            }
        });
    }

    // 复制到剪贴板 - 设为全局函数
    window.copyToClipboard = function (text) {
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                showMessage('✅ 已复制到剪贴板', 'success');
            }).catch(() => {
                fallbackCopy(text);
            });
        } else {
            fallbackCopy(text);
        }
    };

    // 添加到云下载 - 设为全局函数
    window.addToCloudDownload = async function (url, type = '磁力链接', buttonElement = null) {
        // 如果传入了按钮元素，设置loading状态
        let originalText = '';
        if (buttonElement) {
            originalText = buttonElement.textContent;
            buttonElement.disabled = true;
            buttonElement.style.opacity = '0.6';
            buttonElement.textContent = '转存中...';
        }

        try {
            const token = localStorage.getItem('token');
            if (!token) {
                showMessage('❌ 未找到认证token，请先登录', 'error');
                return;
            }

            const response = await fetch('/api/cloud/add_share_down', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    url: url
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: 请求失败`);
            }

            const responseData = await response.json();

            if (responseData.code === 200) {
                showMessage(`✅ ${type}转存下载任务添加成功`, 'success');
                // 成功时短暂显示成功状态
                if (buttonElement) {
                    buttonElement.textContent = '✅ 已转存';
                    buttonElement.style.backgroundColor = 'var(--color-success-6, #00b42a)';
                    setTimeout(() => {
                        buttonElement.textContent = originalText;
                        buttonElement.disabled = false;
                        buttonElement.style.opacity = '1';
                        buttonElement.style.backgroundColor = '';
                    }, 2000);
                }
            } else {
                throw new Error(responseData.msg || '添加转存任务失败');
            }
        } catch (error) {
            console.error('添加转存任务失败:', error);
            showMessage(`❌ ${error.message}`, 'error');

            // 错误时恢复按钮状态
            if (buttonElement) {
                buttonElement.textContent = '❌ 转存失败';
                buttonElement.style.backgroundColor = 'var(--color-danger-6, #f53f3f)';
                setTimeout(() => {
                    buttonElement.textContent = originalText;
                    buttonElement.disabled = false;
                    buttonElement.style.opacity = '1';
                    buttonElement.style.backgroundColor = '';
                }, 2000);
            }
        }
    };

    // 兜底复制方法
    function fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        showMessage('✅ 已复制到剪贴板', 'success');
    }

    // 获取资源详情（替换原来的fetchTMDBDetails函数）
    async function fetchResourceDetails(tmdbId, type, modalElement) {
        // 这个函数可以用来获取更多的媒体详情信息，比如演员、导演等
        // 目前先保持空实现，因为主要功能已经在searchResources中实现
        console.log('获取资源详情:', tmdbId, type);
    }
    function check_update() {
        try {
            fetch("/api/base/latest_version", {
                method: "GET",
                mode: "no-cors",
                cache: "no-cache"
            })
            .then(response => {
                if (response.ok) {
                    return response.text();
                }
                throw new Error('Network response was not ok');
            })
            .then(latest_version => {
                // 检查格式是否符合预期,trim后是纯数字
                const trimmed = latest_version.trim();
                if (/^\d+$/.test(trimmed)) {
                    const currentVersion = version || '20250820';
                    //转为数字进行比较
                    if (parseInt(currentVersion, 10) < parseInt(trimmed, 10)) {
                        // 显示新版本信息
                        showMessage(`发现新版本：${trimmed}，当前版本：${currentVersion}`, 'info');
                    } else {
                        console.log('当前版本已是最新:', currentVersion);
                    }
                } else {
                    console.log('版本格式不正确:', trimmed);
                }
            })
            .catch(error => {
                console.error('检查更新失败:', error);
                // 静默失败，不显示错误信息给用户
            });
        } catch (error) {
            console.error('检查更新失败:', error);
        }
    }

    console.log('✅ API拦截器已安装，将拦截并阻止 api/submedia/add 请求，在弹窗中手动订阅');
    check_update();

})();
