# main.py
import time
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

import mysql.connector
from mysql.connector import Error

from dateutil.parser import isoparse
import isodate 

# --- .env 파일에서 환경변수 로드 ---
load_dotenv()

# --- 로깅 설정 ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# --- FastAPI 앱 및 스케줄러 생성 ---
app = FastAPI()
scheduler = BackgroundScheduler(timezone='Asia/Seoul')
is_crawling = False 

# --- CORS 미들웨어 추가 ---
origins = [ "http://localhost", "http://localhost:3000", "http://localhost:5173" ]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins, allow_credentials=True,
    allow_methods=["*"], allow_headers=["*"],
)

# --- DB 커넥션 생성 함수 ---
def get_db_connection():
    try:
        connection = mysql.connector.connect(
            host=os.getenv("DB_HOST"), port=os.getenv("DB_PORT"),
            database=os.getenv("DB_NAME"), user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD")
        )
        if connection.is_connected():
            return connection
    except Error as e:
        logger.error(f"DB 연결 중 오류 발생: {e}")
        return None

# --- 크롤링 및 DB 저장 로직을 처리하는 공통 헬퍼 함수 ---
# main.py의 process_video 함수 전체를 아래 코드로 교체해주세요.

# main.py의 process_video 함수 전체를 아래 코드로 교체해주세요.

# main.py의 process_video 함수 전체를 아래 코드로 교체해주세요.

