// src/pages/VidAnalysis.jsx
import React, { useState, useEffect, useCallback } from 'react'; // useCallback 추가
import { Link, useLocation } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/VidAnalysis.css';
import '../styles/pages/Ai.css';
import { FiThumbsUp, FiMessageSquare, FiPlay } from 'react-icons/fi'; // 아이콘 추가


// =================================================================================
// =                             상수 및 헬퍼 함수 정의                               =
// =================================================================================

const API_BASE_URL = 'http://localhost:8082/AscenTube';

/**
 * YouTube의 ISO 8601 형식 기간 문자열(예: "PT1H2M3S")을 "1시간 2분 3초" 형식으로 변환합니다.
 */
const parseISODuration = (isoDuration) => {
  if (!isoDuration) return 'N/A';
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);
  if (!matches) return isoDuration;
  const hours = matches[1] ? parseInt(matches[1], 10) : 0;
  const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
  const seconds = matches[3] ? parseInt(matches[3], 10) : 0;
  let formatted = '';
  if (hours > 0) formatted += `${hours}시간 `;
  if (minutes > 0) formatted += `${minutes}분 `;
  if (seconds > 0 || (hours === 0 && minutes === 0 && seconds === 0)) formatted += `${seconds}초`;
  return formatted.trim() || '정보 없음';
};

/**
 * YouTube URL에서 영상 ID를 추출합니다.
 */
const extractVideoId = (url) => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
};


// =================================================================================
// =                            VidAnalysis 메인 컴포넌트                           =
// =================================================================================

