# crawling 폴더에 새로 생성할 파일: run_crawl.py

import logging
from logging.handlers import TimedRotatingFileHandler
import os
from core.tasks import run_daily_crawl_pipeline

def setup_logging():
    """
    메인 서버와 동일한 기준으로 로깅을 설정하는 함수.
    파일과 콘솔에 모두 로그를 남깁니다.
    """
    logger = logging.getLogger()

    # 이미 핸들러가 설정되어 있다면 중복 추가 방지
    if logger.hasHandlers():
        logger.handlers.clear()

    logger.setLevel(logging.INFO)
    formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

    # logs 폴더가 없으면 생성
    if not os.path.exists('logs'):
        os.makedirs('logs')

    # 파일 핸들러
    file_handler = TimedRotatingFileHandler(
        filename='logs/ascentube_server.log',
        when='midnight',
        interval=1,
        backupCount=30,
        encoding='utf-8'
    )
    file_handler.setFormatter(formatter)
    logger.addHandler(file_handler)

    # 콘솔 핸들러
    stream_handler = logging.StreamHandler()
    stream_handler.setFormatter(formatter)
    logger.addHandler(stream_handler)


if __name__ == "__main__":
    setup_logging()
    try:
        logging.info("========== 🚀 [Subprocess] 크롤링 작업 시작 ==========")
        run_daily_crawl_pipeline()
        logging.info("========== ✅ [Subprocess] 크롤링 작업 정상 종료 ==========")
    except Exception as e:
        logging.error(f"========== ❌ [Subprocess] 크롤링 작업 중 심각한 오류 발생: {e} ==========", exc_info=True)