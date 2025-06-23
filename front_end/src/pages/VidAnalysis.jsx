import React, { useState, useEffect, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { fetchVideoAnalysis } from '../api/VidAnalysisApi'; // 리팩토링된 API 함수 import
import PageLayout from '../layouts/PageLayout';
import '../styles/pages/VidAnalysis.css';
import '../styles/pages/Ai.css';
import { FiThumbsUp, FiMessageSquare, FiPlay } from 'react-icons/fi';

// --- 헬퍼 함수들 ---

const parseISODuration = (isoDuration) => {
  if (!isoDuration) return 'N/A';
  const regex = /PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/;
  const matches = isoDuration.match(regex);
  if (!matches) return isoDuration;
  const hours = matches[1] ? parseInt(matches[1], 10) : 0;
  const minutes = matches[2] ? parseInt(matches[2], 10) : 0;
  const seconds = matches[3] ? parseInt(matches[3], 10) : 0;
  let formatted = '';
  if (hours > 0) { formatted += `${hours}시간 `; }
  if (minutes > 0) { formatted += `${minutes}분 `; }
  if (seconds > 0 || (hours === 0 && minutes === 0 && seconds === 0)) { formatted += `${seconds}초`; }
  return formatted.trim() || '정보 없음';
};

const formatFullDateTime = (timestamp) => {
  if (!timestamp) return '날짜 정보 없음';
  const actualTimestamp = timestamp.value !== undefined ? timestamp.value : timestamp;
  try {
    const date = new Date(actualTimestamp);
    if (isNaN(date.getTime())) {
      console.error("유효하지 않은 타임스탬프 값:", actualTimestamp);
      return '날짜 형식 오류';
    }
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  } catch (e) {
    console.error("날짜 포맷팅 중 에러:", e);
    return '날짜 형식 오류';
  }
};

const extractVideoId = (url) => {
  const youtubeRegex = /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/i;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
};


// --- 메인 컴포넌트 ---

const VidAnalysis = () => {
    const [videoUrl, setVideoUrl] = useState('');
    const [analysisResults, setAnalysisResults] = useState(null);
    const [aiAnalysisResults, setAiAnalysisResults] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [fullTranscript, setFullTranscript] = useState('');
    const [showFullTranscript, setShowFullTranscript] = useState(false);
    const [isInitialAnalysisTriggered, setIsInitialAnalysisTriggered] = useState(false);

    const location = useLocation();

    const handleAnalysis = useCallback(async () => {
        if (loading) return;

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
            const data = await fetchVideoAnalysis(videoId, token);
            if (data && data.videoInfo && data.aiAnalysis) {
                setAnalysisResults(data.videoInfo);
                setAiAnalysisResults(data.aiAnalysis);
                setFullTranscript(data.fullTranscript || '');
            } else {
                throw new Error("백엔드로부터 받은 데이터 형식이 올바르지 않습니다.");
            }
        } catch (err) {
            console.error("분석 중 오류:", err);
            setError(`분석 중 오류: ${err.message}`);
            setAnalysisResults(null);
            setAiAnalysisResults(null);
            setFullTranscript('');
            setShowFullTranscript(false);
        } finally {
            setLoading(false);
        }
    }, [loading, videoUrl]);

    const isLongDescription = (text, limit = 200) => text && text.length > limit;
    const isLongTranscript = (text, limit = 500) => text && text.length > limit;

    const handleInputChange = (event) => {
        setVideoUrl(event.target.value);
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
        
        const persistedShowFullTranscript = localStorage.getItem('vidAnalysis_showFullTranscript');
        if (persistedShowFullTranscript !== null) {
            setShowFullTranscript(JSON.parse(persistedShowFullTranscript));
        }
        const persistedShowFullDesc = localStorage.getItem('vidAnalysis_showFullDescription');
        if (persistedShowFullDesc !== null) {
            setShowFullDescription(JSON.parse(persistedShowFullDesc));
        }
    }, []);

    useEffect(() => {
        const queryParams = new URLSearchParams(location.search);
        const urlVideoId = queryParams.get('videoId');

        if (urlVideoId) {
            const fullYoutubeUrl = `https://www.youtube.com/watch?v=${urlVideoId}`;
            const currentVideoIdInState = extractVideoId(videoUrl);

            if (urlVideoId !== currentVideoIdInState || !isInitialAnalysisTriggered) {
                setVideoUrl(fullYoutubeUrl);
                setIsInitialAnalysisTriggered(true);
            }
        } else if (!urlVideoId && isInitialAnalysisTriggered) {
            setIsInitialAnalysisTriggered(false);
        }
    }, [location.search, videoUrl, isInitialAnalysisTriggered]);

    useEffect(() => {
        if (isInitialAnalysisTriggered && videoUrl && !loading) {
            const currentVideoId = extractVideoId(videoUrl);
            const analyzedVideoId = analysisResults ? analysisResults.id : null;

            if (currentVideoId && currentVideoId !== analyzedVideoId) {
                handleAnalysis();
            } else if (isInitialAnalysisTriggered && !analysisResults && !error) {
                handleAnalysis();
            }
        }
    }, [videoUrl, isInitialAnalysisTriggered, loading, analysisResults, error, handleAnalysis]);

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


    const renderAnalysisResults = () => {
        if (!analysisResults) return null;

        const { snippet, statistics, contentDetails, id } = analysisResults;
        const descriptionText = snippet?.description || '';
        const videoLink = `https://www.youtube.com/watch?v=${id}`;

        return (
            <>
                <div className="page-section video-header-section">
                    <a href={videoLink} target="_blank" rel="noopener noreferrer" className="thumbnail-link">
                        <img className="analysis-thumbnail" src={snippet?.thumbnails?.medium?.url} alt="영상 썸네일" />
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
                                {formatFullDateTime(snippet?.publishedAt)}
                            </span>
                        </div>
                        <div className="video-stats-inline">
                            <span className="stat-item"><FiPlay className="stat-icon" /> 조회수 {Number(statistics.viewCount || 0).toLocaleString()}회</span>
                            <span className="stat-item"><FiThumbsUp className="stat-icon" /> 좋아요 {Number(statistics.likeCount || 0).toLocaleString()}개</span>
                            <span className="stat-item"><FiMessageSquare className="stat-icon" /> 댓글 {Number(statistics.commentCount || 0).toLocaleString()}개</span>
                        </div>
                    </div>
                </div>
                {aiAnalysisResults && (
                    <div className="page-section ai-analysis-container">
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
                                            ))}
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
                <div className="page-section additional-details-section">
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
                {fullTranscript && (
                  <div className="page-section video-script-section">
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
                          {showFullTranscript || !isLongTranscript(fullTranscript)
                            ? fullTranscript
                            : `${fullTranscript.substring(0, 500)}...`}
                        </pre>
                        {isLongTranscript(fullTranscript) && (
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

    return (
        <PageLayout title="영상 분석" searchPlaceholder="분석할 영상의 URL을 입력하세요...">
            <div className="vid-analysis-page">
                <div className="page-section url-analysis-section">
                    <div className="url-input-action-group">
                        <input
                            type="text"
                            className="url-input-field"
                            placeholder="분석할 영상의 URL을 입력하세요..."
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
                </div>
                {error && <p className="page-section error-message global-error-message">{error}</p>}
                <div className="results-section">
                    {loading && <div className="loading-spinner"></div>}
                    {!loading && !error && (analysisResults || aiAnalysisResults) && (
                        <div className="analysis-results-content">
                            {renderAnalysisResults()}
                        </div>
                    )}
                    {!loading && !error && !analysisResults && !aiAnalysisResults && (
                        <p className="page-section status-message initial-message-prompt">
                            분석할 영상의 URL을 입력 후 "분석 시작" 버튼을 눌러주세요.
                        </p>
                    )}
                </div>
            </div>
        </PageLayout>
    );
};

export default VidAnalysis;