import os
import logging
from typing import List
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import Application, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes
from nullbr import NullbrSDK
from telegram.helpers import escape_markdown
import json


# 配置日志
from logging.handlers import TimedRotatingFileHandler
import os
from dotenv import load_dotenv
load_dotenv()
# 确保logs目录存在
log_dir = 'logs'
if not os.path.exists(log_dir):
    os.makedirs(log_dir)

# 配置日志处理器
log_file = os.path.join(log_dir, 'app.log')
file_handler = TimedRotatingFileHandler(
    log_file,
    when='midnight',
    interval=1,
    backupCount=30,
    encoding='utf-8'
)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

# 配置终端输出处理器
stream_handler = logging.StreamHandler()
stream_handler.setFormatter(logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s'))

# 配置日志
logger = logging.getLogger()
logger.setLevel(logging.INFO)
logger.addHandler(file_handler)
logger.addHandler(stream_handler)

# 设置httpx日志级别为WARN
logging.getLogger('httpx').setLevel(logging.WARNING)

# 获取环境变量
TG_BOT_TOKEN = os.getenv('TG_BOT_TOKEN')
NULLBR_APP_ID = os.getenv('NULLBR_APP_ID')
NULLBR_API_KEY = os.getenv('NULLBR_API_KEY')
NULLBR_BASE_URL = os.getenv('NULLBR_BASE_URL')
ALLOWED_USER_IDS = [int(id.strip()) for id in os.getenv('TG_CHAT_ID', '').split(',') if id.strip()]
CMS_BASE_URL = os.getenv('CMS_BASE_URL')

# 初始化CMS客户端
from cms import CMSClient
cms_client = CMSClient(base_url=CMS_BASE_URL) if CMS_BASE_URL else None

# 初始化NullbrSDK
nullbr_client = NullbrSDK(app_id=NULLBR_APP_ID, api_key=NULLBR_API_KEY, base_url=NULLBR_BASE_URL)

def is_user_allowed(user_id: int) -> bool:
    """检查用户是否有权限使用机器人"""
    return user_id in ALLOWED_USER_IDS

async def get_user_id(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """处理/id命令，返回用户的Telegram ID"""
    user_id = update.effective_user.id
    await update.message.reply_markdown_v2(f'您的Telegram ID是：`{user_id}`')

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """处理/start命令"""    
    await update.message.reply_markdown_v2(
        '欢迎使用媒体搜索机器人！\n'
        '直接发送要搜索的电影/电视剧名称即可。'
    )

async def search(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """处理搜索请求"""
    
    # 发送加载消息
    loading_message = await update.message.reply_markdown_v2(escape_markdown('🔍 正在搜索，请稍候...',version=2))
    
    query = update.message.text
    try:
        # 搜索媒体
        search_result = nullbr_client.search(query)
        
        # 删除加载消息
        await loading_message.delete()
        
        if not search_result.items:
            await update.message.reply_markdown_v2('未找到相关结果。')
            return
        
        # 构建结果列表和按钮
        message = "🔍 找到以下结果：\n\n"
        keyboard = []
        
        for idx, item in enumerate(search_result.items[:10], 1):
            message += f"{idx}. {item.title} ({item.release_date[:4] if item.release_date else '未知年份'})\n"
            keyboard.append([InlineKeyboardButton(
                f"查看详情 #{idx}",
                callback_data=f"detail_{item.media_type}_{item.tmdbid}"
            )])
        
        # 添加翻页按钮（示例）
        if search_result.total_pages > 1:
            keyboard.append([
                InlineKeyboardButton("◀️ 上一页", callback_data="page_prev"),
                InlineKeyboardButton("下一页 ▶️", callback_data="page_next")
            ])
        
        # 发送整合后的列表消息
        message = escape_markdown(message,version=2)
        await update.message.reply_markdown_v2(
            message,
            reply_markup=InlineKeyboardMarkup(keyboard)
        )
            
    except Exception as e:
        logging.error(f"Search error: {str(e)}")
        await update.message.reply_markdown_v2('搜索过程中发生错误，请稍后重试。')

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """处理按钮回调"""
    query = update.callback_query
    await query.answer()
    
    try:
        # 解析回调数据
        parts = query.data.split('_')
        if parts[0] == 'detail':
            media_type = parts[1]
            tmdbid = int(parts[2])
            
            # 发送加载消息
            loading_message = await context.bot.send_message(
                chat_id=update.effective_chat.id,
                text='⏳ 正在获取详情信息...'
            )
            
            # 获取媒体详情
            if media_type == 'movie':
                media = nullbr_client.get_movie(tmdbid)
            elif media_type == 'collection':
                media = nullbr_client.get_collection(tmdbid)
            else:
                media = nullbr_client.get_tv(tmdbid)
            
            # 构建详情消息
            message = (
                f"🎬 *{escape_markdown(media.title,version=2)}*\n\n"
                f"⭐️ 评分：{escape_markdown(str(media.vote) or '暂无',version=2)}\n"
                f"📅 发布日期：{escape_markdown(media.release_date or '未知',version=2)}\n\n"
                f"📝 简介：{escape_markdown(media.overview or '暂无',version=2)}"
            )
            
            # 构建资源按钮
            keyboard = []
            if media.has_115:
                keyboard.append([InlineKeyboardButton(
                    "🔍 获取115资源",
                    callback_data=f"115_{media_type}_{tmdbid}"
                )])
            if media.has_magnet:
                keyboard.append([InlineKeyboardButton(
                    "🧲 获取磁力链接",
                    callback_data=f"magnet_{media_type}_{tmdbid}"
                )])
            # 发送详情
            await loading_message.delete()
            await context.bot.send_photo(
                chat_id=update.effective_chat.id,
                photo=media.poster,
                caption=message,
                parse_mode='MarkdownV2',
                reply_markup=InlineKeyboardMarkup(keyboard)
            )
            return
            
        # 原有处理逻辑
        resource_type, media_type, tmdbid = parts
        tmdbid = int(tmdbid)
        
        # 发送加载消息
        loading_message = await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text='⏳ 正在获取资源信息，请稍候...'
        )
        keyboard = []
        if resource_type == '115':
            if media_type == 'movie':
                resources = nullbr_client.get_movie_115(tmdbid)
            else:  # tv
                resources = nullbr_client.get_tv_115(tmdbid)
                
            if not resources or not resources.items:
                await loading_message.edit_text('未找到可用的115资源。')
                return
                
            # 格式化115资源信息
            message = "🔍 115资源链接：\n\n"
            for i, item in enumerate(resources.items):
                message += escape_markdown(f"📁 #{i+1} {item.title}\n", version=2)
                message += f"💾 大小：{escape_markdown(item.size, version=2)}\n"
                message += f"🔗 链接：`{escape_markdown(item.share_link, version=2)}`\n\n"
                if cms_client and is_user_allowed(update.effective_user.id):
                    keyboard.append([InlineKeyboardButton(
                        f"📥 转存 #{i+1}",
                        callback_data=f"cms_{item.share_link}"
                    )])
        
        elif resource_type == 'magnet':
            if media_type == 'movie':
                resources = nullbr_client.get_movie_magnet(tmdbid)
                
                if not resources or not resources.magnet:
                    await loading_message.edit_text('未找到可用的磁力链接。')
                    return
                    
                # 格式化磁力链接信息
                message = "🧲 磁力链接：\n\n"
                for i, item in enumerate(resources.magnet):
                    message += escape_markdown(f"📁 #{i+1} {item.name}\n", version=2)
                    message += f"💾 大小：{escape_markdown(item.size, version=2)}\n"
                    message += f"🎬 分辨率：{escape_markdown(item.resolution or '未知', version=2)}\n"
                    message += f"📺 来源：{escape_markdown(item.source or '未知', version=2)}\n"
                    message += f"⚡️ 质量：{escape_markdown(str(item.quality) or '未知', version=2)}\n"
                    message += f"🈶 中字：{'是' if item.zh_sub else '否'}\n"
                    message += f"🔗 链接：`{escape_markdown(item.magnet, version=2)}`\n\n"
                    if cms_client and is_user_allowed(update.effective_user.id):
                        keyboard.append([InlineKeyboardButton(
                            f"📥 转存 #{i+1}",
                            callback_data=f"cms_{item.magnet}"
                        )])
            else:  # tv
                # 对于剧集，需要选择季度
                tv = nullbr_client.get_tv(tmdbid)
                if not tv:
                    await loading_message.edit_text('获取剧集信息失败。')
                    return
                    
                message = "请选择要获取的季度：\n\n"
                keyboard = []
                for season in range(1, tv.number_of_seasons + 1):
                    keyboard.append([InlineKeyboardButton(
                        f"第 {season} 季",
                        callback_data=f"season_{tmdbid}_{season}"
                    )])
                await loading_message.edit_text(
                    text=message,
                    reply_markup=InlineKeyboardMarkup(keyboard)
                )
                return
        # 发送资源信息
        if len(message) > 4096:
            # 如果消息太长，分段发送
            for i in range(0, len(message), 4096):
                if i == 0:
                    await loading_message.edit_text(text=message[i:i+4096],reply_markup=InlineKeyboardMarkup(keyboard),parse_mode='MarkdownV2')
                else:
                    await context.bot.send_message(
                        chat_id=update.effective_chat.id,
                        text=message[i:i+4096],
                        parse_mode='MarkdownV2',
                        reply_markup=InlineKeyboardMarkup(keyboard)
                    )
        else:
            await loading_message.edit_text(text=message,reply_markup=InlineKeyboardMarkup(keyboard),parse_mode='MarkdownV2')
            
    except Exception as e:
        logging.error(f"Button callback error: {str(e)}")
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text='获取资源信息时发生错误，请稍后重试。'
        )
        raise e

async def season_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """处理季度选择回调"""
    query = update.callback_query
    await query.answer()
    
    
    try:
        # 解析回调数据
        _, tmdbid, season = query.data.split('_')
        tmdbid = int(tmdbid)
        season = int(season)
        
        # 发送加载消息
        loading_message = await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text='⏳ 正在获取资源信息，请稍候...'
        )
        
        # 获取指定季度的磁力链接
        resources = nullbr_client.get_tv_season_magnet(tmdbid, season)
        
        if not resources or not resources.magnet:
            await loading_message.edit_text('未找到可用的磁力链接。')
            return
        
        # 格式化磁力链接信息
        message = f"🧲 第 {season} 季磁力链接：\n\n"
        keyboard = []
        for i, item in enumerate(resources.magnet):
            message += escape_markdown(f"📁 #{i+1} {item.name}\n", version=2)
            message += f"💾 大小：{escape_markdown(item.size, version=2)}\n"
            message += f"🎬 分辨率：{escape_markdown(item.resolution or '未知', version=2)}\n"
            message += f"📺 来源：{escape_markdown(item.source or '未知', version=2)}\n"
            message += f"⚡️ 质量：{escape_markdown(item.quality or '未知', version=2)}\n"
            message += f"🈶 中字：{'是' if item.zh_sub else '否'}\n"  # 布尔值不需要转义
            message += f"🔗 链接：`{escape_markdown(item.magnet, version=2)}`\n\n"
            if cms_client and is_user_allowed(update.effective_user.id):
                keyboard.append([InlineKeyboardButton(
                    f"📥 转存 #{i+1}",
                    callback_data=f"cms_{item.magnet}"
                )])
        # 发送资源信息
        if len(message) > 4096:
            # 如果消息太长，分段发送
            for i in range(0, len(message), 4096):
                if i == 0:
                    await loading_message.edit_text(text=message[i:i+4096],reply_markup=InlineKeyboardMarkup(keyboard),parse_mode='MarkdownV2',)
                else:
                    await context.bot.send_message(
                        chat_id=update.effective_chat.id,
                        text=message[i:i+4096],
                        reply_markup=InlineKeyboardMarkup(keyboard),
                        parse_mode='MarkdownV2',
                    )
        else:
            await loading_message.edit_text(text=message,reply_markup=InlineKeyboardMarkup(keyboard),parse_mode='MarkdownV2')
            
    except Exception as e:
        logging.error(f"Season callback error: {str(e)}")
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text='获取资源信息时发生错误，请稍后重试。'
        )