const VidAnalysis = () => {

  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 상태 관리 (State Management) ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

  const [videoUrl, setVideoUrl] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [aiAnalysisResults, setAiAnalysisResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [fullTranscript, setFullTranscript] = useState('');
  const [showFullTranscript, setShowFullTranscript] = useState(false);
  const [isInitialAnalysisTriggered, setIsInitialAnalysisTriggered] = useState(false); // 초기 분석 트리거 여부

  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 상태 관리 (State Management) ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  const location = useLocation(); // URL 정보 가져오기


  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 핵심 로직: AI 분석 핸들러 (useCallback으로 최적화) ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

  const handleAnalysis = useCallback(async () => {
    if (loading) return; // 이미 로딩 중이면 중복 호출 방지

    setLoading(true);
    setAnalysisResults(null);
    setAiAnalysisResults(null);
    setError('');
    setShowFullDescription(false);
    setFullTranscript('');
    setShowFullTranscript(false);

    const videoId = extractVideoId(videoUrl);
    if (!videoId) {
      setError('유효한 YouTube 영상 URL을 입력해주세요.');
      setLoading(false);
      return;
    }

    const token = localStorage.getItem('access_token');
    if (!token) {
      setError("인증 정보가 없습니다. 로그인해주세요.");
      setLoading(false);
      return;
    }

    try {
      const response = await axios.get(`${API_BASE_URL}/api/ai/youtube/video-analysis/${videoId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      console.log("백엔드로부터 받은 분석 응답:", response.data);

      if (response.data && response.data.videoInfo && response.data.aiAnalysis) {
        setAnalysisResults(response.data.videoInfo);
        setAiAnalysisResults(response.data.aiAnalysis);
        setFullTranscript(response.data.fullTranscript || '');
      } else {
        throw new Error("백엔드로부터 받은 데이터 형식이 올바르지 않습니다.");
      }

    } catch (err) {
      console.error("분석 중 오류:", err);
      if (axios.isAxiosError(err) && err.response) {
        setError(`분석 중 오류: ${err.response.data?.error || err.message}`);
      } else {
        setError(`분석 중 네트워크 오류: ${err.message}`);
      }
      setAnalysisResults(null);
      setAiAnalysisResults(null);
      setFullTranscript('');
      setShowFullTranscript(false);
    } finally {
      setLoading(false);
    }
  }, [loading, videoUrl]); // videoUrl이 변경될 때마다 handleAnalysis 함수가 다시 생성되도록 의존성 추가


  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 핵심 로직: AI 분석 핸들러 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲


  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 부가 기능 및 라이프사이클 (Helpers & Lifecycle) ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

  const isLongDescription = (text, limit = 200) => text && text.length > limit;
  const isLongTranscript = (text, limit = 500) => text && text.length > limit;

  const handleInputChange = (event) => {
    setVideoUrl(event.target.value);
    // 수동 입력 시 초기 분석 플래그 초기화
    if (isInitialAnalysisTriggered) {
      setIsInitialAnalysisTriggered(false);
    }
  };

  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAnalysis();
    }
  };


  // --- LocalStorage 연동: 페이지를 새로고침해도 이전 상태 유지 (최초 렌더링 시 1회 실행) ---
  useEffect(() => {
    const persistedVideoUrl = localStorage.getItem('vidAnalysis_videoUrl');
    if (persistedVideoUrl) setVideoUrl(persistedVideoUrl);

    const persistedAnalysisResults = localStorage.getItem('vidAnalysis_results');
    if (persistedAnalysisResults) {
      try { setAnalysisResults(JSON.parse(persistedAnalysisResults)); }
      catch (e) { console.error("저장된 일반 분석 결과 파싱 오류:", e); localStorage.removeItem('vidAnalysis_results'); }
    }

    const persistedAiResults = localStorage.getItem('vidAnalysis_ai_results');
    if (persistedAiResults) {
      try { setAiAnalysisResults(JSON.parse(persistedAiResults)); }
      catch (e) { console.error("저장된 AI 분석 결과 파싱 오류:", e); localStorage.removeItem('vidAnalysis_ai_results'); }
    }
    const persistedTranscript = localStorage.getItem('vidAnalysis_fullTranscript');
    if (persistedTranscript) setFullTranscript(persistedTranscript);
    
    // Boolean 값은 직접 파싱
    const persistedShowFullTranscript = localStorage.getItem('vidAnalysis_showFullTranscript');
    if (persistedShowFullTranscript !== null) { // null 체크 추가
      setShowFullTranscript(JSON.parse(persistedShowFullTranscript));
    }
    const persistedShowFullDesc = localStorage.getItem('vidAnalysis_showFullDescription');
    if (persistedShowFullDesc !== null) { // null 체크 추가
      setShowFullDescription(JSON.parse(persistedShowFullDesc));
    }
  }, []); // 의존성 배열이 비어 있어 컴포넌트 마운트 시 한 번만 실행됩니다.


  // --- URL 쿼리 파라미터 변경 감지 및 초기 분석 트리거 (location.search 변경 시 실행) ---
  // 이 useEffect는 URL 쿼리 파라미터 변화를 감지하고, 이에 따라 videoUrl 상태를 업데이트하여
  // 다음 useEffect가 분석을 트리거하도록 합니다.
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const urlVideoId = queryParams.get('videoId');

    if (urlVideoId) {
      const fullYoutubeUrl = `https://www.youtube.com/watch?v=${urlVideoId}`;
      const currentVideoIdInState = extractVideoId(videoUrl);

      // URL의 videoId가 현재 videoUrl 상태와 다르거나, 아직 초기 분석이 트리거되지 않은 경우
      if (urlVideoId !== currentVideoIdInState || !isInitialAnalysisTriggered) {
        setVideoUrl(fullYoutubeUrl); // videoUrl 상태 업데이트
        setIsInitialAnalysisTriggered(true); // 초기 분석 트리거 플래그 설정
      }
      // 선택 사항: URL에서 videoId 파라미터를 제거하여 주소창을 깔끔하게 만듦
      // window.history.replaceState(null, '', location.pathname);

    } else if (!urlVideoId && isInitialAnalysisTriggered) {
      // URL에서 videoId 파라미터가 없어졌다면 초기 분석 트리거 플래그를 리셋
      setIsInitialAnalysisTriggered(false);
      // 필요하다면, 여기에 기존 분석 결과를 초기화하는 로직 추가
      // setAnalysisResults(null);
      // setAiAnalysisResults(null);
      // setVideoUrl(''); // 입력창도 비우기
    }
  }, [location.search, videoUrl, isInitialAnalysisTriggered]); // location.search가 변경될 때마다 실행


  // --- 실제 분석 로직 트리거 (videoUrl 및 초기 분석 플래그 변경 시) ---
  // 이 useEffect는 videoUrl이 설정되고 isInitialAnalysisTriggered가 true일 때 분석을 시작합니다.
  useEffect(() => {
    if (isInitialAnalysisTriggered && videoUrl && !loading) {
      const currentVideoId = extractVideoId(videoUrl);
      const analyzedVideoId = analysisResults ? analysisResults.id : null;

      // 현재 videoUrl의 ID가 유효하고, 이전에 분석된 영상 ID와 다르거나
      // 혹은 이전에 분석된 결과가 없는 경우 (페이지 첫 로드 시 URL 파라미터 존재)
      if (currentVideoId && currentVideoId !== analyzedVideoId) {
           console.log("URL 파라미터 또는 새 입력에 의한 자동 분석 시작:", videoUrl);
           handleAnalysis(); // 핵심 분석 함수 호출
      } else if (isInitialAnalysisTriggered && !analysisResults && !error) {
           // isInitialAnalysisTriggered가 true인데 분석 결과가 없는 경우 (초기 진입)
           console.log("URL 파라미터에 의한 초기 자동 분석 시작 (결과 없음):", videoUrl);
           handleAnalysis(); // 핵심 분석 함수 호출
      }
    }
  }, [videoUrl, isInitialAnalysisTriggered, loading, analysisResults, error, handleAnalysis]); // handleAnalysis를 의존성으로 추가


  // --- LocalStorage에 상태 저장 (각 상태 변경 시마다) ---
  // 이 모든 로컬 스토리지 저장 로직을 하나의 useEffect로 통합하여 코드 길이 축소
  useEffect(() => {
    localStorage.setItem('vidAnalysis_videoUrl', videoUrl);
    if (analysisResults) {
      localStorage.setItem('vidAnalysis_results', JSON.stringify(analysisResults));
    } else {
      localStorage.removeItem('vidAnalysis_results');
    }
    if (aiAnalysisResults) {
      localStorage.setItem('vidAnalysis_ai_results', JSON.stringify(aiAnalysisResults));
    } else {
      localStorage.removeItem('vidAnalysis_ai_results');
    }
    if (fullTranscript) {
      localStorage.setItem('vidAnalysis_fullTranscript', fullTranscript);
    } else {
      localStorage.removeItem('vidAnalysis_fullTranscript');
    }
    localStorage.setItem('vidAnalysis_showFullTranscript', JSON.stringify(showFullTranscript));
    localStorage.setItem('vidAnalysis_showFullDescription', JSON.stringify(showFullDescription));
  }, [videoUrl, analysisResults, aiAnalysisResults, fullTranscript, showFullTranscript, showFullDescription]);


  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 부가 기능 및 라이프사이클 (Helpers & Lifecycle) ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲


  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 렌더링(JSX) 관련 함수 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

  /**
   * 분석 결과를 화면에 그리는 메인 렌더링 함수
   */
  const renderAnalysisResults = () => {
    if (!analysisResults) return null;

    const { snippet, statistics, contentDetails, id } = analysisResults;
    const descriptionText = snippet?.description || '';
    const videoLink = `https://www.youtube.com/watch?v=${id}`; // 올바른 YouTube URL 형식

    // 스크립트 길이 체크 헬퍼 함수
    const isLongTranscriptLocal = (text, limit = 500) => text && text.length > limit;

    return (
      <>
        {/* --- 영상 기본 정보 섹션 (디자인 개편) --- */}
        <div className="video-header-section">
          <a href={videoLink} target="_blank" rel="noopener noreferrer" className="thumbnail-link">
            <img
              className="analysis-thumbnail"
              src={snippet?.thumbnails?.medium?.url}
              alt="영상 썸네일"
            />
          </a>
          <div className="video-info-details">
            <a href={videoLink} target="_blank" rel="noopener noreferrer" className="video-title-link">
              <h3 className="video-title-main">{snippet?.title || '제목 정보 없음'}</h3>
            </a>

            <div className="channel-info">
              <Link to={`/channel/${snippet.channelId}`} className="channel-name-link">
                {snippet?.channelTitle || '채널 정보 없음'}
              </Link>
              <span className="info-separator">·</span>
              <span className="upload-date">
                {snippet?.publishedAt ? new Date(snippet.publishedAt).toLocaleDateString('ko-KR') : '날짜 정보 없음'}
              </span>
            </div>

            <div className="video-stats-inline">
              <span className="stat-item"><FiPlay className="stat-icon" /> 조회수 {Number(statistics.viewCount || 0).toLocaleString()}회</span>
              <span className="stat-item"><FiThumbsUp className="stat-icon" /> 좋아요 {Number(statistics.likeCount || 0).toLocaleString()}개</span>
              <span className="stat-item"><FiMessageSquare className="stat-icon" /> 댓글 {Number(statistics.commentCount || 0).toLocaleString()}개</span>
            </div>
          </div>
        </div>

        {/* --- AI 영상 분석 결과 패널 (디자인 개편) --- */}
        {aiAnalysisResults && (
          <div className="ai-analysis-container">
            <h4 className="section-title">AI 콘텐츠 분석 결과</h4>
            <div className="ai-analysis-grid">
              <div className="ai-analysis-card">
                <h5>콘텐츠 요약</h5>
                <ul>
                  <li><strong>핵심 주제:</strong> {aiAnalysisResults.contentSummary?.mainTopic || 'N/A'}</li>
                  <li><strong>주요 내용:</strong>
                    <ul>
                      {aiAnalysisResults.contentSummary?.summaryPoints?.map((item, index) => (
                        <li key={index}>{item}</li>
                      )) || 'N/A'}
                    </ul>
                  </li>
                </ul>
              </div>
              <div className="ai-analysis-card">
                <h5>핵심 정보 (Key Takeaways)</h5>
                <ul>
                  {aiAnalysisResults.keyTakeaways?.map((item, index) => (<li key={index}>{item}</li>))}
                </ul>
              </div>
              <div className="ai-analysis-card">
                <h5>주요 키워드</h5>
                <div className="keyword-tags-container">
                  {aiAnalysisResults.mainKeywords?.map((keyword, index) => (<span key={index} className="keyword-tag">{keyword}</span>))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- 영상 세부 정보 섹션 --- */}
        <div className="additional-details-section">
          <h4 className="section-title">영상 세부 정보</h4>
          <div className="details-content-wrapper">
            <div className="result-item">
              <strong>설명:</strong>
              <pre className="description-text">
                {showFullDescription || !isLongDescription(descriptionText) ? descriptionText : `${descriptionText.substring(0, 200)}...`}
              </pre>
              {isLongDescription(descriptionText) && (
                <button onClick={() => setShowFullDescription(!showFullDescription)} className="toggle-description-button">
                  {showFullDescription ? '간략히 보기' : '더 보기'}
                </button>
              )}
            </div>
            {contentDetails && (
              <>
                <div className="result-item"><strong>영상 길이:</strong> {parseISODuration(contentDetails.duration)}</div>
                <div className="result-item"><strong>화질:</strong> {contentDetails.definition?.toUpperCase() || 'N/A'}</div>
                <div className="result-item"><strong>캡션:</strong> {contentDetails.caption === 'true' ? '있음' : '없음'}</div>
              </>
            )}
            {snippet?.tags?.length > 0 && (
              <div className="result-item">
                <strong>주요 태그:</strong> {snippet.tags.slice(0, 7).join(', ')}{snippet.tags.length > 7 ? `, ... (총 ${snippet.tags.length}개)` : ''}
              </div>
            )}
          </div>
        </div>

        {/* --- 영상 스크립트 섹션 --- */}
        {fullTranscript && (
          <div className="video-script-section">
            <h4 className="section-title">영상 스크립트</h4>
            {aiAnalysisResults && (
              <div className="script-summary-content">
                <h6>핵심 요약</h6>
                <ul>
                  {aiAnalysisResults.contentSummary?.summaryPoints?.map((item, index) => (
                    <li key={`summary-${index}`}>{item}</li>
                  )) || <li>요약된 핵심 내용이 없습니다.</li>}
                </ul>

                {aiAnalysisResults.keyTakeaways?.length > 0 && (
                  <>
                    <h6>주요 정보</h6>
                    <ul>
                      {aiAnalysisResults.keyTakeaways?.map((item, index) => (
                        <li key={`takeaway-${index}`}>{item}</li>
                      )) || <li>주요 정보가 없습니다.</li>}
                    </ul>
                  </>
                )}
              </div>
            )}

            <div className="script-raw-content-toggle">
              <h6>원본 스크립트 (전문)</h6>
              <div className="script-content-area">
                <pre className="full-transcript-text">
                  {showFullTranscript || !isLongTranscriptLocal(fullTranscript)
                    ? fullTranscript
                    : `${fullTranscript.substring(0, 500)}...`}
                </pre>
                {isLongTranscriptLocal(fullTranscript) && (
                  <button
                    onClick={() => setShowFullTranscript(!showFullTranscript)}
                    className="toggle-script-button"
                  >
                    {showFullTranscript ? '간략히 보기' : '전체 스크립트 보기'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </>
    );
  };

  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 렌더링(JSX) 관련 함수 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 최종 컴포넌트 JSX 리턴 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼
  return (
    <div className="vid-analysis-container">
      <header className="ai-header">
        <h1>영상 분석</h1>
        <div className="url-input-action-row">
          <input
            type="text"
            className="url-input-field"
            placeholder="분석할 영상의 URL을 입력하세요"
            value={videoUrl}
            onChange={handleInputChange}
            onKeyDown={handleInputKeyDown}
          />
          <button
            className="url-submit-button"
            onClick={handleAnalysis}
            disabled={loading}
          >
            {loading ? '분석중...' : '분석 시작'}
          </button>
        </div>
      </header>
      {error && <p className="error-message global-error-message">{error}</p>}
      <div className="results-section">
        {loading && <div className="loading-spinner"></div>}
        {!loading && !error && (analysisResults || aiAnalysisResults) && (
          <div className="analysis-results-content">
            {renderAnalysisResults()}
          </div>
        )}
        {!loading && !error && !analysisResults && !aiAnalysisResults && (
          <p className="status-message initial-message-prompt">
            분석할 영상의 URL을 입력 후 "분석 시작" 버튼을 눌러주세요.
          </p>
        )}
      </div>
    </div>
  );
  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 최종 컴포넌트 JSX 리턴 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲
};

export default VidAnalysis;
