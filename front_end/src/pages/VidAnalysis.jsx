import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import '../styles/pages/VidAnalysis.css';
import { MdArrowDropDown, MdArrowDropUp } from 'react-icons/md';

// --- Helper Functions, Mock Data, metricsOptions, timePeriodOptions (이전과 동일) ---
const parseISODuration = (isoDuration) => { /* ... */
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
const mockYouTubeDataForUrl1 = { /* ... 이전 Mock Data ... */
  id: 'VIDEO_ID_SPECIAL_1',
  snippet: {
    publishedAt: '2025-01-01T12:00:00Z', channelId: 'UC_SPECIAL_CHANNEL_ID', title: 'URL "1" 입력 시 특수 더미 영상',
    description: '이 영상은 URL 입력 필드에 "1"을 입력했을 때 표시되는 상세 더미 데이터입니다.\nYouTube Data API v3에서 제공하는 다양한 필드를 포함하고 있으며, UI 테스트 및 기능 검증을 목적으로 합니다.\n\n주요 특징:\n- 다양한 정보 포함\n- 테스트용 데이터\n\n추가 설명: 이 설명은 매우 길어질 수 있으며, 화면에 어떻게 표시되는지 테스트하기 위함입니다. 필요하다면 요약되어 보이거나, "더보기" 기능을 통해 전체 내용을 볼 수 있도록 처리할 수 있습니다. 사용자의 요청에 따라 핵심적인 내용만 간추려 표시하는 것이 중요합니다.',
    thumbnails: { default: { url: 'https://via.placeholder.com/120x90.png?text=DefaultThumb', width: 120, height: 90 }, medium: { url: 'https://via.placeholder.com/320x180.png?text=%EC%98%81%EC%83%81+%EC%8D%B8%EB%84%A4%EC%9D%BC', width: 320, height: 180 }, high: { url: 'https://via.placeholder.com/480x360.png?text=HighThumb', width: 480, height: 360 }, },
    channelTitle: '더미 데이터 채널', tags: ['더미', '테스트', 'URL_1', 'YouTube API', '종합분석', '핵심요약', 'UI테스트'], categoryId: '27', liveBroadcastContent: 'none', defaultLanguage: 'ko',
    localized: { title: 'URL "1" 입력 시 특수 더미 영상 (한국어)', description: '이 영상은 URL 입력 필드에 "1"을 입력했을 때 표시되는 상세 더미 데이터입니다. (한국어 설명)', }, defaultAudioLanguage: 'ko',
  },
  statistics: { viewCount: '12345678', likeCount: '99999', favoriteCount: '0', commentCount: '1500', },
  contentDetails: { duration: 'PT12M30S', dimension: '2d', definition: 'hd', caption: 'true', licensedContent: true, regionRestriction: { allowed: ['KR', 'US', 'JP'], }, projection: 'rectangular', },
  status: { uploadStatus: 'processed', privacyStatus: 'public', license: 'youtube', embeddable: true, publicStatsViewable: true, madeForKids: false, },
};
const mockAiSummaryForUrl1 = `이 영상은 URL "1" 테스트를 위한 특별 더미 콘텐츠입니다. 사용자의 요청에 따라 AI 요약이 화면의 핵심 요소로 부각되도록 디자인되었습니다. 이 요약은 영상의 주요 내용, 목적, 그리고 시청자에게 전달하고자 하는 핵심 메시지를 간결하게 전달하는 데 중점을 둡니다. \n\n주요 특징:\n- 핵심 내용 요약: 영상의 핵심 주제와 주요 포인트를 명확하게 요약합니다.\n- 시청자 가치: 이 영상을 통해 시청자가 얻을 수 있는 가치나 정보를 강조합니다.\n- 간결성: 불필요한 세부 정보는 생략하고, 중요한 내용만 전달하여 사용자가 빠르게 영상의 가치를 판단할 수 있도록 돕습니다.\n\n이 AI 요약은 영상 콘텐츠의 접근성을 높이고 사용자의 시청 결정을 지원하는 중요한 역할을 합니다. 따라서 페이지 디자인에서 가장 잘 보이는 위치에, 충분한 공간을 할애하여 제공되는 것이 바람직합니다.`;

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
const generateMockGraphData = (metricKey, days) => { /* ... 이전과 동일 ... */
  const data = []; let currentValue = 0; let dailyChange;
  switch (metricKey) {
    case 'views': currentValue = Math.random() * 1000 + 5000 * (days / 7); dailyChange = () => currentValue * (0.02 + Math.random() * 0.10); break;
    case 'watchTime': currentValue = Math.random() * 10 + 50 * (days / 7); dailyChange = () => currentValue * (0.01 + Math.random() * 0.08); break;
    case 'subscribers': currentValue = Math.random() * 5 + 20 * (days / 7); dailyChange = () => Math.floor(Math.random() * (2 + days/15) - (1+days/30)); break;
    case 'impressions': currentValue = Math.random() * 10000 + 50000 * (days / 7); dailyChange = () => currentValue * (0.02 + Math.random() * 0.1); break;
    case 'ctr': currentValue = Math.random() * 2 + 3; dailyChange = () => (Math.random() - 0.4) * 0.3; break;
    default: dailyChange = () => 0;
  }
  for (let i = 0; i <= days; i++) {
    if (i === 0 && metricKey !== 'subscribers') { data.push({ day: i, value: parseFloat(currentValue.toFixed(metricKey === 'ctr' ? 2 : 0)) });
    } else {
      if (metricKey === 'subscribers' && i === 0) { data.push({ day: i, value: parseFloat(currentValue.toFixed(0)) });
      } else if (metricKey === 'subscribers') { currentValue += dailyChange(); data.push({ day: i, value: parseFloat(currentValue.toFixed(0)) });
      } else { currentValue += dailyChange(); currentValue = Math.max(0, currentValue);
        if (metricKey === 'ctr') currentValue = Math.max(0.1, Math.min(15, currentValue));
        data.push({ day: i, value: parseFloat(currentValue.toFixed(metricKey === 'ctr' ? 2 : 0)) });
      }
    }
  }
  return data;
};

const VidAnalysis = () => {
  // 초기 상태값 설정 시 localStorage에서 값을 읽어오도록 함수를 사용할 수 있습니다.
  // 또는 useEffect에서 마운트 시 한 번만 설정합니다. 여기서는 후자를 사용합니다.
  const [videoUrl, setVideoUrl] = useState('');
  const [analysisResults, setAnalysisResults] = useState(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showFullDescription, setShowFullDescription] = useState(false);

  const [selectedMetric, setSelectedMetric] = useState(metricsOptions[0].key);
  const [isMetricDropdownOpen, setIsMetricDropdownOpen] = useState(false);
  const [selectedTimePeriod, setSelectedTimePeriod] = useState(timePeriodOptions[0].key);
  const [isTimePeriodDropdownOpen, setIsTimePeriodDropdownOpen] = useState(false);
  const [currentGraphData, setCurrentGraphData] = useState([]);
  const [tooltipData, setTooltipData] = useState({ visible: false, content: [], x: 0, y: 0 });

  const isLongDescription = (text, limit = 200) => text && text.length > limit;
  const handleInputChange = (event) => setVideoUrl(event.target.value);

  // 1. localStorage에서 상태 불러오기 (컴포넌트 마운트 시)
  useEffect(() => {
    const persistedVideoUrl = localStorage.getItem('vidAnalysis_videoUrl');
    if (persistedVideoUrl) setVideoUrl(persistedVideoUrl);

    const persistedResults = localStorage.getItem('vidAnalysis_results');
    if (persistedResults) {
      try {
        setAnalysisResults(JSON.parse(persistedResults));
      } catch (e) {
        console.error("저장된 분석 결과 파싱 오류:", e);
        localStorage.removeItem('vidAnalysis_results');
      }
    }

    const persistedSummary = localStorage.getItem('vidAnalysis_summary');
    if (persistedSummary) setSummary(persistedSummary);

    const persistedMetric = localStorage.getItem('vidAnalysis_selectedMetric');
    if (persistedMetric && metricsOptions.find(opt => opt.key === persistedMetric)) {
      setSelectedMetric(persistedMetric);
    }

    const persistedTimePeriod = localStorage.getItem('vidAnalysis_selectedTimePeriod');
    if (persistedTimePeriod && timePeriodOptions.find(opt => opt.key === persistedTimePeriod)) {
      setSelectedTimePeriod(persistedTimePeriod);
    }

    const persistedShowFullDesc = localStorage.getItem('vidAnalysis_showFullDescription');
    if (persistedShowFullDesc) setShowFullDescription(JSON.parse(persistedShowFullDesc));
  }, []); // 빈 배열: 마운트 시 한 번만 실행

  // 2. 상태 변경 시 localStorage에 저장
  useEffect(() => { localStorage.setItem('vidAnalysis_videoUrl', videoUrl); }, [videoUrl]);
  useEffect(() => {
    if (analysisResults) {
      localStorage.setItem('vidAnalysis_results', JSON.stringify(analysisResults));
    } else { // analysisResults가 null이면 저장된 값도 제거 (선택적)
      localStorage.removeItem('vidAnalysis_results');
    }
  }, [analysisResults]);
  useEffect(() => { localStorage.setItem('vidAnalysis_summary', summary); }, [summary]);
  useEffect(() => { localStorage.setItem('vidAnalysis_selectedMetric', selectedMetric); }, [selectedMetric]);
  useEffect(() => { localStorage.setItem('vidAnalysis_selectedTimePeriod', selectedTimePeriod); }, [selectedTimePeriod]);
  useEffect(() => { localStorage.setItem('vidAnalysis_showFullDescription', JSON.stringify(showFullDescription)); }, [showFullDescription]);


  // 그래프 데이터 생성 useEffect (이전과 동일, selectedTimePeriod가 복원된 후 실행됨)
  useEffect(() => {
    if (analysisResults || videoUrl.trim() === '1') {
        const currentPeriod = timePeriodOptions.find(p => p.key === selectedTimePeriod);
        const daysToGenerate = currentPeriod ? currentPeriod.days : 7;
        // analysisResults가 아직 localStorage에서 로드 중일 수 있으므로,
        // videoUrl이 '1'이 아니고 analysisResults가 아직 null이면 그래프 데이터 생성을 보류할 수 있습니다.
        // 또는, analysisResults가 확실히 로드된 후에 이 로직이 실행되도록 추가적인 조건 검토 가능.
        // 현재는 analysisResults가 null이어도 videoUrl이 '1'이면 생성됩니다.
        if (videoUrl.trim() === '1' || analysisResults) {
             const data = generateMockGraphData(selectedMetric, daysToGenerate);
             setCurrentGraphData(data);
        }
    } else {
        setCurrentGraphData([]);
    }
  }, [analysisResults, selectedMetric, selectedTimePeriod, videoUrl]); // videoUrl 추가

  const handleAnalysis = async () => { 
    if (loading) return;
    setLoading(true); 
    // 분석 시작 시, 이전 결과를 명시적으로 null로 설정하여 localStorage에서도 제거되도록 유도
    setAnalysisResults(null); 
    setSummary(''); 
    setError(''); 
    setShowFullDescription(false);
    // localStorage.removeItem('vidAnalysis_results'); // 더 확실하게 하려면 여기서 직접 제거
    // localStorage.removeItem('vidAnalysis_summary');

    if (videoUrl.trim() === '1') {
      await new Promise(resolve => setTimeout(resolve, 500));
      const mockData = mockYouTubeDataForUrl1; // 임시 변수에 할당
      setAnalysisResults(mockData); 
      setSummary(mockAiSummaryForUrl1);
      setLoading(false); return;
    }
    if (!videoUrl.startsWith('http') && !videoUrl.startsWith('https')) {
      setError('올바른 URL 형식을 입력해주세요. (예: http://... 또는 https://...)');
      setLoading(false); return;
    }
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      const tempData = { /* ... 이전 임시 데이터 ... */
        id: 'TEMP_ID_FOR_URL',
        snippet: { title: `입력 URL 분석 결과: ${videoUrl.substring(0,50)}...`, channelId: 'UC_TEMP_CHANNEL_ID_FROM_URL', channelTitle: '임시 채널', publishedAt: new Date().toISOString(), description: '일반 URL 영상 설명.', thumbnails: { medium: { url: 'https://via.placeholder.com/320x180.png?text=TempThumb' } }, tags: ['일반태그'] },
        statistics: { viewCount: Math.floor(Math.random() * 10000).toString(), likeCount: Math.floor(Math.random() * 500).toString(), commentCount: Math.floor(Math.random() * 50).toString(), },
        contentDetails: { duration: 'PT3M15S', definition: 'sd', caption: 'false' },
        status: { privacyStatus: 'public', embeddable: true, madeForKids: true }
      };
      setAnalysisResults(tempData);
      setSummary('입력된 URL에 대한 AI 요약입니다.');
    } catch (err) { setError(`분석 중 오류: ${err.message}`);
    } finally { setLoading(false); }
  };

  const handleInputKeyDown = (event) => { /* ... 이전과 동일 ... */
    if (event.key === 'Enter') {
      event.preventDefault(); 
      handleAnalysis();
    }
  };
  const handleMetricChange = (metricKey) => { setSelectedMetric(metricKey); setIsMetricDropdownOpen(false); };
  const handleTimePeriodChange = (timePeriodKey) => { setSelectedTimePeriod(timePeriodKey); setIsTimePeriodDropdownOpen(false); };
  const getMetricDisplayNameAndUnit = (metricKey) => metricsOptions.find(opt => opt.key === metricKey)?.displayName || '';
  const getTimePeriodDisplayName = (timePeriodKey) => timePeriodOptions.find(opt => opt.key === timePeriodKey)?.displayName || '';
  const handleGraphPointMouseOver = (event, dataPoint, metricInfo) => { /* ... 이전과 동일 ... */
    setTooltipData({
      visible: true,
      content: [ `날짜: ${dataPoint.day}일차`, `${metricInfo.displayName}`, `${dataPoint.value.toLocaleString()} ${metricInfo.unit || ''}` ],
      x: parseFloat(event.target.getAttribute('cx')), y: parseFloat(event.target.getAttribute('cy')),
    });
  };
  const handleGraphPointMouseOut = () => { setTooltipData(prev => ({ ...prev, visible: false })); };
  const renderLineGraph = useCallback((data, metricKey) => { /* ... 이전 SVG 그래프 로직과 툴팁 렌더링 (색상 복원됨) ... */
    if (!data || data.length === 0) return <p className="graph-no-data">그래프 데이터를 불러올 수 없거나 데이터가 없습니다.</p>;
    const metricInfo = metricsOptions.find(opt => opt.key === metricKey);
    const svgWidth = 500, svgHeight = 300; const padding = 40;
    const chartWidth = svgWidth - padding * 2, chartHeight = svgHeight - padding * 2;
    const maxValue = Math.max(...data.map(d => d.value), 0);
    let yMax = maxValue;
    let yMin = metricKey === 'subscribers' ? Math.min(...data.map(d=>d.value)) : 0;
     if (data.every(d => d.value === data[0].value)) {
        yMax = data[0].value + (data[0].value === 0 ? 10 : Math.abs(data[0].value * 0.5));
        yMin = data[0].value - (data[0].value === 0 ? 10 : Math.abs(data[0].value * 0.5));
        if (metricKey !== 'subscribers' && yMin < 0) yMin = 0;
    }
    if (metricKey === 'subscribers') {
        const rangeAbs = Math.abs(yMax - yMin);
        yMax = yMax + rangeAbs * 0.1; yMin = yMin - rangeAbs * 0.1;
        if (yMax === yMin && yMax === 0) { yMax = 5; yMin = -5;}
        else if (yMax === yMin) {yMax = yMax + Math.abs(yMax*0.1) +1; yMin = yMin - Math.abs(yMin*0.1)-1;}
    } else if (yMin === yMax) {
        yMax = yMax + (yMax === 0 ? 10 : Math.abs(yMax * 0.2));
        yMin = yMin > 0 ? yMin - Math.abs(yMin * 0.2) : 0;
        if (yMin < 0) yMin =0;
    }

    const points = data.map(d => {
      const x = (d.day / (data.length -1)) * chartWidth + padding;
      const yVal = d.value; const yRange = yMax - yMin;
      const yPercentage = yRange === 0 ? 0.5 : (yVal - yMin) / yRange;
      const y = chartHeight - (yPercentage * chartHeight) + padding;
      return `${x},${y}`;
    }).join(' ');

    const yAxisTicks = []; const numTicks = 4;
    if ((yMax - yMin) !== 0) {
        for (let i = 0; i <= numTicks; i++) {
            const tickValue = yMin + (i / numTicks) * (yMax - yMin);
            const yPos = chartHeight - (i / numTicks) * chartHeight + padding;
            yAxisTicks.push({ value: tickValue, y: yPos });
        }
    } else { yAxisTicks.push({value: yMax, y: padding + chartHeight / 2}); }
    
    const xAxisLabels = []; const numDays = data.length -1; let labelInterval = 1;
    if (numDays > 10 && numDays <=30) labelInterval = 5;
    else if (numDays > 30) labelInterval = Math.ceil(numDays / 7);
    data.forEach((d, i) => { if (i === 0 || i === numDays || i % labelInterval === 0 ) { xAxisLabels.push(d); } });

    return (
      <svg width="100%" height="100%" viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="line-graph-svg" preserveAspectRatio="xMidYMid meet">
        <line x1={padding} y1={padding} x2={padding} y2={chartHeight + padding} stroke="#ccc" />
        {yAxisTicks.map((tick, i) => ( <g key={`y-tick-${i}`}> <line x1={padding - 5} y1={tick.y} x2={padding} y2={tick.y} stroke="#ccc" /> <text x={padding - 10} y={tick.y + 4} textAnchor="end" fontSize="10" fill="#666">{metricInfo?.key === 'ctr' ? tick.value.toFixed(1) : Math.round(tick.value).toLocaleString()}</text></g>))}
        <line x1={padding} y1={chartHeight + padding} x2={chartWidth + padding} y2={chartHeight + padding} stroke="#ccc" />
        {xAxisLabels.map((d) => (<g key={`x-tick-${d.day}`}><line x1={(d.day / numDays) * chartWidth + padding} y1={chartHeight + padding} x2={(d.day / numDays) * chartWidth + padding} y2={chartHeight + padding + 5} stroke="#ccc" /><text x={(d.day / numDays) * chartWidth + padding} y={chartHeight + padding + 15} textAnchor="middle" fontSize="10" fill="#666">{`${d.day}일`}</text></g>))}
        <polyline points={points} fill="none" stroke="#007bff" strokeWidth="2" /> {/* 컬러풀 테마 색상 */}
        {data.map((d,i) => {
             const x = (d.day / numDays) * chartWidth + padding; const yVal = d.value; const yRange = yMax - yMin;
             const yPercentage = yRange === 0 ? 0.5 : (yVal - yMin) / yRange; const y = chartHeight - (yPercentage * chartHeight) + padding;
             return ( <circle key={`point-${i}`} cx={x} cy={y} r="4" fill="#007bff" stroke="#fff" strokeWidth="1.5" onMouseOver={(e) => handleGraphPointMouseOver(e, d, metricInfo)} onMouseOut={handleGraphPointMouseOut} className="graph-data-point"/> );
        })}
        {tooltipData.visible && (<g transform={`translate(${tooltipData.x}, ${tooltipData.y - 10})`} className="graph-tooltip"><rect className="graph-tooltip-rect" x={-tooltipData.content.reduce((max, line) => Math.max(max, line.length), 0) * 3 -10} y="-45" width={tooltipData.content.reduce((max, line) => Math.max(max, line.length), 0) * 6 + 20} height="40" rx="3" /><text className="graph-tooltip-text" x="0" y="-35" textAnchor="middle">{tooltipData.content[0]}</text><text className="graph-tooltip-text" x="0" y="-23" textAnchor="middle">{tooltipData.content[1]}</text><text className="graph-tooltip-text value" x="0" y="-11" textAnchor="middle">{tooltipData.content[2]}</text></g>)}
      </svg>
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tooltipData]); // tooltipData가 변경될 때도 그래프가 다시 그려져야 툴팁이 정상적으로 표시/숨김 처리됨

  const renderAnalysisResults = () => { /* ... 이전과 동일 ... */
    if (!analysisResults) return null;
    const { snippet, statistics, contentDetails, status, id } = analysisResults;
    const descriptionText = snippet?.description || '';
    
    return (
      <>
        <div className="top-content-wrapper reversed">
          <div className="ai-summary-panel"><h5>AI 생성 요약 (핵심)</h5><p>{summary || 'AI 요약 정보가 없습니다.'}</p></div>
          <div className="video-main-info-col">
            <h4 className="video-title-main">{snippet?.title || '제목 정보 없음'}</h4>
            <div className="video-meta-and-vital-info">
              <div className="video-meta-details">
                {snippet?.thumbnails?.medium && (<div className="thumbnail-container-compact"><img className="analysis-thumbnail main-thumbnail" src={snippet.thumbnails.medium.url} alt="영상 썸네일"/></div>)}
                <div className="text-meta-info">
                  <div className="result-item channel-name-item"><strong>채널명:</strong> <span>{snippet?.channelTitle || 'N/A'}</span>{snippet?.channelId && (<Link to={`/channel/${snippet.channelId}`} className="channel-analysis-link text-link" title="채널 분석 페이지로 이동">채널분석</Link>)}</div>
                  <div className="result-item"><strong>게시일:</strong> {snippet?.publishedAt ? new Date(snippet.publishedAt).toLocaleString('ko-KR') : 'N/A'}</div>
                  <div className="result-item"><strong>영상 ID:</strong> {id || 'N/A'}</div>
                </div>
              </div>
              <div className="inline-stats-status-section">
                {statistics && (<div className="inline-box statistics-inline-box compact-box"><h6>주요 통계</h6><div className="result-item"><strong>조회수:</strong> {Number(statistics.viewCount || 0).toLocaleString()}회</div><div className="result-item"><strong>좋아요:</strong> {Number(statistics.likeCount || 0).toLocaleString()}개</div><div className="result-item"><strong>댓글수:</strong> {Number(statistics.commentCount || 0).toLocaleString()}개</div></div>)}
                {status && (<div className="inline-box status-inline-box compact-box"><h6>상태 및 공개</h6><div className="result-item"><strong>공개:</strong> {status.privacyStatus || 'N/A'}</div><div className="result-item"><strong>임베드:</strong> {status.embeddable ? '가능' : '불가능'}</div><div className="result-item"><strong>아동용:</strong> {status.madeForKids ? '예' : '아니오'}</div></div>)}
              </div>
            </div>
          </div>
        </div>
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
      </>
    );
  };
  // ... (VidAnalysis 컴포넌트의 return 문은 이전과 동일)
  return (
    <div className="video-analysis-container">
      <h2 className="page-title">영상 분석</h2>
      <div className="url-input-action-row">
        <label htmlFor="videoUrl" className="url-label">영상 URL 입력 (또는 "1"):</label>
        <input type="text" id="videoUrl" className="url-input-field" value={videoUrl} onChange={handleInputChange} onKeyDown={handleInputKeyDown}/>
        <button className="url-submit-button" onClick={handleAnalysis} disabled={loading}>{loading ? '분석중...' : '분석 시작'}</button>
      </div>
      {error && <p className="error-message global-error-message">{error}</p>}
      <div className="results-section">
        {loading && <p className="status-message">결과를 분석 중입니다...</p>}
        {!loading && !error && analysisResults && (<div className="analysis-results-content">{renderAnalysisResults()}</div>)}
        {!loading && !error && !analysisResults && !videoUrl && (<p className="status-message initial-message-prompt">분석할 영상의 URL을 입력하거나, 테스트를 위해 숫자 "1"을 입력 후 "분석 시작" 버튼을 눌러주세요.</p>)}
      </div>
    </div>
  );
};
export default VidAnalysis;