# ml/preprocessing.py (최종 수정본)

import re

# YouTube 카테고리 ID -> 한글 이름 매핑 사전
YOUTUBE_CATEGORY_MAP = {
    "1": "영화 및 애니메이션",
    "2": "자동차 및 차량",
    "10": "음악",
    "15": "애완동물 및 동물",
    "17": "스포츠",
    "20": "게임",
    "22": "인물 및 블로그",
    "23": "코미디",
    "24": "엔터테인먼트",
    "26": "하는 방법 및 스타일",
    "28": "과학 및 기술",
    # 필요에 따라 다른 카테고리 ID를 추가할 수 있습니다.
    # 예: "19": "여행 및 이벤트", "27": "교육" 등
}

# ml/preprocessing.py의 clean_text 함수를 교체

def clean_text(text):
    """[최종] 영어/이모지/특수문자 제거 (한글/숫자/자음/모음은 보존)"""
    if not isinstance(text, str):
        return ""
    
    allowed_chars = []
    for char in text:
        # [수정] 아래 `or ('\u3131' <= char <= '\u3163')` 조건이 추가되어 'ㅋ'이나 'ㅠ' 같은 자음/모음도 남게 됩니다.
        # <--- 이 부분이 핵심 추가사항
        if ('가' <= char <= '힣') or \
           ('\u3131' <= char <= '\u3163') or \
           char.isdigit() or \
           char.isspace() or \
           char in '.,?!':
            allowed_chars.append(char)
    
    # 허용된 문자들을 다시 하나의 문자열로 합침
    cleaned_str = "".join(allowed_chars)

    # 여러 개의 공백을 하나로 축소 후 반환
    return re.sub(r'\s+', ' ', cleaned_str).strip()

def check_korean(text):
    """[수정] 완성형 한글, 자음, 모음을 모두 포함하는지 확인"""
    if not isinstance(text, str):
        return False
    
    # [수정] 정규식에 자음(ㄱ-ㅎ)과 모음(ㅏ-ㅣ) 범위를 추가합니다.
    return bool(re.search('[가-힣ㄱ-ㅎㅏ-ㅣ]', text))

def create_prefixed_content(category_id, content):
    """
    카테고리 ID를 이름으로 변환하고, 텍스트를 정제하여
    "카테고리이름: 정제된내용" 형태의 문자열을 생성합니다.
    """
    # 카테고리 ID를 한글 이름으로 변환. 없으면 '기타'로 처리.
    category_name = YOUTUBE_CATEGORY_MAP.get(str(category_id), "기타")

    # 텍스트 정제
    processed_content = clean_text(content)
    
    return f"{category_name}: {processed_content}"