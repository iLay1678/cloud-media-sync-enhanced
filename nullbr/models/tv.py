from dataclasses import dataclass
from typing import List
from .base import MediaItem
from .movie import Movie115Item, MovieMagnetItem

@dataclass
class TVResponse:
    id: int
    poster: str
    title: str
    overview: str
    vote: float
    release_date: str
    number_of_seasons: int
    has_115: bool
    has_magnet: bool
    has_ed2k: bool
    has_video: bool

@dataclass
class TV115Response:
    id: int
    media_type: str
    page: int
    total_page: int
    items: List[Movie115Item]

@dataclass
class TVSeasonResponse:
    tv_show_id: int
    season_number: int
    name: str
    overview: str
    air_date: str
    poseter: str
    episode_count: int
    vote_average: float
    has_magnet: bool

@dataclass
class TVSeasonMagnetResponse:
    id: int
    season_number: int
    media_type: str
    magnet: List[MovieMagnetItem]