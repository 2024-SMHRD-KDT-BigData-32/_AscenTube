# core/tasks.py (최종본)

import logging
import time
import os

from database.connection import get_db_connection
from youtube.api import get_youtube_api_client
from youtube.crawler import process_and_save_video

logger = logging.getLogger(__name__)

is_crawling = False 

def run_daily_crawl_pipeline():
    global is_crawling
    if is_crawling:
        logger.warn("크롤링이 이미 실행 중이므로 이번 스케줄은 건너뜁니다.")
        return

    connection = None
    try:
        is_crawling = True
        
        connection = get_db_connection()
        youtube_api = get_youtube_api_client()

        if not connection or not youtube_api:
            logger.error("DB 또는 YouTube API 클라이언트 연결에 실패하여 크롤링을 중단합니다.")
            return
        
        processed_video_keys = set()
        max_results_per_call = 4 # CPU 과부하 방지를 위해 수치 조절

        # --- 1단계: 관심 채널 최신 영상 수집 ---
        logger.info("--- 1단계: 관심 채널 최신 영상 수집 시작 ---")
        with connection.cursor() as cursor:
            cursor.execute("SELECT DISTINCT CNL_ID FROM TB_FAVORITE_CHANNEL")
            channel_ids = [row[0] for row in cursor.fetchall()]
        
        for channel_id in channel_ids:
            try:
                logger.info(f"--- 채널 ID: {channel_id} 크롤링 중 ---")
                request = youtube_api.search().list(part="snippet", channelId=channel_id, order="date", type="video", maxResults=max_results_per_call)
                response = request.execute()
                for item in response.get("items", []):
                    process_and_save_video(item["id"]["videoId"], None, youtube_api, connection, processed_video_keys)
                connection.commit()
                time.sleep(1)
            except Exception as e:
                logger.error(f"채널 ID {channel_id} 처리 중 오류 발생, 다음 채널로 넘어갑니다: {e}")
                connection.rollback() # 오류 발생 시 해당 채널 작업은 롤백
                continue

        # --- 2단계: 카테고리별 인기 영상 수집 ---
        logger.info("--- 2단계: 카테고리별 인기 영상 수집 시작 ---")
        category_ids = ["1", "2", "10", "15", "17", "20", "22", "23", "24", "26", "28"]
        
        for category_id in category_ids:
            try:
                logger.info(f"--- 카테고리 ID: {category_id} 크롤링 중 ---")
                request = youtube_api.videos().list(part="snippet", chart="mostPopular", regionCode="KR", videoCategoryId=category_id, maxResults=max_results_per_call)
                response = request.execute()
                for video in response.get("items", []):
                    process_and_save_video(video["id"], category_id, youtube_api, connection, processed_video_keys)
                connection.commit()
                time.sleep(1)
            except Exception as e:
                logger.error(f"카테고리 ID {category_id} 처리 중 오류 발생, 다음 카테고리로 넘어갑니다: {e}")
                connection.rollback() # 오류 발생 시 해당 카테고리 작업은 롤백
                continue
        
    except Exception as e:
        logger.error(f"통합 크롤링 파이프라인 중 최상위 오류 발생: {e}", exc_info=True)
        if connection: connection.rollback()
    finally:
        is_crawling = False
        if connection and connection.is_connected():
            connection.close()
            logger.info("데이터베이스 연결이 최종적으로 종료되었습니다.")