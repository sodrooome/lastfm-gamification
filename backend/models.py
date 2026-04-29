from pydantic import BaseModel
from typing import List


class UserProfile(BaseModel):
    username: str
    total_scrobbles: int
    top_artists: str
    achievements: List[str]
    level: int