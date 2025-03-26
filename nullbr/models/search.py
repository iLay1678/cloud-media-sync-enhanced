from dataclasses import dataclass
from typing import List
from .base import MediaItem

@dataclass
class SearchResponse:
    page: int
    total_pages: int
    total_results: int
    items: List[MediaItem]

@dataclass
class ListResponse:
    id: int
    name: str
    description: str
    updated_dt: str
    page: int
    total_page: int
    items: List[MediaItem]