
# CloudMediaSynC 增强版

在CloudMediaSynC基础上增强了tg机器人的一些功能，并增加了一些开放接口，便于其他程序调用

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
      - NULLBR_APP_ID: your_app_id_here
      - NULLBR_API_KEY: your_api_key_here
      - NULLBR_BASE_URL: https://api.nullbr.online
```

## Telegram 机器人增强功能

### 功能概述

为 `CloudMediaSynC`的Telegram 机器人提供了增强功能，集成了 Nullbr API 实现智能媒体搜索和转存。

### 主要功能

#### 1. 智能媒体搜索
- **触发方式**: 以 `?` 或 `？` 开头发送消息
- **示例**: `? 三体`、`？ 复仇者联盟`
- **功能**: 自动搜索电影、电视剧等媒体资源
- **返回**: 搜索结果列表，支持查看详情

#### 2. 命令扩展
- `/id` - 获取当前用户的 Telegram ID

#### 3. 资源获取功能
通过内联按钮支持多种资源获取方式：

##### 3.1 115网盘资源
- 获取 115 网盘分享链接
- 显示资源标题、大小等详细信息
- 支持一键转存功能（需权限）

##### 3.2 磁力链接资源
- 获取高质量磁力链接
- 显示分辨率、来源、质量等信息
- 支持中字筛选
- 电视剧支持按季度获取

##### 3.3 自动转存
- 支持 115 分享链接自动转存
- 支持阿里云盘分享链接
- 支持磁力链接和 ed2k 链接
- 白名单用户权限控制

#### 4. 用户权限管理
- 基于白名单的用户访问控制
- 支持配置允许转存操作的用户ID
- 自动读取配置文件中的授权用户列表


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
