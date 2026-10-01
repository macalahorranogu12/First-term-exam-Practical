from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr

# --- Schemas de Comentario ---
class CommentBase(BaseModel):
    content: str

class CommentCreate(CommentBase):
    user_id: int

class CommentResponse(CommentBase):
    id: int
    user_id: int
    user_name: Optional[str] = None
    video_id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- Schemas de Video ---
class VideoBase(BaseModel):
    title: str
    description: Optional[str] = ""

class VideoCreate(VideoBase):
    video_url: str
    thumbnail_url: str
    user_id: int

class VideoUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None

class VideoResponse(VideoBase):
    id: int
    video_url: str
    thumbnail_url: str
    views: int
    user_id: int
    user_name: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class VideoDetailResponse(VideoResponse):
    comments: List[CommentResponse] = []
    recommended_videos: List[VideoResponse] = []

# --- Schemas de Usuario ---
class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    name: str
    email: str

    class Config:
        from_attributes = True

class UserProfileResponse(UserResponse):
    video_count: int = 0
    videos: List[VideoResponse] = []
