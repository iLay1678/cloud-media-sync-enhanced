from fastapi import FastAPI, Request, Form
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse
from uvicorn.config import LOG_LEVELS
from nullbr import NullbrSDK
import os
from dotenv import load_dotenv
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.sessions import SessionMiddleware
import os
import secrets
import uvicorn
import logging
from logging.handlers import TimedRotatingFileHandler
import os

# 配置日志系统
log_dir = os.path.join(os.path.dirname(__file__), 'logs/')
os.makedirs(log_dir, exist_ok=True)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logger = logging.getLogger()
logger.setLevel(LOG_LEVEL)

# 创建按日期分割的文件处理器
# 文件日志处理器
file_handler = TimedRotatingFileHandler(
    filename=os.path.join(log_dir, 'app.log'),
    when='midnight',
    backupCount=7,
    encoding='utf-8'
)
file_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

# 终端日志处理器
console_handler = logging.StreamHandler()
console_handler.setFormatter(logging.Formatter('%(asctime)s - %(levelname)s - %(message)s'))

# 添加处理器
if not logger.handlers:
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)


# 加载环境变量
load_dotenv()

# 认证配置
AUTH_USERNAME = os.getenv("AUTH_USERNAME")
AUTH_PASSWORD = os.getenv("AUTH_PASSWORD")
SECRET_KEY = os.getenv("SECRET_KEY", secrets.token_urlsafe(32))
app = FastAPI()

@app.exception_handler(404)
async def not_found_exception_handler(request: Request, exc: Exception):
    return RedirectResponse(url='/')

# 挂载静态文件目录
app.mount("/static", StaticFiles(directory="static"), name="static")

# 认证中间件
class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        # 不需要认证的路径
        if request.url.path == "/login" or request.url.path.startswith("/static"):
            return await call_next(request)
        
        # 检查session中是否有登录状态
        if not request.session.get("authenticated"):
            return RedirectResponse(url="/login")
            
        return await call_next(request)

app.add_middleware(AuthMiddleware)
# 添加session中间件
app.add_middleware(SessionMiddleware, secret_key=SECRET_KEY)
# 设置模板目录
templates = Jinja2Templates(directory="templates")

@app.get("/login")
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", {"request": request})

@app.post("/login")
async def login(request: Request, username: str = Form(...), password: str = Form(...)):
    if username == AUTH_USERNAME and password == AUTH_PASSWORD:
        request.session["authenticated"] = True
        return RedirectResponse(url="/", status_code=303)
    return templates.TemplateResponse(
        "login.html",
        {"request": request, "error": "用户名或密码错误"}
    )

@app.get("/logout")
async def logout(request: Request):
    request.session.clear()
    return RedirectResponse(url="/login")

# 初始化SDK
sdk = NullbrSDK(
    app_id=os.getenv("NULLBR_APP_ID"),
    api_key=os.getenv("NULLBR_API_KEY"),
    base_url=os.getenv("NULLBR_BASE_URL")
)

@app.get("/")
async def home(request: Request):
    # 获取热门影视列表
    try:
        popular_list = sdk.get_list(2142753)
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "media_list": popular_list.items}
        )
    except Exception as e:
        return templates.TemplateResponse(
            "index.html",
            {"request": request, "media_list": [], "error": str(e)}
        )

@app.get("/search")
async def search(request: Request, query: str = "", page: int = 1):
    try:
        search_results = sdk.search(query, page) if query else None
        return templates.TemplateResponse(
            "search.html",
            {
                "request": request,
                "query": query,
                "results": search_results,
                "current_page": page
            }
        )
    except Exception as e:
        return templates.TemplateResponse(
            "search.html",
            {
                "request": request,
                "query": query,
                "error": str(e)
            }
        )

@app.get("/movie/{tmdbid}")
async def movie_detail(request: Request, tmdbid: int):
    try:
        movie = sdk.get_movie(tmdbid)
        return templates.TemplateResponse(
            "movie.html",
            {"request": request, "movie": movie}
        )
    except Exception as e:
        return templates.TemplateResponse(
            "movie.html",
            {"request": request, "error": str(e)}
        )

@app.get("/tv/{tmdbid}")
async def tv_detail(request: Request, tmdbid: int):
    try:
        tv = sdk.get_tv(tmdbid)
        return templates.TemplateResponse(
            "tv.html",
            {"request": request, "tv": tv}
        )
    except Exception as e:
        return templates.TemplateResponse(
            "tv.html",
            {"request": request, "error": str(e)}
        )
        
if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", 8000)),
        log_config=None,
        log_level=logging.getLevelName(logger.getEffectiveLevel()).lower()
    )