# youtube/crawler.py

import logging
from datetime import datetime, timezone

from dateutil.parser import isoparse
import isodate 
from googleapiclient.errors import HttpError

# 우리가 만든 모듈들을 import 합니다.
from ml.preprocessing import check_korean, create_prefixed_content
from ml.predict import classifier # 미리 로드된 모델 분류기

logger = logging.getLogger(__name__)

def process_and_save_video(video_key, initial_category_id, youtube_api, connection, processed_video_keys):
    """
    하나의 video_key에 대해 모든 데이터(채널,영상,통계,댓글)를 처리하고 DB에 저장합니다.
    새로운 댓글 분석 파이프라인이 포함되어 있습니다.
    """
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
        video_category = snippet.get("categoryId", initial_category_id)

        cursor = connection.cursor()

        # 2. 채널 정보 저장/업데이트 (TB_YT_CHANNEL)
        channel_id = snippet.get("channelId")
        channel_title = snippet.get("channelTitle")
        channel_url = f"https://www.youtube.com/channel/{channel_id}"
        
        channel_insert_query = """
            INSERT INTO TB_YT_CHANNEL (CNL_ID, CNL_NAME, CNL_URL) VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE CNL_NAME = VALUES(CNL_NAME), CNL_URL = VALUES(CNL_URL)
        """
        cursor.execute(channel_insert_query, (channel_id, channel_title, channel_url))

        # 3. 영상 정보 저장/업데이트 (TB_VIDEO)
        tags_list = snippet.get("tags", []) 
        video_tags_str = ",".join(tags_list) if tags_list else None
        
        video_data = (
            video_key, channel_id, snippet.get("title"), 
            snippet.get("description"), snippet.get("thumbnails", {}).get("high", {}).get("url"),
            video_category, snippet.get("defaultAudioLanguage"),
            'Y',
            isodate.parse_duration(video_detail.get("contentDetails", {}).get("duration", "PT0S")).total_seconds(),
            isoparse(snippet.get("publishedAt")),
            video_tags_str
        )
        video_insert_query = """
            INSERT INTO TB_VIDEO 
            (VIDEO_KEY, CNL_ID, VIDEO_TITLE, VIDEO_DESC, THUMBNAIL_URL, VIDEO_CATEGORY, 
             VIDEO_LANGUAGE, PUBLIC_YN, VIDEO_PLAYTIME, UPLOADED_AT, VIDEO_TAGS)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            ON DUPLICATE KEY UPDATE
            VIDEO_TITLE = VALUES(VIDEO_TITLE), VIDEO_DESC = VALUES(VIDEO_DESC), VIDEO_TAGS = VALUES(VIDEO_TAGS)
        """
        cursor.execute(video_insert_query, video_data)
        
        # 방금 저장한 영상의 PK(VIDEO_ID) 가져오기
        cursor.execute("SELECT VIDEO_ID FROM TB_VIDEO WHERE VIDEO_KEY = %s", (video_key,))
        result = cursor.fetchone()
        if not result: 
            cursor.close()
            return
        db_video_id = result[0]

        # 4. 영상 통계 저장 (TB_VIDEO_STATS)
        stats_data = (
            db_video_id, datetime.now(timezone.utc),
            statistics.get("viewCount"), statistics.get("likeCount"), statistics.get("commentCount")
        )
        stats_insert_query = """
            INSERT INTO TB_VIDEO_STATS (VIDEO_ID, STATS_DATE, VIEW_CNT, LIKE_CNT, CMT_CNT)
            VALUES (%s, %s, %s, %s, %s)
        """
        cursor.execute(stats_insert_query, stats_data)
        
         # 5. 댓글 수집 및 처리/저장 (TB_COMMENT) - ★★★ 페이지네이션 적용 수정 ★★★
        try:
            comments_to_process = []
            next_page_token = None  # 다음 페이지를 가리키는 토큰
            collected_count = 0     # 수집한 댓글 개수
            DESIRED_COUNT = 200     # 목표 수집 개수

            # 목표 개수에 도달하거나, 다음 페이지가 없을 때까지 반복
            while collected_count < DESIRED_COUNT:
                comment_request = youtube_api.commentThreads().list(
                    part="snippet",
                    videoId=video_key,
                    maxResults=100,  # API 최대치인 100으로 요청
                    order="relevance",
                    pageToken=next_page_token # 다음 페이지를 요청할 때 토큰 사용
                )
                comment_response = comment_request.execute()

                # 수집한 댓글들을 리스트에 추가
                for comment_item in comment_response.get("items", []):
                    comments_to_process.append(comment_item)
                    collected_count += 1
                    if collected_count >= DESIRED_COUNT:
                        break # 목표 개수에 도달하면 안쪽 루프 탈출
                
                # 다음 페이지가 있는지 확인
                next_page_token = comment_response.get("nextPageToken")
                if not next_page_token:
                    break # 다음 페이지 토큰이 없으면 전체 루프 탈출

            # --- 수집된 모든 댓글에 대해 ML 분석 및 DB 저장 준비 ---
            comments_to_save_in_db = []
            for comment_item in comments_to_process:
                top_comment = comment_item["snippet"]["topLevelComment"]["snippet"]
                cmt_content = top_comment.get("textOriginal")

                prefixed_content = None
                preprocessing_yn = 'N'
                sentiment = "EXCEPT"
                speech_act = "EXCEPT"

                if cmt_content and check_korean(cmt_content):
                    preprocessing_yn = 'Y'
                    prefixed_content = create_prefixed_content(video_category, cmt_content)
                    
                    predictions = classifier.predict(prefixed_content)
                    sentiment = predictions["sentiment"]
                    speech_act = predictions["speech_act"]
                
                comment_data = (
                    comment_item["snippet"]["topLevelComment"]["id"], db_video_id,
                    top_comment.get("authorDisplayName"), cmt_content,
                    top_comment.get("likeCount", 0), isoparse(top_comment.get("publishedAt")),
                    datetime.now(timezone.utc), video_category,
                    preprocessing_yn, prefixed_content, sentiment, speech_act
                )
                comments_to_save_in_db.append(comment_data)

            # --- DB에 한꺼번에 저장 ---
            if comments_to_save_in_db:
                comment_insert_query = """
                    INSERT INTO TB_COMMENT (
                        CMT_ID, VIDEO_ID, CMT_WRITE_NAME, CMT_CONTENT, CMT_LIKE_CNT, CMT_WRITE_AT, 
                        CRAWLED_AT, VIDEO_CATEGORY, PREPROCESSING_YN, PREPIX_CMT_CONTENT, 
                        SENTIMENT_TYPE, SPEECH_ACT
                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE 
                        CMT_LIKE_CNT = VALUES(CMT_LIKE_CNT), PREPROCESSING_YN = VALUES(PREPROCESSING_YN),
                        PREPIX_CMT_CONTENT = VALUES(PREPIX_CMT_CONTENT),
                        SENTIMENT_TYPE = VALUES(SENTIMENT_TYPE), SPEECH_ACT = VALUES(SPEECH_ACT)
                """
                # executemany를 사용하면 더 효율적이지만, 지금은 기존 구조를 유지합니다.
                for comment_data in comments_to_save_in_db:
                    cursor.execute(comment_insert_query, comment_data)

            logger.info(f"영상 '{snippet['title'][:20]}...' 처리 및 저장 완료 (댓글 {len(comments_to_save_in_db)}개 수집).")

        except HttpError as e:
            if e.resp.status == 403:
                logger.warn(f"댓글을 가져올 수 없습니다 (댓글 비활성화 등). VIDEO_KEY: {video_key}")
            else:
                logger.error(f"댓글 수집 중 API 오류: {e}")
        
        # --- 이하 코드는 기존과 동일 ---
        processed_video_keys.add(video_key)
        cursor.close()


    except Exception as e:
        logger.error(f"영상 처리(process_and_save_video) 중 심각한 오류 발생: {e}", exc_info=True)