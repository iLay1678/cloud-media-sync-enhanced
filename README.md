[![Build and Push Docker Image](https://github.com/iLay1678/nullbr_cms_bot/actions/workflows/docker-build.yml/badge.svg)](https://github.com/iLay1678/nullbr_cms_bot/actions/workflows/docker-build.yml)
# nullbr资源搜索机器人

## 简介

nullbr资源搜索机器人是一个基于Telegram的机器人，用于搜索nullbr资源。

## 功能

- 搜索nullbr资源
- 通过CMS转存资源(只有配置了CMS相关环境变量和指定TG用户才显示转存按钮)
## 使用 Docker Compose

1. 单独部署：

```yaml
services:
  nullbr_cms_bot:
    image: ghcr.io/ilay1678/nullbr_cms_bot:latest
    container_name: nullbr_cms_bot
    restart: always
    environment:
      # Nullbr配置
      NULLBR_APP_ID: your_app_id_here
      NULLBR_API_KEY: your_api_key_here
      NULLBR_BASE_URL: https://api.nullbr.online
      # Telegram配置
      TG_BOT_TOKEN: 1608962238:5o45983
      TG_CHAT_ID: "123456789"
      # CMS配置
      CMS_BASE_URL: https://localhost
      CMS_USERNAME: your_username_here
      CMS_PASSWORD: your_password_here
```

2. 使用cms集成镜像：
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
      # nullbr机器人配置
      - TG_BOT_TOKEN: 1608962238:5o45983
      - TG_CHAT_ID: "123456789"
```