from dataclasses import dataclass
from typing import Optional

@dataclass
class MediaItem :
    media_type: str
    tmdbid: int
    poster: str
    title: str
    overview: str
    vote_average: Optional[float] = None
    release_date: Optional[str] = None
    rank: Optional[int] = None