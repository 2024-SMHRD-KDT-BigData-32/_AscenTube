# main.py (최종본)

import logging
from logging.handlers import TimedRotatingFileHandler
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from apscheduler.schedulers.background import BackgroundScheduler

from api.v1 import crawl
from core.tasks import is_crawling

# --- 로깅 설정 ---
logger = logging.getLogger()
logger.setLevel(logging.INFO)
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

if not logger.hasHandlers():
    # 콘솔 핸들러
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)

    # 파일 핸들러
    if not os.path.exists('logs'):
        os.makedirs('logs')
    file_handler = TimedRotatingFileHandler(
        filename='logs/ascentube_server.log',
        when='midnight',
        interval=1,
        backupCount=30,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

# --- FastAPI 앱 및 스케줄러 생성 ---
app = FastAPI()
scheduler = BackgroundScheduler(timezone='Asia/Seoul')

# --- CORS 미들웨어 추가 ---
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- API 라우터 포함 ---
app.include_router(crawl.router, prefix="/api", tags=["Crawling"])

# --- 스케줄러 설정 ---
@app.on_event("startup")
def startup_event():
    # 매일 오후 1시에 통합 크롤링 실행
    from core.tasks import run_daily_crawl_pipeline # 지연 임포트
    scheduler.add_job(run_daily_crawl_pipeline, 'cron', hour=13, minute=0, id="daily_crawl_job")
    scheduler.start()
    logging.info("APScheduler가 시작되었습니다. 매일 오후 1시에 통합 크롤링이 실행됩니다.")

@app.on_event("shutdown")
def shutdown_event():
    scheduler.shutdown()
    logging.info("APScheduler가 종료되었습니다.")

# --- 서버 상태 확인용 루트 엔드포인트 ---
@app.get("/", summary="서버 상태 확인")
def read_root():
    return {"status": "Crawling server is running", "crawling_now": is_crawling}