def main() -> None:
    """启动机器人"""
    # 创建应用
    application = Application.builder().token(TG_BOT_TOKEN).build()
    
    # 添加处理器
    application.add_handler(CommandHandler("start", start))
    application.add_handler(CommandHandler("id", get_user_id))
    application.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, search))
    application.add_handler(CallbackQueryHandler(season_callback, pattern=r'^season_'))
    application.add_handler(CallbackQueryHandler(cms_callback, pattern=r'^cms_'))
    application.add_handler(CallbackQueryHandler(button_callback))
    
    # 启动机器人
    application.run_polling()

async def cms_callback(update: Update, context: ContextTypes.DEFAULT_TYPE) -> None:
    """处理CMS转存回调"""
    query = update.callback_query
    await query.answer()
    
    
    try:
        # 解析回调数据获取分享链接
        share_link = query.data[4:]
        
        # 发送加载消息
        loading_message = await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text='⏳ 正在转存资源，请稍候...'
        )
        
        # 调用CMS转存API
        result = cms_client.add_share_down(share_link)
        
        # 更新消息
        if result.get('code') == 200:
            await loading_message.edit_text(f'✅ {result.get("msg", "转存成功！")}')
        else:
            await loading_message.edit_text(f'❌ 转存失败：{result.get("msg", "未知错误")}')
            
    except Exception as e:
        logging.error(f"CMS callback error: {str(e)}")
        await context.bot.send_message(
            chat_id=update.effective_chat.id,
            text='转存资源时发生错误，请稍后重试。'
        )

if __name__ == '__main__':
    main()