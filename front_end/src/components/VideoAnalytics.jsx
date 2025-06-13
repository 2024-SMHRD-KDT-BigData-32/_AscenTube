import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { fetchTrendingVideosByPeriod } from '../api/youtubeApi';
import '../styles/components/VideoAnalytics.css';

// 헬퍼 함수: ISO 8601 형식의 재생시간을 'X분 Y초' 형태로 변환
const formatDuration = (isoDuration) => {
  if (!isoDuration) return 'N/A';
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 'N/A';
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  let formatted = '';
  if (hours > 0) formatted += `${hours}시간 `;
  if (minutes > 0 || hours > 0) formatted += `${minutes}분 `;
  formatted += `${seconds}초`;
  return formatted.trim();
};

// 헬퍼 함수: 타임스탬프 값을 'YYYY.MM.DD HH:mm' 형태로 변환
const formatFullDateTime = (timestamp) => {
  if (!timestamp) return 'N/A';
  try {
    const date = new Date(timestamp);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  } catch (e) {
    console.error("Error formatting date:", e);
    return 'N/A';
  }
};

// API 응답 데이터를 UI에 맞게 가공하는 함수
const processApiData = (videosFromApi) => {
  if (!videosFromApi || videosFromApi.length === 0) {
    return { videos: [] };
  }
  
  const processedVideos = videosFromApi.map(video => {
    const publishedAtTimestamp = video.snippet.publishedAt?.value || video.snippet.publishedAt;
    const positivePercent = Math.floor(Math.random() * 91) + 5;

    return {
      id: video.id?.videoId || video.id,
      channelId: video.snippet.channelId,
      title: video.snippet.title,
      thumbnailUrl: video.snippet.thumbnails.high.url,
      channelName: video.snippet.channelTitle,
      publishedAt: publishedAtTimestamp,
      views: parseInt(video.statistics?.viewCount ?? '0', 10),
      likes: parseInt(video.statistics?.likeCount ?? '0', 10),
      comments: parseInt(video.statistics?.commentCount ?? '0', 10),
      duration: video.contentDetails?.duration || 'N/A',
      isSummaryVisible: false,
      summaryText: `[구현 예정] ${video.snippet.title.substring(0,20)}... 영상의 AI 요약 내용이 여기에 표시됩니다.`,
      positiveComment: `[구현 예정] 대표 긍정 댓글입니다.`,
      negativeComment: `[구현 예정] 대표 부정 댓글입니다.`,
      positivePercent: positivePercent,
      negativePercent: 100 - positivePercent,
    };
  });
  
  return {
    videos: processedVideos,
  };
};

