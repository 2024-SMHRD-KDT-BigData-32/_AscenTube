# youtube/api.py

import logging
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

from core import config # 우리의 설정 파일을 import 합니다.

logger = logging.getLogger(__name__)

def get_youtube_api_client():
    """
    설정 파일의 API 키를 사용하여 YouTube API 클라이언트 객체를 생성하고 반환합니다.
    """
    try:
        youtube_api = build("youtube", "v3", developerKey=config.YOUTUBE_API_KEY)
        logger.info("YouTube API 클라이언트가 성공적으로 생성되었습니다.")
        return youtube_api
    except Exception as e:
        logger.error(f"YouTube API 클라이언트 생성 중 오류 발생: {e}")
        return None