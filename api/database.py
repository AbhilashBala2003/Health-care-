import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from dotenv import load_dotenv

load_dotenv()

# Vercel Postgres usually provides POSTGRES_URL or DATABASE_URL
DATABASE_URL = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

if DATABASE_URL:
    # SQLAlchemy requires postgresql:// instead of postgres://
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
    
    # Connect to PostgreSQL
    # For serverless environments like Vercel, we don't want pool_pre_ping to keep connections open indefinitely
    # but it helps in resolving dropped connections.
    engine = create_engine(DATABASE_URL, pool_pre_ping=True)
else:
    # Fallback to local SQLite database
    SQLALCHEMY_DATABASE_URL = "sqlite:///./sql_app.db"
    # connect_args={"check_same_thread": False} is required only for SQLite
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
