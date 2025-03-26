from dataclasses import dataclass
from typing import List
from .base import MediaItem

@dataclass
class Movie115Item:
    title: str
    size: str
    share_link: str

@dataclass
class MovieResponse:
    id: int
    poster: str
    title: str
    overview: str
    vote: float
    release_date: str
    has_115: bool
    has_magnet: bool
    has_ed2k: bool
    has_video: bool

@dataclass
class Movie115Response:
    id: int
    media_type: str
    page: int
    total_page: int
    items: List[Movie115Item]

@dataclass
class MovieMagnetItem:
    name: str
    size: str
    magnet: str
    resolution: str
    source: str
    quality: str | List[str]
    zh_sub: int

@dataclass
class MovieMagnetResponse:
    id: int
    media_type: str
    magnet: List[MovieMagnetItem]

@dataclass
class MovieEd2kItem:
    name: str
    size: str
    ed2k: str
    resolution: str
    source: str | None
    quality: str | List[str]
    zh_sub: int

@dataclass
class MovieEd2kResponse:
    id: int
    media_type: str
    ed2k: List[MovieEd2kItem]