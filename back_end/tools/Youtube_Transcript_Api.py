import sys
import codecs # codecs 모듈 임포트 추가
from youtube_transcript_api import YouTubeTranscriptApi, TranscriptsDisabled, NoTranscriptFound
import xml.etree.ElementTree
import traceback

# [수정] 표준 출력(stdout)을 UTF-8로 강제 재설정
# 이 코드는 파이썬 스크립트가 콘솔로 출력하는 모든 내용을 UTF-8로 인코딩하도록 합니다.
# sys.stdout.buffer를 사용하여 바이너리 스트림에 직접 UTF-8 인코더를 적용합니다.
if sys.stdout.encoding != 'UTF-8':
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer)

def get_transcript_for_video_id(video_id):
    """지정된 YouTube 영상 ID의 스크립트를 가져옵니다."""
    # print(f"📄 영상 ID '{video_id}'의 스크립트를 가져오는 중...") # Java 로그에서 이미 처리되므로 파이썬에서는 불필요

    try:
        # 이 함수 호출 시점에서 NoTranscriptFound 예외가 발생하면 어떤 종류의 자막도 없는 것임
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # # --- DEBUGGING CODE START (선택 사항: 필요하면 주석 해제하여 디버깅) ---
        # print(f"--- DEBUG: 조사된 자막 목록 (영상 ID: {video_id}) ---", file=sys.stderr)
        # any_transcript_found_in_list = False
        # for tr_debug in transcript_list:
        #     any_transcript_found_in_list = True
        #     type_str = "자동 생성됨" if tr_debug.is_generated else "수동 업로드됨"
        #     translatable_str = f", 번역 가능 언어: {', '.join(tr.language_code for tr in tr_debug.translation_languages)}" if tr_debug.translation_languages else ""
        #     print(f"- 언어: {tr_debug.language} (코드: {tr_debug.language_code}), 종류: {type_str}{translatable_str}", file=sys.stderr)
        # if not any_transcript_found_in_list:
        #     print("- 라이브러리가 이 영상에서 어떠한 자막 정보도 리스트로 반환하지 않았습니다. (list_transcripts 결과가 비어있음)", file=sys.stderr)
        # print(f"--- DEBUG: 자막 목록 조사 완료 ---", file=sys.stderr)
        # # --- DEBUGGING CODE END ---
        
        selected_transcript_obj = None
        language_preference = ['ko', 'en'] # 한국어 우선, 그 다음 영어

        for lang_code in language_preference:
            try:
                # 수동 생성 자막 먼저 찾기
                # print(f"- 수동 생성 {lang_code} 스크립트 찾는 중...", file=sys.stderr)
                selected_transcript_obj = transcript_list.find_manually_created_transcript([lang_code])
                # print(f"✅ 수동 생성 {lang_code} 스크립트 찾음.", file=sys.stderr)
                break # 찾으면 반복 중단
            except NoTranscriptFound:
                # 수동 생성 자막이 없으면 자동 생성 자막 시도
                # print(f"- ⚠️ 수동 생성 {lang_code} 스크립트 없음. 자동 생성 시도 중...", file=sys.stderr)
                try:
                    selected_transcript_obj = transcript_list.find_generated_transcript([lang_code])
                    # print(f"✅ 자동 생성 {lang_code} 스크립트 찾음.", file=sys.stderr)
                    break # 찾으면 반복 중단
                except NoTranscriptFound:
                    # print(f"- ⚠️ 자동 생성 {lang_code} 스크립트도 없음.", file=sys.stderr)
                    pass # 다음 언어 시도
            except Exception as e_find:
                # print(f"- ⚙️ {lang_code} 스크립트 찾는 중 오류: {e_find}", file=sys.stderr)
                pass # 다음 언어 시도

        if not selected_transcript_obj:
            # print(f"🚫 영상 ID '{video_id}'에 대해 선호 언어({', '.join(language_preference)})의 스크립트를 최종적으로 선택하지 못했습니다.", file=sys.stderr)
            return None # 스크립트를 찾지 못했음을 알림

        # print("   - 스크립트 내용 가져오는 중...", file=sys.stderr)
        fetched_segments = None
        try:
            fetched_segments = selected_transcript_obj.fetch()
        except xml.etree.ElementTree.ParseError as xml_err:
            # print(f"🚫 스크립트 XML 파싱 오류 발생 (내용이 없거나 손상됨): {xml_err}", file=sys.stderr)
            return None
        except Exception as fetch_err:
            # print(f"⚙️ 스크립트 fetch 중 예기치 않은 오류: {fetch_err} (타입: {type(fetch_err)})", file=sys.stderr)
            # traceback.print_exc(file=sys.stderr) # 상세 오류 트레이스백 출력 (필요 시)
            return None

        if fetched_segments is None:
            # print("⚠️ 스크립트 fetch 후에도 세그먼트가 존재하지 않습니다.", file=sys.stderr)
            return None

        segment_texts = []
        for segment in fetched_segments:
            if isinstance(segment, dict):
                segment_texts.append(segment.get('text', ''))
            elif hasattr(segment, 'text'):
                segment_texts.append(segment.text)
            else:
                # print(f"⚠️ 알 수 없는 형식의 스크립트 세그먼트입니다: {type(segment)}. 건너뜁니다.", file=sys.stderr)
                pass # 알 수 없는 형식 건너뛰기
        
        full_transcript = " ".join(filter(None, segment_texts)) # 빈 문자열 필터링 후 조인

        if not full_transcript.strip():
            # print("⚠️ 스크립트에서 텍스트 내용을 추출하지 못했습니다 (내용이 비어 있음).", file=sys.stderr)
            return None
            
        # print("👍 스크립트 가져오기 성공!", file=sys.stderr)
        return full_transcript

    except TranscriptsDisabled: # 스크립트 기능 자체가 비활성화된 영상
        # print(f"🚫 영상 ID '{video_id}'에 대한 스크립트가 비활성화되어 있습니다.", file=sys.stderr)
        return None
    except NoTranscriptFound: # list_transcripts 자체가 아무것도 못 찾은 경우
        # print(f"🚫 영상 ID '{video_id}'에 대한 어떠한 스크립트 목록도 (수동/자동 포함하여) 찾을 수 없습니다. (NoTranscriptFound)", file=sys.stderr)
        return None
    except Exception as e:
        # print(f"⚙️ 스크립트 처리 중 예기치 않은 최상위 오류 발생: {e} (타입: {type(e)})", file=sys.stderr)
        # traceback.print_exc(file=sys.stderr) # 상세 오류 트레이스백 출력 (필요 시)
        return None

# 파이썬 스크립트가 직접 실행될 때 (Java에서 호출될 때)
if __name__ == "__main__":
    if len(sys.argv) > 1:
        video_id_from_java = sys.argv[1]
        transcript_content = get_transcript_for_video_id(video_id_from_java)
        if transcript_content:
            print(transcript_content) # Java가 읽을 수 있도록 표준 출력으로 자막 내용 인쇄
        else:
            # print("", end="") # 빈 줄 출력 (Java에서 빈 문자열로 인식)
            pass # 아무것도 출력하지 않으면 Java에서 빈 문자열로 처리됨
    else:
        # print("Usage: python Youtube_Transcript_Api.py <video_id>", file=sys.stderr)
        pass # 인자가 없으면 아무것도 하지 않음 (자바에서 올바른 인자를 보낼 것임)