def process_video(video_key, category_id, youtube_api, cursor, processed_video_keys):
    if video_key in processed_video_keys:
        logger.info(f"이미 처리된 영상입니다. 건너뜁니다 (VIDEO_KEY: {video_key})")
        return

    try:
        # 1. 영상 상세 정보 가져오기
        video_detail_request = youtube_api.videos().list(
            part="snippet,contentDetails,statistics",
            id=video_key
        )
        video_detail_response = video_detail_request.execute()
        if not video_detail_response.get("items"): return
        
        video_detail = video_detail_response["items"][0]
        snippet = video_detail["snippet"]
        statistics = video_detail.get("statistics", {})

        # ------------------------------------------------------------------
        # (수정) 2. 채널 정보를 TB_YT_CHANNEL에 먼저 저장/업데이트
        # ------------------------------------------------------------------
        channel_id = snippet.get("channelId")
        channel_title = snippet.get("channelTitle")
        # (신규) 채널 ID를 이용해 표준 채널 URL 생성
        channel_url = f"https://www.youtube.com/channel/{channel_id}"

        # (수정) channel_data와 쿼리에 CNL_URL 추가
        channel_data = (channel_id, channel_title, channel_url, channel_title, channel_url)
        channel_insert_query = """
            INSERT INTO TB_YT_CHANNEL (CNL_ID, CNL_NAME, CNL_URL)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE CNL_NAME = VALUES(CNL_NAME), CNL_URL = VALUES(CNL_URL)
        """
        # (수정) INSERT에 필요한 3개만 전달하도록 슬라이싱
        cursor.execute(channel_insert_query, channel_data[:3])
        logger.info(f"채널 '{channel_title}' 정보 DB 저장/업데이트 완료.")
        
        # 3. 태그 정보 추출 및 가공
        tags_list = snippet.get("tags", []) 
        video_tags_str = ",".join(tags_list) if tags_list else None

        # (이하 코드는 이전과 동일합니다)
        # 4. TB_VIDEO에 저장할 데이터 준비 ...
        video_data = (
            video_key, channel_id, snippet.get("title"), 
            snippet.get("description"), snippet.get("thumbnails", {}).get("high", {}).get("url"),
            snippet.get("categoryId", category_id), snippet.get("defaultAudioLanguage"),
            'Y',
            isodate.parse_duration(video_detail.get("contentDetails", {}).get("duration", "PT0S")).total_seconds(),
            isoparse(snippet.get("publishedAt")),
            video_tags_str,
            snippet.get("title"), snippet.get("description"), video_tags_str
        )
        
        # 5. TB_VIDEO에 저장 ...
        video_insert_query = """
            INSERT INTO TB_VIDEO 
            (VIDEO_KEY, CNL_ID, VIDEO_TITLE, VIDEO_DESC, THUMBNAIL_URL, VIDEO_CATEGORY, 
             VIDEO_LANGUAGE, PUBLIC_YN, VIDEO_PLAYTIME, UPLOADED_AT, VIDEO_TAGS)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            VIDEO_TITLE = VALUES(VIDEO_TITLE), 
            VIDEO_DESC = VALUES(VIDEO_DESC),
            VIDEO_TAGS = VALUES(VIDEO_TAGS)
        """
        cursor.execute(video_insert_query, video_data[:11])
        logger.info(f"영상 '{snippet['title'][:20]}...' 정보(태그 포함) DB 저장/업데이트 완료.")

        # 6. 방금 저장한 영상의 PK(VIDEO_ID) 가져오기 ...
        cursor.execute("SELECT VIDEO_ID FROM TB_VIDEO WHERE VIDEO_KEY = %s", (video_key,))
        result = cursor.fetchone()
        if not result: return
        db_video_id = result[0]

        # 7. TB_VIDEO_STATS에 통계 정보 저장 ...
        stats_data = (
            db_video_id, datetime.now(timezone.utc),
            statistics.get("viewCount"), statistics.get("likeCount"), statistics.get("commentCount")
        )
        stats_insert_query = """
            INSERT INTO TB_VIDEO_STATS 
            (VIDEO_ID, STATS_DATE, VIEW_CNT, LIKE_CNT, CMT_CNT)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(stats_insert_query, stats_data)
        logger.info(f"영상 통계 정보 DB 저장 완료.")

        # 8. 댓글 수집 및 TB_COMMENT에 저장
        try:
            comment_request = youtube_api.commentThreads().list(part="snippet", videoId=video_key, maxResults=100, order="relevance")
            comment_response = comment_request.execute()
            
            for comment_item in comment_response.get("items", []):
                top_comment = comment_item["snippet"]["topLevelComment"]["snippet"]
                
                # ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 이 부분을 수정합니다 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
                comment_data = (
                   comment_item["snippet"]["topLevelComment"]["id"], # CMT_ID
                   db_video_id,                                     # VIDEO_ID
                   top_comment.get("authorDisplayName"),            # CMT_WRITE_NAME
                   top_comment.get("textOriginal"),                 # CMT_CONTENT
                   top_comment.get("likeCount", 0),                 # CMT_LIKE_CNT
                   isoparse(top_comment.get("publishedAt")),        # CMT_WRITE_AT
                   datetime.now(timezone.utc),                      # CRAWLED_AT (신규 추가)
                   top_comment.get("likeCount", 0)                  # ON DUPLICATE KEY UPDATE 용
                )
                comment_insert_query = """
                    INSERT INTO TB_COMMENT 
                    (CMT_ID, VIDEO_ID, CMT_WRITE_NAME, CMT_CONTENT, CMT_LIKE_CNT, CMT_WRITE_AT, CRAWLED_AT)
                    VALUES (%s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE CMT_LIKE_CNT = VALUES(CMT_LIKE_CNT)
                """
                # (수정) 슬라이싱 인덱스 변경
                cursor.execute(comment_insert_query, comment_data[:-1]) 
                # ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

            logger.info(f"댓글 {len(comment_response.get('items', []))}개 DB 저장/업데이트 완료.")
        except HttpError as e:
            if e.resp.status == 403: logger.warn(f"댓글을 가져올 수 없습니다 (댓글 비활성화 등).")
            else: logger.error(f"댓글 수집 중 오류: {e}")

        processed_video_keys.add(video_key)
    except Exception as e:
        logger.error(f"영상 처리(process_video) 중 오류 발생: {e}")
# --------------------------------------------------------------------------
# 최종 통합 크롤링 함수
# --------------------------------------------------------------------------
def run_daily_crawl():
    global is_crawling
    if is_crawling: return

    connection = None
    try:
        is_crawling = True
        logger.info("========== 🚀 통합 일일 크롤링 시작 ==========")
        
        connection = get_db_connection()
        if not connection: return
        
        api_key = os.getenv("YOUTUBE_API_KEY")
        youtube_api = build("youtube", "v3", developerKey=api_key)

        processed_video_keys = set()

        # --- 1단계: 관심 채널 최신 영상 수집 ---
        logger.info("--- 1단계: 관심 채널 최신 영상 수집 시작 ---")
        with connection.cursor() as cursor:
            cursor.execute("SELECT DISTINCT CNL_ID FROM TB_FAVORITE_CHANNEL")
            channel_ids = [row[0] for row in cursor.fetchall()]
            logger.info(f"총 {len(channel_ids)}개의 고유 관심 채널을 크롤링합니다.")

            for channel_id in channel_ids:
                logger.info(f"--- 채널 ID: {channel_id} 크롤링 중 ---")
                request = youtube_api.search().list(part="snippet", channelId=channel_id, order="date", type="video", maxResults=100)
                response = request.execute()
                for item in response.get("items", []):
                    process_video(item["id"]["videoId"], None, youtube_api, cursor, processed_video_keys)
                connection.commit()
                time.sleep(1)

        # --- 2단계: 카테고리별 인기 영상 수집 ---
        logger.info("--- 2단계: 카테고리별 인기 영상 수집 시작 ---")
        with connection.cursor() as cursor:
            category_ids = ["10", "17", "20", "24"]
            for category_id in category_ids:
                logger.info(f"--- 카테고리 ID: {category_id} 크롤링 중 ---")
                request = youtube_api.videos().list(part="snippet", chart="mostPopular", regionCode="KR", videoCategoryId=category_id, maxResults=100)
                response = request.execute()
                for video in response.get("items", []):
                    process_video(video["id"], category_id, youtube_api, cursor, processed_video_keys)
                connection.commit()
                time.sleep(1)

        logger.info("========== ✅ 통합 일일 크롤링 완료 ==========")
        
    except Exception as e:
        logger.error(f"통합 크롤링 중 오류 발생: {e}")
        if connection: connection.rollback()
    finally:
        is_crawling = False
        if connection and connection.is_connected():
            connection.close()
            logger.info("데이터베이스 연결이 종료되었습니다.")

# --------------------------------------------------------------------------
# API 엔드포인트 및 스케줄러
# --------------------------------------------------------------------------
@app.post("/api/crawl/trigger-daily", summary="[통합] 일일 전체 크롤링 실행")
async def trigger_daily_crawl(background_tasks: BackgroundTasks):
    if is_crawling: raise HTTPException(status_code=409, detail="크롤링이 이미 실행 중입니다.")
    background_tasks.add_task(run_daily_crawl)
    return {"message": "통합 일일 크롤링을 시작했습니다."}

@app.on_event("startup")
def startup_event():
    scheduler.add_job(run_daily_crawl, 'cron', hour=13, minute=0, id="daily_crawl_job")
    scheduler.start()
    logger.info("APScheduler가 시작되었습니다. 매일 오후 1시에 통합 크롤링이 실행됩니다.")

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()
    logger.info("APScheduler가 종료되었습니다.")

@app.get("/", summary="서버 상태 확인")
def read_root():
    return {"status": "Crawling server is running", "crawling_now": is_crawling}