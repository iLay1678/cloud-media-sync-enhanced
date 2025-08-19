
# CloudMediaSynC 增强版

在CloudMediaSynC基础上增强了页面和消息渠道的一些功能，并增加了一些开放接口，便于其他程序调用

## 部署

 创建`docker-compose.yaml`文件：

```yaml
services:
  cloud-media-sync:
    privileged: true
    container_name: cloud-media-sync
    image: ghcr.io/ilay1678/cloud-media-sync:latest
    restart: always
    network_mode: bridge
    volumes:
      - "./config:/config"
      - "./logs:/logs"
      - "./cache:/var/cache/nginx/emby"
      - "/data/media:/media"
    ports:
      - "9527:9527"
      - "9096:9096"
    environment:
      - PUID=0
      - PGID=0
      - UMASK=022
      - TZ=Asia/Shanghai
      - RUN_ENV=online
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=admin
      - CMS_API_TOKEN=cloud_media_sync
      - EMBY_HOST_PORT=http://172.17.0.1:8096
      - EMBY_API_KEY=xxx
      - DONATE_CODE=CMS_XXX_XXX
      # Nullbr配置
      - NULLBR_APP_ID=your_app_id_here
      - NULLBR_API_KEY=your_api_key_here
      - NULLBR_BASE_URL=https://api.nullbr.online
```

## 基于原版镜像部署

如果你想使用原版的 `imaliang/cloud-media-sync:latest` 镜像，并通过挂载增强功能文件的方式来获得本项目的增强功能，可以按照以下步骤操作：

### 1. 下载增强功能文件

根据你的系统架构下载对应的文件：

**对于 x86_64 架构系统：**
```bash
# 下载 SO 文件
wget https://github.com/iLay1678/cloud-media-sync-enhanced/raw/master/dist/usercustomize.cpython-312-x86_64-linux-gnu.so

# 下载 JS 文件
wget https://github.com/iLay1678/cloud-media-sync-enhanced/raw/master/dist/api-interceptor.js
```

**对于 ARM64/aarch64 架构系统：**
```bash
# 下载 SO 文件
wget https://github.com/iLay1678/cloud-media-sync-enhanced/raw/master/dist/usercustomize.cpython-312-aarch64-linux-gnu.so

# 下载 JS 文件
wget https://github.com/iLay1678/cloud-media-sync-enhanced/raw/master/dist/api-interceptor.js
```

### 2. 创建目录结构

```bash
mkdir -p ./cms-api
mkdir -p ./cms-web
```

### 3. 移动文件到对应目录

**对于 x86_64 架构：**
```bash
mv usercustomize.cpython-312-x86_64-linux-gnu.so ./cms-api/
mv api-interceptor.js ./cms-web/
```

**对于 ARM64/aarch64 架构：**
```bash
mv usercustomize.cpython-312-aarch64-linux-gnu.so ./cms-api/
mv api-interceptor.js ./cms-web/
```

### 4. 创建 docker-compose.yaml 文件

```yaml
services:
  cloud-media-sync:
    privileged: true
    container_name: cloud-media-sync
    image: imaliang/cloud-media-sync:latest
    restart: always
    network_mode: bridge
    volumes:
      - "./config:/config"
      - "./logs:/logs"
      - "./cache:/var/cache/nginx/emby"
      - "/data/media:/media"
      # 挂载增强功能文件
      - "./cms-api:/cms/cms-api"
      - "./cms-web:/cms/web"
    ports:
      - "9527:9527"
      - "9096:9096"
    environment:
      - PUID=0
      - PGID=0
      - UMASK=022
      - TZ=Asia/Shanghai
      - RUN_ENV=online
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=admin
      - CMS_API_TOKEN=cloud_media_sync
      - EMBY_HOST_PORT=http://172.17.0.1:8096
      - EMBY_API_KEY=xxx
      - DONATE_CODE=CMS_XXX_XXX
      # Nullbr配置（用于增强功能）
      - NULLBR_APP_ID=your_app_id_here
      - NULLBR_API_KEY=your_api_key_here
      - NULLBR_BASE_URL=https://api.nullbr.online
```

### 5. 启动服务

```bash
docker-compose up -d
```

### 注意事项

- 请确保下载的 SO 文件与你的系统架构匹配
- 增强功能需要配置 Nullbr 相关环境变量才能正常使用
- 如果不需要 Nullbr 功能，可以移除相关环境变量配置
- 建议定期更新增强功能文件以获得最新特性

## 页面增强
### 订阅功能增加从nullbr获取资源
![](https://github.com/iLay1678/cloud-media-sync-enhanced/raw/master/img/nullbr.png)
## 消息渠道增强

### 功能概述

为 `CloudMediaSynC`的Telegram 机器人和企业微信渠道提供了增强功能，集成了 Nullbr API 实现智能媒体搜索和转存。

### 主要功能

#### 智能媒体搜索
- **触发方式**: 以 `?` 或 `？` 开头发送消息
- **示例**: `? 三体`、`？ 复仇者联盟`
- **功能**: 自动搜索电影、电视剧等媒体资源
- **返回**: 搜索结果列表，支持查看详情



## 开放接口

### 添加分享下载任务

**接口地址：** `POST /api/open/add_share_down?token=cloud_media_sync`

**功能描述：** 添加一个分享下载任务到系统中

#### 请求参数

| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| url | string | 是 | 分享链接URL |

#### 请求示例

```json
{
    "url": "https://example.com/share/123456"
}
```

#### 响应格式

**成功响应：**
```json
{
    "code": 200,
    "msg": "操作成功"
}
```

**失败响应：**
```json
{
    "code": 400,
    "msg": "参数错误"
}
```

或

```json
{
    "code": 500,
    "msg": "具体错误信息"
}
```

#### 响应状态码说明

| 状态码 | 说明 |
|--------|------|
| 200 | 操作成功 |
| 400 | 参数错误（缺少url参数） |
| 500 | 服务器内部错误 |

#### 注意事项

- 成功添加分享下载任务后，系统会自动触发整理任务（5秒后执行）
- URL参数不能为空
- 请确保提供的分享链接有效