const VideoAnalytics = ({ title, categoryId, categoryName, timePeriod }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [analyticsData, setAnalyticsData] = useState({
    videos: [],
  });

  const toggleSummary = (videoId) => {
    setAnalyticsData(prevData => ({
      ...prevData,
      videos: prevData.videos.map(video =>
        video.id === videoId ? { ...video, isSummaryVisible: !video.isSummaryVisible } : video
      ),
    }));
  };

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="recharts-custom-tooltip">
          {payload.map((pld, index) => (
            <div key={index} style={{ color: pld.payload.fill }}>
              {`${pld.name === 'positive' ? '긍정' : '부정'}: ${pld.value}%`}
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userId = localStorage.getItem('user_google_id'); 

    if (categoryId && token && userId) {
      const fetchData = async () => {
        setIsLoading(true);
        setError(null);
        
        const periodMap = { '일간': 'daily', '주간': 'weekly', '월간': 'monthly' };
        const apiPeriod = periodMap[timePeriod] || 'daily';

        const rawData = await fetchTrendingVideosByPeriod(token, userId, categoryId, apiPeriod);

        if (rawData) {
          const processedData = processApiData(rawData);
          setAnalyticsData(processedData);
        } else {
          setError('데이터를 불러오는 데 실패했습니다.');
          setAnalyticsData({ videos: [] });
        }
        setIsLoading(false);
      };

      fetchData();
    }
  }, [categoryId, timePeriod]); 

  if (isLoading) {
    return (
      <div className="video-analysis-section">
        <h2 className="section-subtitle">{title}</h2>
        <p>({categoryName} 카테고리 - {timePeriod} 기준) 데이터를 불러오는 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="video-analysis-section error">
        <h2 className="section-subtitle">{title}</h2>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="video-analysis-section">
      <h2 className="section-subtitle">{title}</h2>
      
      <div className="video-list-container">
        {analyticsData.videos.map((video) => {
          const sentimentChartData = [{ name: '반응', positive: video.positivePercent, negative: video.negativePercent }];
          const positiveRadius = video.negativePercent === 0 ? [4, 4, 4, 4] : [4, 0, 0, 4];
          const negativeRadius = video.positivePercent === 0 ? [0, 4, 4, 0] : [0, 4, 4, 0];
          // 유튜브 링크를 표준 형식으로 만듭니다.
          const videoUrl = `https://www.youtube.com/watch?v=${video.id}`;
          const channelUrl = `https://www.youtube.com/channel/${video.channelId}`;

          return (
            <div key={video.id} className="video-item-wrapper">
              
              {/* --- 상단 정보 및 버튼 영역 (가로 정렬될 부분) --- */}
              <div className="video-item-detail">
                
                {/* 왼쪽: 썸네일 + 영상 정보 */}
                <div className="video-info-header">
                  <a href={videoUrl} target="_blank" rel="noopener noreferrer">
                    <img src={video.thumbnailUrl} alt={video.title} className="video-thumbnail-small" />
                  </a>
                  <div className="video-text-info">
                    {/* ▼▼▼ [수정] 제목에 링크 추가 ▼▼▼ */}
                    <a href={videoUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <h4 className="video-title-small">{video.title}</h4>
                    </a>
                    {/* ▼▼▼ [수정] 채널 이름 위치 변경을 위해 기존 줄에서 삭제, 설명 텍스트만 남김 ▼▼▼ */}
                    <p className="video-meta-small">
                      조회수 {video.views.toLocaleString()}회
                      {' • 좋아요 '} {video.likes.toLocaleString()}회
                      {' • '} {formatDuration(video.duration)}
                      {' • 업로드: '} {formatFullDateTime(video.publishedAt)}
                    </p>
                    {/* ▼▼▼ [수정] 채널 이름, 볼드 처리 및 링크 추가하여 새 줄에 배치 ▼▼▼ */}
                    <a href={channelUrl} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <p className="channel-name-text">
                            <strong>{video.channelName}</strong>
                        </p>
                    </a>
                  </div>
                </div>

                {/* 오른쪽: 버튼 영역 */}
                <div className="more-button-container">
                  <button onClick={() => toggleSummary(video.id)} className="more-button">
                    {video.isSummaryVisible ? '숨기기' : '상세분석'}
                  </button>
                  <Link to={`/video/${video.id}`} className="more-button video-specific-analysis-link">영상분석</Link>
                  <Link to={`/channel/${video.channelId}`} className="more-button channel-analysis-link">채널분석</Link>
                </div>
              </div>
              
              {/* --- 하단: 상세 분석 (토글되는 영역) --- */}
              {video.isSummaryVisible && (
                <div className="detailed-content-wrapper">
                  <div className="comment-analysis-section">
                    <h5>댓글 분석</h5>
                    <div className="sentiment-chart-container">
                      <ResponsiveContainer width="100%" height={40}>
                        <BarChart layout="vertical" data={sentimentChartData} stackOffset="expand" margin={{ top: 2, right: 5, left: 5, bottom: 2 }}>
                          <XAxis type="number" hide domain={[0, 1]} />
                          <YAxis type="category" dataKey="name" hide />
                          <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}}/>
                          <Bar dataKey="positive" stackId="sentiment" fill="#FFC107" barSize={30} radius={positiveRadius}>
                            <LabelList dataKey="positive" position="center" fill="#ffffff" fontSize={10} formatter={(value) => `긍정 ${value}%`} />
                          </Bar>
                          <Bar dataKey="negative" stackId="sentiment" fill="#F44336" barSize={30} radius={negativeRadius}>
                            <LabelList dataKey="negative" position="center" fill="#ffffff" fontSize={10} formatter={(value) => `부정 ${value}%`} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="representative-comments">
                      <p className="positive-comment"><strong>대표 긍정 댓글:</strong> {video.positiveComment}</p>
                      <p className="negative-comment"><strong>대표 부정 댓글:</strong> {video.negativeComment}</p>
                    </div>
                  </div>
                  <div className="video-summary">
                    <h5>영상 요약</h5>
                    <p>{video.summaryText}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VideoAnalytics;