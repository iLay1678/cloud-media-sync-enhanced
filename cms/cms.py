import os
import httpx
import logging
from typing import Optional

class CMSClient:
    def __init__(self, base_url: str = None, token: str = None):
        """
        初始化CMS客户端
        
        Args:
            base_url: CMS API的基础URL，如果未提供则从环境变量CMS_BASE_URL读取
            token: 认证token，如果未提供则从环境变量CMS_TOKEN读取
        """
        self.base_url = base_url or os.getenv('CMS_BASE_URL')
        if not self.base_url:
            raise ValueError('CMS_BASE_URL must be provided either through constructor or environment variable')
        
        self.token = token or os.getenv('CMS_TOKEN')
        if not self.token:
            raise ValueError('CMS_TOKEN must be provided either through constructor or environment variable')
        
        self.session = httpx.Client()
        self.session.headers.update({
            'Authorization': f'Bearer {self.token}',
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        })
    
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
            
        try:
            response = self.session.post(
                f'{self.base_url}/api/cloud/add_share_down',
                json={'url': url}
            )
            response.raise_for_status()
            return response.json()
            
        except httpx.HTTPError as e:
            logging.error(f'Failed to add share download: {str(e)}')
            raise