# core/config.py

import os
from dotenv import load_dotenv

# .env 파일에서 환경변수를 로드합니다.
load_dotenv()

# 데이터베이스 설정
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")
DB_USER = os.getenv("DB_USER")
DB_PASSWORD = os.getenv("DB_PASSWORD")
DB_NAME = os.getenv("DB_NAME")

# YouTube API 설정
YOUTUBE_API_KEY = os.getenv("YOUTUBE_API_KEY")