from dataclasses import dataclass
from typing import List
from .base import MediaItem
from .movie import Movie115Item

@dataclass
class CollectionResponse:
    id: int
    poster: str
    title: str
    overview: str
    vote: str
    release_date: str
    has_115: bool
    items: List[MediaItem]

@dataclass
class Collection115Response:
    id: int
    media_type: str
    page: int
    total_page: int
    items: List[Movie115Item]