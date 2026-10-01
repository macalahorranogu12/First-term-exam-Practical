from contextlib import asynccontextmanager
from typing import List, Optional
import os

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import desc

from database import engine, Base, get_db
import models
import schemas
from auth_utils import hash_password, verify_password
from s3_utils import (
    upload_file_to_s3,
    delete_file_from_s3,
    S3_BUCKET_VIDEOS,
    S3_BUCKET_THUMBNAILS
)

# Inicializar tablas en base de datos al arrancar
@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield

app = FastAPI(
    title="Video Platform API",
    description="API REST para plataforma de videos con FastAPI, PostgreSQL/MySQL (RDS) y Amazon S3",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Habilitar CORS para permitir peticiones desde la SPA alojada en S3 o localhost
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ==========================================
# ENDPOINT DE SALUD / ROOT
# ==========================================
@app.get("/", tags=["Health"])
def health_check():
    return {
        "status": "online",
        "message": "API de plataforma de videos funcionando correctamente",
        "docs": "/docs"
    }

# ==========================================
# GESTIÓN DE USUARIOS
# ==========================================
@app.post("/users", response_model=schemas.UserResponse, status_code=status.HTTP_201_CREATED, tags=["Usuarios"])
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario en la plataforma.
    """
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="El correo electrónico ya está registrado."
        )

    hashed_pw = hash_password(user.password)
    db_user = models.User(
        name=user.name,
        email=user.email,
        password_hash=hashed_pw
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user

@app.post("/login", tags=["Usuarios"])
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    """
    Inicia sesión validando correo y contraseña.
    """
    user = db.query(models.User).filter(models.User.email == credentials.email).first()
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos."
        )

    return {
        "message": "Inicio de sesión exitoso",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }

@app.get("/users/{id}", response_model=schemas.UserProfileResponse, tags=["Usuarios"])
def get_user_profile(id: int, db: Session = Depends(get_db)):
    """
    Obtiene la información básica del usuario, conteo de videos y lista de videos publicados.
    """
    user = db.query(models.User).filter(models.User.id == id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    videos = db.query(models.Video).filter(models.Video.user_id == id).order_by(desc(models.Video.created_at)).all()
    video_responses = []
    for v in videos:
        video_responses.append(schemas.VideoResponse(
            id=v.id,
            title=v.title,
            description=v.description or "",
            video_url=v.video_url,
            thumbnail_url=v.thumbnail_url,
            views=v.views,
            user_id=v.user_id,
            user_name=user.name,
            created_at=v.created_at
        ))

    return schemas.UserProfileResponse(
        id=user.id,
        name=user.name,
        email=user.email,
        video_count=len(videos),
        videos=video_responses
    )

# ==========================================
# GESTIÓN DE VIDEOS
# ==========================================
@app.post("/videos", response_model=schemas.VideoResponse, status_code=status.HTTP_201_CREATED, tags=["Videos"])
async def create_video(
    title: str = Form(...),
    description: Optional[str] = Form(""),
    user_id: int = Form(...),
    video_file: Optional[UploadFile] = File(None),
    thumbnail_file: Optional[UploadFile] = File(None),
    video_url: Optional[str] = Form(None),
    thumbnail_url: Optional[str] = Form(None),
    db: Session = Depends(get_db)
):
    """
    Publica un video. Permite subir archivos directamente a S3 (video MP4 y miniatura JPG/PNG)
    o enviar URLs directas si ya están almacenadas.
    """
    # Validar que el usuario exista
    user = db.query(models.User).filter(models.User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {user_id} no encontrado."
        )

    final_video_url = video_url
    final_thumbnail_url = thumbnail_url

    # Subida de archivo de video a S3
    if video_file:
        filename = video_file.filename or "video.mp4"
        ext = filename.split(".")[-1].lower()
        if ext != "mp4":
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de video no permitido. Solo se acepta MP4."
            )
        try:
            final_video_url = upload_file_to_s3(
                file_obj=video_file.file,
                original_filename=filename,
                bucket_name=S3_BUCKET_VIDEOS,
                content_type="video/mp4"
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al subir el video a S3: {str(e)}"
            )

    # Subida de archivo de miniatura a S3
    if thumbnail_file:
        filename = thumbnail_file.filename or "thumbnail.jpg"
        ext = filename.split(".")[-1].lower()
        if ext not in ["jpg", "jpeg", "png"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Formato de miniatura no permitido. Solo se permiten JPG, JPEG o PNG."
            )
        content_type = "image/png" if ext == "png" else "image/jpeg"
        try:
            final_thumbnail_url = upload_file_to_s3(
                file_obj=thumbnail_file.file,
                original_filename=filename,
                bucket_name=S3_BUCKET_THUMBNAILS,
                content_type=content_type
            )
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Error al subir la miniatura a S3: {str(e)}"
            )

    if not final_video_url or not final_thumbnail_url:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Debe proporcionar el archivo de video y miniatura, o sus respectivas URLs."
        )

    db_video = models.Video(
        title=title,
        description=description or "",
        video_url=final_video_url,
        thumbnail_url=final_thumbnail_url,
        views=0,
        user_id=user_id
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    return schemas.VideoResponse(
        id=db_video.id,
        title=db_video.title,
        description=db_video.description or "",
        video_url=db_video.video_url,
        thumbnail_url=db_video.thumbnail_url,
        views=db_video.views,
        user_id=db_video.user_id,
        user_name=user.name,
        created_at=db_video.created_at
    )

@app.post("/videos/json", response_model=schemas.VideoResponse, status_code=status.HTTP_201_CREATED, tags=["Videos"])
def create_video_json(video_in: schemas.VideoCreate, db: Session = Depends(get_db)):
    """
    Endpoint alternativo para crear un video directamente con JSON pasando URLs ya existentes.
    """
    user = db.query(models.User).filter(models.User.id == video_in.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Usuario con id {video_in.user_id} no encontrado."
        )

    db_video = models.Video(
        title=video_in.title,
        description=video_in.description or "",
        video_url=video_in.video_url,
        thumbnail_url=video_in.thumbnail_url,
        views=0,
        user_id=video_in.user_id
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)

    return schemas.VideoResponse(
        id=db_video.id,
        title=db_video.title,
        description=db_video.description or "",
        video_url=db_video.video_url,
        thumbnail_url=db_video.thumbnail_url,
        views=db_video.views,
        user_id=db_video.user_id,
        user_name=user.name,
        created_at=db_video.created_at
    )

@app.get("/videos", response_model=List[schemas.VideoResponse], tags=["Videos"])
def list_videos(user_id: Optional[int] = Query(None, description="Filtrar videos por ID de usuario"), db: Session = Depends(get_db)):
    """
    Obtiene la lista de videos (Página Principal o catálogo filtrado por usuario).
    """
    query = db.query(models.Video)
    if user_id is not None:
        query = query.filter(models.Video.user_id == user_id)

    videos = query.order_by(desc(models.Video.created_at)).all()
    results = []
    for v in videos:
        user_name = v.user.name if v.user else "Desconocido"
        results.append(schemas.VideoResponse(
            id=v.id,
            title=v.title,
            description=v.description or "",
            video_url=v.video_url,
            thumbnail_url=v.thumbnail_url,
            views=v.views,
            user_id=v.user_id,
            user_name=user_name,
            created_at=v.created_at
        ))
    return results

@app.get("/videos/{id}", response_model=schemas.VideoDetailResponse, tags=["Videos"])
def get_video_detail(id: int, db: Session = Depends(get_db)):
    """
    Obtiene el detalle de un video para el reproductor:
    - Incrementa el contador de vistas.
    - Carga comentarios asociados.
    - Carga videos recomendados dinámicamente desde la BD.
    """
    video = db.query(models.Video).filter(models.Video.id == id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado."
        )

    # Incrementar vistas
    video.views += 1
    db.commit()
    db.refresh(video)

    # Cargar comentarios
    comments_list = []
    for c in video.comments:
        author_name = c.user.name if c.user else "Anónimo"
        comments_list.append(schemas.CommentResponse(
            id=c.id,
            content=c.content,
            user_id=c.user_id,
            user_name=author_name,
            video_id=c.video_id,
            created_at=c.created_at
        ))

    # Cargar videos recomendados (otros videos excluyendo el actual)
    rec_videos = db.query(models.Video).filter(models.Video.id != id).order_by(desc(models.Video.views)).limit(6).all()
    recommended_list = []
    for r in rec_videos:
        recommended_list.append(schemas.VideoResponse(
            id=r.id,
            title=r.title,
            description=r.description or "",
            video_url=r.video_url,
            thumbnail_url=r.thumbnail_url,
            views=r.views,
            user_id=r.user_id,
            user_name=r.user.name if r.user else "Desconocido",
            created_at=r.created_at
        ))

    return schemas.VideoDetailResponse(
        id=video.id,
        title=video.title,
        description=video.description or "",
        video_url=video.video_url,
        thumbnail_url=video.thumbnail_url,
        views=video.views,
        user_id=video.user_id,
        user_name=video.user.name if video.user else "Desconocido",
        created_at=video.created_at,
        comments=comments_list,
        recommended_videos=recommended_list
    )

@app.get("/videos/{id}/recommended", response_model=List[schemas.VideoResponse], tags=["Videos"])
def get_recommended_videos(id: int, db: Session = Depends(get_db)):
    """
    Endpoint dedicado para obtener la lista de videos recomendados para un video específico.
    """
    rec_videos = db.query(models.Video).filter(models.Video.id != id).order_by(desc(models.Video.views)).limit(6).all()
    results = []
    for r in rec_videos:
        results.append(schemas.VideoResponse(
            id=r.id,
            title=r.title,
            description=r.description or "",
            video_url=r.video_url,
            thumbnail_url=r.thumbnail_url,
            views=r.views,
            user_id=r.user_id,
            user_name=r.user.name if r.user else "Desconocido",
            created_at=r.created_at
        ))
    return results

@app.put("/videos/{id}", response_model=schemas.VideoResponse, tags=["Videos"])
def update_video(id: int, video_in: schemas.VideoUpdate, db: Session = Depends(get_db)):
    """
    Actualiza el título o descripción de un video.
    """
    video = db.query(models.Video).filter(models.Video.id == id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado."
        )

    if video_in.title is not None:
        video.title = video_in.title
    if video_in.description is not None:
        video.description = video_in.description

    db.commit()
    db.refresh(video)

    return schemas.VideoResponse(
        id=video.id,
        title=video.title,
        description=video.description or "",
        video_url=video.video_url,
        thumbnail_url=video.thumbnail_url,
        views=video.views,
        user_id=video.user_id,
        user_name=video.user.name if video.user else "Desconocido",
        created_at=video.created_at
    )

@app.delete("/videos/{id}", tags=["Videos"])
def delete_video(id: int, db: Session = Depends(get_db)):
    """
    Elimina un video de la base de datos y sus archivos asociados en S3.
    """
    video = db.query(models.Video).filter(models.Video.id == id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado."
        )

    # Intento de borrado en S3 (no bloquea si ya no existe)
    if S3_BUCKET_VIDEOS and video.video_url:
        delete_file_from_s3(video.video_url, S3_BUCKET_VIDEOS)
    if S3_BUCKET_THUMBNAILS and video.thumbnail_url:
        delete_file_from_s3(video.thumbnail_url, S3_BUCKET_THUMBNAILS)

    db.delete(video)
    db.commit()
    return {"message": "Video eliminado exitosamente", "id": id}

# ==========================================
# GESTIÓN DE COMENTARIOS
# ==========================================
@app.post("/videos/{id}/comments", response_model=schemas.CommentResponse, status_code=status.HTTP_201_CREATED, tags=["Comentarios"])
def add_comment(id: int, comment_in: schemas.CommentCreate, db: Session = Depends(get_db)):
    """
    Publica un nuevo comentario en un video.
    """
    video = db.query(models.Video).filter(models.Video.id == id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado."
        )

    user = db.query(models.User).filter(models.User.id == comment_in.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado."
        )

    new_comment = models.Comment(
        content=comment_in.content,
        user_id=comment_in.user_id,
        video_id=id
    )
    db.add(new_comment)
    db.commit()
    db.refresh(new_comment)

    return schemas.CommentResponse(
        id=new_comment.id,
        content=new_comment.content,
        user_id=new_comment.user_id,
        user_name=user.name,
        video_id=new_comment.video_id,
        created_at=new_comment.created_at
    )

@app.get("/videos/{id}/comments", response_model=List[schemas.CommentResponse], tags=["Comentarios"])
def list_comments(id: int, db: Session = Depends(get_db)):
    """
    Lista todos los comentarios de un video.
    """
    video = db.query(models.Video).filter(models.Video.id == id).first()
    if not video:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Video no encontrado."
        )

    comments = db.query(models.Comment).filter(models.Comment.video_id == id).order_by(desc(models.Comment.created_at)).all()
    results = []
    for c in comments:
        user_name = c.user.name if c.user else "Anónimo"
        results.append(schemas.CommentResponse(
            id=c.id,
            content=c.content,
            user_id=c.user_id,
            user_name=user_name,
            video_id=c.video_id,
            created_at=c.created_at
        ))
    return results
