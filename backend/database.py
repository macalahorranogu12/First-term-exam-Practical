import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Si se usa RDS PostgreSQL: postgresql://usuario:password@endpoint-rds:5432/nombre_db
# Si se usa RDS MySQL: mysql+pymysql://usuario:password@endpoint-rds:3306/nombre_db
# Si no está definida, usa SQLite local por defecto
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./videos_platform.db")

# Ajuste necesario si el scheme es postgres:// (usado por algunos proveedores) en vez de postgresql://
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=True
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
