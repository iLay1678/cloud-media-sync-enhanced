import os
import httpx
import logging
import time
from typing import Optional
class CMSClient:
    def __init__(self, base_url: str = None):
        """
        初始化CMS客户端
        
        Args:
            base_url: CMS API的基础URL，如果未提供则从环境变量CMS_BASE_URL读取
        """
        self.base_url = base_url or os.getenv('CMS_BASE_URL')
        if not self.base_url:
            raise ValueError('CMS_BASE_URL must be provided either through constructor or environment variable')
        
        self.username = os.getenv('CMS_USERNAME')
        self.password = os.getenv('CMS_PASSWORD')
        if not self.username or not self.password:
            raise ValueError('CMS_USERNAME and CMS_PASSWORD must be provided through environment variables')
        
        self.token = None
        self.token_expiry = 0
        self.session = httpx.Client()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
        
        # 初始化时获取token
        self._ensure_valid_token()
    
    def _login(self) -> dict:
        """
        登录CMS系统获取token
        
        Returns:
            dict: 包含token的登录响应数据
            
        Raises:
            httpx.HTTPError: 当HTTP请求失败时
            ValueError: 当登录失败时
        """
        try:
            response = self.session.post(
                f'{self.base_url}/api/auth/login',
                json={
                    'username': self.username,
                    'password': self.password
                }
            )
            response.raise_for_status()
            data = response.json()
            
            if data.get('code') != 200 or 'data' not in data:
                raise ValueError(f'Login failed: {data}')
                
            return data['data']
            
        except httpx.HTTPError as e:
            logging.error(f'Failed to login: {str(e)}')
            raise
    
    def _ensure_valid_token(self):
        """
        确保有效的token，如果token过期或不存在则重新获取
        """
        current_time = time.time()
        
        # 如果token不存在或距离过期时间不到24小时，重新获取token
        if not self.token or current_time >= (self.token_expiry - 60*60*24):
            login_data = self._login()
            self.token = login_data['token']
            
            # 从token中提取过期时间，如果无法提取则设置为24小时后
            try:
                import jwt
                token_data = jwt.decode(self.token, options={"verify_signature": False})
                self.token_expiry = token_data['exp']
            except Exception as e:
                logging.warning(f'Failed to decode token expiry: {str(e)}')
                self.token_expiry = current_time + 86400  # 24小时后过期
            
            # 更新session的Authorization header
            self.session.headers.update({
                'Authorization': f'Bearer {self.token}'
            })
    
    def _handle_request(self, request_func, *args, **kwargs):
        """
        处理API请求，自动处理token过期情况
        
        Args:
            request_func: 请求函数
            *args, **kwargs: 传递给请求函数的参数
            
        Returns:
            响应数据
            
        Raises:
            httpx.HTTPError: 当HTTP请求失败时
        """
        try:
            self._ensure_valid_token()
            response = request_func(*args, **kwargs)
            response.raise_for_status()
            return response.json()
            
        except httpx.HTTPStatusError as e:
            if e.response.status_code == 401:
                # token可能过期，强制重新获取
                self.token = None
                self._ensure_valid_token()
                
                # 重试请求
                response = request_func(*args, **kwargs)
                response.raise_for_status()
                return response.json()
            raise
    
    def add_share_down(self, url: str) -> dict:
        """
        添加115分享链接到CMS系统进行转存
        
        Args:
            url: 115分享链接
            
        Returns:
            dict: API响应数据
            
        Raises:
            httpx.HTTPError: 当HTTP请求失败时
            ValueError: 当参数无效时
        """
        if not url:
            raise ValueError('url must not be empty')
            
        return self._handle_request(
            self.session.post,
            f'{self.base_url}/api/cloud/add_share_down',
            json={'url': url}
        )