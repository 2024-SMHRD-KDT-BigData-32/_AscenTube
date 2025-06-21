# database/connection.py

import mysql.connector
from mysql.connector import Error
import logging

from core import config # 방금 만든 설정 파일을 import 합니다.

logger = logging.getLogger(__name__)

def get_db_connection():
    """
    설정 파일(config.py)의 정보를 바탕으로 DB 커넥션을 생성하고 반환합니다.
    """
    try:
        connection = mysql.connector.connect(
            host=config.DB_HOST,
            port=config.DB_PORT,
            database=config.DB_NAME,
            user=config.DB_USER,
            password=config.DB_PASSWORD
        )
        if connection.is_connected():
            return connection
    except Error as e:
        logger.error(f"DB 연결 중 오류 발생: {e}")
        return None
    
