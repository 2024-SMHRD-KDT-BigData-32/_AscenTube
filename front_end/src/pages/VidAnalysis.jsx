// src/pages/VidAnalysis.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/VidAnalysis.css';
import '../styles/pages/Ai.css';
import { MdArrowDropDown, MdArrowDropUp } from 'react-icons/md';
// [삭제] 프론트엔드에서 스크립트를 가져올 필요가 없으므로 아래 import를 삭제합니다.
// import { YoutubeTranscript } from 'youtube-transcript';


// =================================================================================
// =                            상수 및 헬퍼 함수 정의                               =
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
  const youtubeRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
};

// 그래프 Mock 데이터 관련 상수 (이 부분은 나중에 실제 데이터로 교체 예정)
const metricsOptions = [
  { key: 'views', displayName: '조회수', unit: '회' },
  { key: 'watchTime', displayName: '시청 시간 (시간)', unit: '시간' },
  { key: 'subscribers', displayName: '구독자 증감', unit: '명' },
  { key: 'impressions', displayName: '노출수', unit: '회' },
  { key: 'ctr', displayName: '노출 클릭률', unit: '%' },
];
const timePeriodOptions = [
  { key: '7d', displayName: '최근 7일', days: 7 },
  { key: '30d', displayName: '최근 30일', days: 30 },
  { key: '90d', displayName: '최근 90일', days: 90 },
];
const generateMockGraphData = (metricKey, days) => {
    // 이 함수는 그대로 유지합니다. 실제 데이터 연동 시에는 삭제되거나 변경됩니다.
    const data = []; let currentValue = 0; let dailyChange;
    switch (metricKey) {
      case 'views': currentValue = Math.random() * 1000 + 5000 * (days / 7); dailyChange = () => currentValue * (0.02 + Math.random() * 0.10); break;
      case 'watchTime': currentValue = Math.random() * 10 + 50 * (days / 7); dailyChange = () => currentValue * (0.01 + Math.random() * 0.08); break;
      case 'subscribers': currentValue = Math.random() * 5 + 20 * (days / 7); dailyChange = () => Math.floor(Math.random() * (2 + days / 15) - (1 + days / 30)); break;
      case 'impressions': currentValue = Math.random() * 10000 + 50000 * (days / 7); dailyChange = () => currentValue * (0.02 + Math.random() * 0.1); break;
      case 'ctr': currentValue = Math.random() * 2 + 3; dailyChange = () => (Math.random() - 0.4) * 0.3; break;
      default: dailyChange = () => 0;
    }
    for (let i = 0; i <= days; i++) {
      if (i === 0 && metricKey !== 'subscribers') {
        data.push({ day: i, value: parseFloat(currentValue.toFixed(metricKey === 'ctr' ? 2 : 0)) });
      } else {
        if (metricKey === 'subscribers' && i === 0) {
          data.push({ day: i, value: parseFloat(currentValue.toFixed(0)) });
        } else if (metricKey === 'subscribers') {
          currentValue += dailyChange(); data.push({ day: i, value: parseFloat(currentValue.toFixed(0)) });
        } else {
          currentValue += dailyChange(); currentValue = Math.max(0, currentValue);
          if (metricKey === 'ctr') currentValue = Math.max(0.1, Math.min(15, currentValue));
          data.push({ day: i, value: parseFloat(currentValue.toFixed(metricKey === 'ctr' ? 2 : 0)) });
        }
      }
    }
    return data;
};


// =================================================================================
// =                           VidAnalysis 메인 컴포넌트                              =
// =================================================================================

