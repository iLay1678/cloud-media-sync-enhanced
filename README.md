
# CloudMediaSync 增强版
![PyPI - Version](https://img.shields.io/pypi/v/cms_enhance)
![PyPI - Downloads](https://img.shields.io/pypi/dm/cms_enhance)
![PyPI - Wheel](https://img.shields.io/pypi/wheel/cms_enhance)

在CloudMediaSync基础上增强了页面和消息渠道的一些功能，并增加了一些开放接口，便于其他程序调用

## 部署

### 基于原版安装教程


#### 1. 下载增强文件

进入CloudMediaSync部署目录，全选复制以下命令并执行，自动识别系统架构并下载对应文件（macOS 的 arm64 将自动映射为 aarch64）：

```bash
arch=$(uname -m)
case "$arch" in
  x86_64|amd64)
    pkg_arch="x86_64"
    ;;
  arm64|aarch64)
    pkg_arch="aarch64"
    ;;
  *)
    echo "不支持的架构: $arch" >&2
    exit 1
    ;;
esac

URL="https://cnb.cool/ilay1678/cloud-media-sync-enhanced/-/git/raw/master/dist/usercustomize.cpython-312-${pkg_arch}-linux-gnu.so"
echo "Downloading $URL ..."
if command -v wget >/dev/null 2>&1; then
  wget -O usercustomize.so "$URL"
else
  curl -L "$URL" -o usercustomize.so
fi
echo "Saved to ./usercustomize.so"
```

#### 2. 修改docker-compose.yaml文件

挂载增强文件并增加环境变量：

```yaml
services:
  cloud-media-sync:
    privileged: true
    container_name: cloud-media-sync
    image: imaliang/cloud-media-sync:latest  # 使用原版镜像
    restart: always
    network_mode: bridge
    volumes:
      - "./config:/config"
      - "./logs:/logs"
      - "./cache:/var/cache/nginx/emby"
      - "/data/media:/media"
      # 挂载增强文件
      - "./usercustomize.so:/cms/cms-api/usercustomize.so"
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
      # Nullbr配置（增强功能所需）
      - NULLBR_APP_ID=your_app_id_here
      - NULLBR_API_KEY=your_api_key_here
      - NULLBR_BASE_URL=https://api.nullbr.online
      # Panso配置（可选的额外搜索源）
      - PANSO_URL=http://your_panso_server_url  # 不配置则不启用Panso
      - PANSO_USERNAME=your_username  # 可选，不配置表示无需认证
      - PANSO_PASSWORD=your_password  # 可选，不配置表示无需认证
```

#### 3. 启动服务

```bash
docker-compose up -d
```

#### 注意事项

- 增强功能需要配置Nullbr相关环境变量才能正常工作
- Panso是可选的额外搜索源，如果不配置PANSO_URL则不会启用
- 如果Panso服务不需要认证，可以不配置PANSO_USERNAME和PANSO_PASSWORD
## 页面增强
### 热门推荐的订阅按钮增加nullbr资源弹窗
![](https://github.com/iLay1678/cloud-media-sync-enhanced/raw/master/img/nullbr.png)
## 消息渠道增强

### 功能概述

为 `CloudMediaSynC`的Telegram 机器人和企业微信渠道提供了增强功能，集成了 Nullbr 和 Panso API 实现智能媒体搜索和转存。

### 主要功能

#### 智能媒体搜索
- **触发方式**: 以 `?` 或 `？` 开头发送消息
- **示例**: `? 三体`、`？ 复仇者联盟`
- **功能**: 自动搜索电影、电视剧等媒体资源
- **搜索源**: 
  - 优先使用 Nullbr 搜索（如果已配置）
  - 如果 Nullbr 不可用，自动使用 Panso 搜索（如果已配置）
- **返回**: 搜索结果列表，支持查看详情

#### Panso 搜索源
Panso 作为额外的搜索源，提供网盘链接聚合服务：
- **搜索结果格式**: 按网盘类型分组（百度网盘、阿里云盘、夸克网盘等）
- **支持操作**: 
  - 显示各类型网盘的资源链接
  - 回复 p1、p2、p3... 查看详细链接并自动转存
  - 直接复制链接手动转存



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

---

### Panso 搜索接口

Panso 作为额外的搜索源，本系统提供了代理接口访问远程Panso服务。

#### 工作原理

- 当配置了 `PANSO_URL` 后，系统会自动连接到远程Panso服务
- 如果配置了 `PANSO_USERNAME` 和 `PANSO_PASSWORD`，系统会自动向远程Panso服务认证
- 用户无需手动登录，系统内部自动处理认证和token管理

#### 本地代理接口 - POST /api/panso/search

通过本地API代理访问远程Panso服务的搜索功能。

**请求参数：**

| 参数名 | 类型 | 必填 | 描述 |
|--------|------|------|------|
| kw | string | 是 | 搜索关键词 |
| channels | string[] | 否 | 搜索的频道列表，不提供则使用默认配置 |
| conc | number | 否 | 并发搜索数量，不提供则自动设置 |
| refresh | boolean | 否 | 强制刷新，不使用缓存 |
| res | string | 否 | 结果类型：all/results/merge，默认merge |
| src | string | 否 | 数据来源：all/tg/plugin，默认all |
| plugins | string[] | 否 | 指定搜索的插件列表 |
| cloud_types | string[] | 否 | 指定返回的网盘类型列表 |
| ext | object | 否 | 扩展参数，传递给插件的自定义参数 |

**请求示例：**
```json
{
  "kw": "三体",
  "res": "merge",
  "cloud_types": ["baidu", "aliyun", "quark"]
}
```

**响应字段：**

| 字段名 | 类型 | 描述 |
|--------|------|------|
| total | number | 搜索结果总数 |
| results | object[] | 搜索结果数组，包含详细信息 |
| merged_by_type | object | 按网盘类型分组的链接 |

**响应示例：**
```json
{
  "total": 10,
  "merged_by_type": {
    "baidu": [
      {
        "url": "https://pan.baidu.com/s/xxxxx",
        "password": "1234",
        "note": "三体全集 4K",
        "datetime": "2024-01-01T00:00:00Z",
        "source": "tg:某频道",
        "images": ["https://example.com/image.jpg"]
      }
    ],
    "aliyun": [
      {
        "url": "https://www.aliyundrive.com/s/xxxxx",
        "password": "",
        "note": "三体 蓝光原盘",
        "datetime": "2024-01-02T00:00:00Z",
        "source": "plugin:某插件"
      }
    ]
  }
}
```

#### GET方式搜索 - GET /api/panso/search

也支持GET方式搜索，参数通过query string传递：

```
GET /api/panso/search?kw=三体&res=merge&cloud_types=baidu,aliyun
```

#### 注意事项

- 系统会自动处理与远程Panso服务的认证，无需手动登录
- 如果环境变量配置了PANSO_USERNAME和PANSO_PASSWORD，系统会自动认证
- 如果未配置认证信息，系统将尝试无认证访问远程Panso服务
- Token管理完全自动化，包括过期重新获取
- 建议使用POST方式传递复杂参数
