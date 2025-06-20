# api/v1/crawl.py (최종본)

import sys
import subprocess
from fastapi import APIRouter, HTTPException
from core.tasks import is_crawling

router = APIRouter(prefix="/crawl")

@router.post("/trigger-daily", summary="[수동] 일일 전체 크롤링 실행")
def trigger_daily_crawl():
    """
    크롤링 작업을 별도의 독립된 파이썬 프로세스로 실행시킵니다.
    """
    if is_crawling:
        raise HTTPException(status_code=409, detail="크롤링이 이미 실행 중입니다.")

    command = [sys.executable, "run_crawl.py"]
    
    subprocess.Popen(command)

    return {"message": "크롤링 작업을 별도 프로세스로 시작했습니다. logs/ascentube_server.log 파일을 확인하세요."}