const VidAnalysis = () => {

  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 상태 관리 (State Management) ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

  const [videoUrl, setVideoUrl] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [aiAnalysisResults, setAiAnalysisResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [selectedMetric, setSelectedMetric] = useState(metricsOptions[0].key);
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(timePeriodOptions[0].key);
  const [isTimePeriodDropdownOpen, setIsTimePeriodDropdownOpen] = useState(false);
  const [currentGraphData, setCurrentGraphData] = useState([]);
  const [tooltipData, setTooltipData] = useState({ visible: false, content: [], x: 0, y: 0 });

  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 상태 관리 (State Management) ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲


  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 부가 기능 및 라이프사이클 (Helpers & Lifecycle) ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

  const isLongDescription = (text, limit = 200) => text && text.length > limit;
  const handleInputChange = (event) => setVideoUrl(event.target.value);

  // --- LocalStorage 연동: 페이지를 새로고침해도 이전 상태 유지 ---
  useEffect(() => {
    // --- 여기서부터 추가할 코드 ---
    const queryParams = new URLSearchParams(window.location.search);
    const urlFromQuery = queryParams.get('videoUrl');

    if (urlFromQuery) {
      // 주소에 URL이 있으면, 입력창에 채우고 바로 분석 시작
      setVideoUrl(urlFromQuery);
      handleAnalysis(urlFromQuery); // 수정된 handleAnalysis에 URL 직접 전달

      // URL에서 ?videoUrl=... 부분을 지워서 주소창을 깔끔하게 만듦 (선택사항)
      window.history.replaceState(null, '', window.location.pathname);
      
      // URL을 성공적으로 처리했으니, 아래 localStorage 로직은 건너뜀
      return; 
    }
    // --- 여기까지 추가할 코드 ---

    // --- 기존 코드는 그대로 둡니다 ---
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

    const persistedMetric = localStorage.getItem('vidAnalysis_selectedMetric');
    if (persistedMetric && metricsOptions.find(opt => opt.key === persistedMetric)) { setSelectedMetric(persistedMetric); }
    const persistedTimePeriod = localStorage.getItem('vidAnalysis_selectedTimePeriod');
    if (persistedTimePeriod && timePeriodOptions.find(opt => opt.key === persistedTimePeriod)) { setSelectedTimePeriod(persistedTimePeriod); }
    const persistedShowFullDesc = localStorage.getItem('vidAnalysis_showFullDescription');
    if (persistedShowFullDesc) setShowFullDescription(JSON.parse(persistedShowFullDesc));
  }, []);

  useEffect(() => { localStorage.setItem('vidAnalysis_videoUrl', videoUrl); }, [videoUrl]);
  useEffect(() => {
    if (analysisResults) localStorage.setItem('vidAnalysis_results', JSON.stringify(analysisResults));
    else localStorage.removeItem('vidAnalysis_results');
  }, [analysisResults]);
  useEffect(() => {
    if (aiAnalysisResults) localStorage.setItem('vidAnalysis_ai_results', JSON.stringify(aiAnalysisResults));
    else localStorage.removeItem('vidAnalysis_ai_results');
  }, [aiAnalysisResults]);
  useEffect(() => { localStorage.setItem('vidAnalysis_selectedMetric', selectedMetric); }, [selectedMetric]);
  useEffect(() => { localStorage.setItem('vidAnalysis_selectedTimePeriod', selectedTimePeriod); }, [selectedTimePeriod]);
  useEffect(() => { localStorage.setItem('vidAnalysis_showFullDescription', JSON.stringify(showFullDescription)); }, [showFullDescription]);

  // --- 그래프 데이터 생성 ---
  useEffect(() => {
    if (analysisResults) {
      const currentPeriod = timePeriodOptions.find(p => p.key === selectedTimePeriod);
      const daysToGenerate = currentPeriod ? currentPeriod.days : 7;
      const data = generateMockGraphData(selectedMetric, daysToGenerate);
      setCurrentGraphData(data);
    } else {
      setCurrentGraphData([]);
    }
  }, [analysisResults, selectedMetric, selectedTimePeriod]);

  const handleAnalysis = async (urlToAnalyze) => { 
    // 추가된 부분: 넘어온 URL이 있으면 그것을, 없으면 기존 state의 URL을 사용
    const finalUrl = urlToAnalyze || videoUrl;

    if (loading) return;
    setLoading(true); 
    setAnalysisResults(null); 
    setSummary(''); 
    setError(''); 
    setShowFullDescription(false);
    
    // 수정된 부분: videoUrl -> finalUrl
    if (finalUrl.trim() === '1') {
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData = mockYouTubeDataForUrl1;
      setAnalysisResults(mockData); 
      setSummary(mockAiSummaryForUrl1);
      setLoading(false); return;
    }

    // 수정된 부분: videoUrl -> finalUrl
    if (!finalUrl.startsWith('http') && !finalUrl.startsWith('https')) {
      setError('올바른 URL 형식을 입력해주세요. (예: http://... 또는 https://...)');
      setLoading(false); return;
    }
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const tempData = {
        id: 'TEMP_ID_FOR_URL',
          // 수정된 부분: videoUrl -> finalUrl
        snippet: { title: `입력 URL 분석 결과: ${finalUrl.substring(0,50)}...`, channelId: 'UC_TEMP_CHANNEL_ID_FROM_URL', channelTitle: '임시 채널', publishedAt: new Date().toISOString(), description: '일반 URL 영상 설명.', thumbnails: { medium: { url: 'https://via.placeholder.com/320x180.png?text=TempThumb' } }, tags: ['일반태그'] },
        statistics: { viewCount: Math.floor(Math.random() * 10000).toString(), likeCount: Math.floor(Math.random() * 500).toString(), commentCount: Math.floor(Math.random() * 50).toString(), },
        contentDetails: { duration: 'PT3M15S', definition: 'sd', caption: 'false' },
        status: { privacyStatus: 'public', embeddable: true, madeForKids: true }
      };
      setAnalysisResults(tempData);
      setSummary('입력된 URL에 대한 AI 요약입니다.');
    } catch (err) { setError(`분석 중 오류: ${err.message}`);
    } finally { setLoading(false); }
  };


  const handleInputKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      handleAnalysis();
    }
  };

  // ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 핵심 로직: AI 분석 핸들러 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

  // ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 렌더링(JSX) 관련 함수 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

  const handleMetricChange = (metricKey) => { setSelectedMetric(metricKey); setIsMetricDropdownOpen(false); };
  const handleTimePeriodChange = (timePeriodKey) => { setSelectedTimePeriod(timePeriodKey); setIsTimePeriodDropdownOpen(false); };
  const getMetricDisplayNameAndUnit = (metricKey) => metricsOptions.find(opt => opt.key === metricKey)?.displayName || '';
  const getTimePeriodDisplayName = (timePeriodKey) => timePeriodOptions.find(opt => opt.key === timePeriodKey)?.displayName || '';
  const handleGraphPointMouseOver = (event, dataPoint, metricInfo) => { };
  const handleGraphPointMouseOut = () => { setTooltipData(prev => ({ ...prev, visible: false })); };
  const renderLineGraph = useCallback((data, metricKey) => { return <div>그래프 영역</div> }, [tooltipData]);

  /**
   * 분석 결과를 화면에 그리는 메인 렌더링 함수
   */
  const renderAnalysisResults = () => {
    if (!analysisResults || !aiAnalysisResults) return null;

    const { snippet, statistics, contentDetails, status: videoStatus, id } = analysisResults;
    const descriptionText = snippet?.description || '';

    return (
      <>
        {/* --- 영상 기본 정보 섹션 --- */}
        {analysisResults && (
          <div className="top-content-wrapper reversed">
            <div className="video-main-info-col">
              <h4 className="video-title-main">{snippet?.title || '제목 정보 없음'}</h4>
              <div className="video-meta-and-vital-info">
                <div className="video-meta-details">
                  {snippet?.thumbnails?.medium && (<div className="thumbnail-container-compact"><img className="analysis-thumbnail main-thumbnail" src={snippet.thumbnails.medium.url} alt="영상 썸네일" /></div>)}
                  <div className="text-meta-info">
                    <div className="result-item channel-name-item"><strong>채널명:</strong> <span>{snippet?.channelTitle || 'N/A'}</span>{snippet?.channelId && (<Link to={`/channel/${snippet.channelId}`} className="channel-analysis-link text-link" title="채널 분석 페이지로 이동">채널분석</Link>)}</div>
                    <div className="result-item"><strong>업로드:</strong> {snippet?.publishedAt ? new Date(snippet.publishedAt).toLocaleString('ko-KR') : 'N/A'}</div>
                    <div className="result-item"><strong>영상 ID:</strong> {id || 'N/A'}</div>
                  </div>
                </div>
                <div className="inline-stats-status-section">
                  {statistics && (<div className="inline-box statistics-inline-box compact-box"><h6>주요 통계</h6><div className="result-item"><strong>조회수:</strong> {Number(statistics.viewCount || 0).toLocaleString()}회</div><div className="result-item"><strong>좋아요:</strong> {Number(statistics.likeCount || 0).toLocaleString()}개</div><div className="result-item"><strong>댓글수:</strong> {Number(statistics.commentCount || 0).toLocaleString()}개</div></div>)}
                  {videoStatus && (<div className="inline-box status-inline-box compact-box"><h6>상태 및 공개</h6><div className="result-item"><strong>공개:</strong> {videoStatus.privacyStatus || 'N/A'}</div><div className="result-item"><strong>임베드:</strong> {videoStatus.embeddable ? '가능' : '불가능'}</div><div className="result-item"><strong>아동용:</strong> {videoStatus.madeForKids ? '예' : '아니오'}</div></div>)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- AI 영상 분석 결과 패널 --- */}
        {aiAnalysisResults && (
          <div className="ai-summary-panel">
            <h5>AI 콘텐츠 분석 결과</h5>
            <div className="analysis-section-inner">
              <h6>📖 콘텐츠 프로필</h6>
              <ul>
                <li><strong>핵심 요약:</strong> {aiAnalysisResults.contentProfile?.coreSummary || 'N/A'}</li>
                <li><strong>주요 테마:</strong> {aiAnalysisResults.contentProfile?.keyTheme || 'N/A'}</li>
                <li><strong>타겟 시청자:</strong> {aiAnalysisResults.contentProfile?.assumedTargetAudience || 'N/A'}</li>
              </ul>
            </div>
            <div className="analysis-section-inner">
              <h6>- 서사 구조</h6>
              <ul>
                <li><strong>도입부:</strong> {aiAnalysisResults.narrativeStructure?.introduction || 'N/A'}</li>
                <li><strong>전개:</strong> {aiAnalysisResults.narrativeStructure?.development || 'N/A'}</li>
                <li><strong>결론:</strong> {aiAnalysisResults.narrativeStructure?.conclusion || 'N/A'}</li>
              </ul>
            </div>
            <div className="analysis-section-inner">
              <h6>🔑 핵심 정보 (Key Takeaways)</h6>
              <ul>
                {aiAnalysisResults.keyTakeaways?.map((item, index) => (<li key={index}>{item}</li>))}
              </ul>
            </div>
            <div className="analysis-section-inner">
              <h6>🏷️ 주요 키워드</h6>
              <div className="keyword-tags-container">
                {aiAnalysisResults.mainKeywords?.map((keyword, index) => (<span key={index} className="keyword-tag">{keyword}</span>))}
              </div>
            </div>
          </div>
        )}

        {/* --- 영상 세부 정보 섹션 --- */}
        {analysisResults && (
          <div className="additional-details-section">
            <div className="result-category content-extended-details">
              <div className="description-and-details-wrapper">
                <h5>영상 세부 정보</h5>
                {snippet?.description && (<div className="result-item description"><strong>설명:</strong><pre className="description-condensed">{showFullDescription || !isLongDescription(descriptionText) ? descriptionText : `${descriptionText.substring(0, 200)}...`}</pre>{isLongDescription(descriptionText) && (<button onClick={() => setShowFullDescription(!showFullDescription)} className="toggle-description-button">{showFullDescription ? '간략히 보기' : '더 보기'}</button>)}</div>)}
                {contentDetails && (<><div className="result-item"><strong>영상 길이:</strong> {parseISODuration(contentDetails.duration)}</div><div className="result-item"><strong>화질:</strong> {contentDetails.definition?.toUpperCase() || 'N/A'}</div><div className="result-item"><strong>캡션:</strong> {contentDetails.caption === 'true' ? '있음' : '없음'}</div></>)}
                {snippet?.tags?.length > 0 && (<div className="result-item"><strong>주요 태그:</strong> {snippet.tags.slice(0, 7).join(', ')}{snippet.tags.length > 7 ? `, ... (총 ${snippet.tags.length}개)` : ''}</div>)}
              </div>
              <div className="api-graph-panel-wrapper">
                <div className="graph-header-controls">
                  <h6>주요 지표 변화 추이</h6>
                  <div className="selectors-container">
                    <div className="metric-selector-dropdown time-period-selector">
                      <button onClick={() => setIsTimePeriodDropdownOpen(!isTimePeriodDropdownOpen)} className="dropdown-toggle-button">{getTimePeriodDisplayName(selectedTimePeriod)}{isTimePeriodDropdownOpen ? <MdArrowDropUp /> : <MdArrowDropDown />}</button>
                      {isTimePeriodDropdownOpen && (<ul className="dropdown-menu-list">{timePeriodOptions.map(opt => (<li key={opt.key} onClick={() => handleTimePeriodChange(opt.key)} className={selectedTimePeriod === opt.key ? 'active' : ''}>{opt.displayName}</li>))}</ul>)}
                    </div>
                    <div className="metric-selector-dropdown">
                      <button onClick={() => setIsMetricDropdownOpen(!isMetricDropdownOpen)} className="dropdown-toggle-button">{getMetricDisplayNameAndUnit(selectedMetric)}{isMetricDropdownOpen ? <MdArrowDropUp /> : <MdArrowDropDown />}</button>
                      {isMetricDropdownOpen && (<ul className="dropdown-menu-list">{metricsOptions.map(opt => (<li key={opt.key} onClick={() => handleMetricChange(opt.key)} className={selectedMetric === opt.key ? 'active' : ''}>{opt.displayName}</li>))}</ul>)}
                    </div>
                  </div>
                </div>
                <div className="line-graph-render-area">
                  {currentGraphData.length > 0 ? renderLineGraph(currentGraphData, selectedMetric) : <p className="graph-no-data">표시할 데이터가 없습니다.</p>}
                </div>
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
        {loading && <p className="status-message">결과를 분석 중입니다...</p>}
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