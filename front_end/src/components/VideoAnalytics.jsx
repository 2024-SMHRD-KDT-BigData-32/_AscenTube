// src/components/VideoAnalytics.jsx

import React, { useState, useEffect } from 'react';
import '../styles/components/VideoAnalytics.css';
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

const generateDummyVideoData = (categoryId, categoryName, timePeriod, videoCount = 5) => {
  if (!categoryId) return { videos: [], averageDuration: 'N/A', topTags: [], averageUploadHour: null, averageUploadMinute: null };
  const videos = [];
  let totalDurationSeconds = 0;
  const allTags = {};
  let totalUploadHours = 0;
  let totalUploadMinutes = 0;
  const now = new Date();

  for (let i = 1; i <= videoCount; i++) {
    const views = Math.floor(Math.random() * 1000000) + 10000;
    const durationMinutes = Math.floor(Math.random() * 15) + 1;
    const durationSeconds = Math.floor(Math.random() * 60);
    totalDurationSeconds += durationMinutes * 60 + durationSeconds;

    const videoTags = [`${timePeriod}태그${i}`, `${categoryName}태그`, `인기`, `영상${i}`, `테스트`];
    videoTags.forEach(tag => { allTags[tag] = (allTags[tag] || 0) + 1; });

    const dummyChannelId = `UC-dummy-${timePeriod}-${categoryId}-${String.fromCharCode(65 + i)}`;
    const channelName = `채널 ${String.fromCharCode(65 + i)} (${timePeriod})`;
    
    const randomDaysAgo = Math.floor(Math.random() * (timePeriod === '일간' ? 2 : timePeriod === '주간' ? 7 : 30));
    const randomHour = Math.floor(Math.random() * 24);
    const randomMinute = Math.floor(Math.random() * 60);
    
    const publishedDate = new Date(now);
    publishedDate.setDate(now.getDate() - randomDaysAgo);
    publishedDate.setHours(randomHour, randomMinute, 0, 0);

    totalUploadHours += randomHour;
    totalUploadMinutes += randomMinute;

    const positivePercent = Math.floor(Math.random() * 91) + 5; // 5% ~ 95%
    const negativePercent = 100 - positivePercent;

    videos.push({
      id: `vid-${timePeriod}-${categoryId}-${i}`,
      channelId: dummyChannelId,
      title: `${categoryName} ${timePeriod} 인기 동영상 ${i} - 매우 흥미로운 제목`,
      thumbnailUrl: `https://i.ytimg.com/vi/3JZ_D3ELwOQ/hqdefault.jpg`,
      channelName: channelName,
      views: views,
      duration: `PT${durationMinutes}M${durationSeconds}S`,
      publishedAt: publishedDate.toISOString(),
      positiveComment: `정말 유익한 영상입니다! ${timePeriod} 최고!`,
      negativeComment: `음... 잘 모르겠네요. ${timePeriod}에는 좀 더 다른 걸 기대했는데.`,
      tags: videoTags,
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
  const [loading, setLoading] = useState(true);
  const [videoData, setVideoData] = useState({
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
      <div className="section-meta-info">
        {/* ... 메타 정보 표시 ... */}
        <span>평균 재생 시간: <strong>{videoData.averageDuration}</strong></span>
        <span>
          평균 영상 업로드 시간:
          <strong>
            {videoData.averageUploadHour !== null && videoData.averageUploadMinute !== null
              ? `${String(videoData.averageUploadHour).padStart(2, '0')}시 ${String(videoData.averageUploadMinute).padStart(2, '0')}분`
              : 'N/A'}
          </strong>
        </span>
        {videoData.topTags.length > 0 && (
          <div className="tags-analysis">
            <strong>주요 태그:</strong>
            <div className="tags-container">
              {videoData.topTags.map((tag, index) => (
                <span key={index} className="tag-item">{tag}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="video-list-container">
        {analyticsData.videos.map((video) => {
          const sentimentChartData = [{ name: '반응', positive: video.positivePercent, negative: video.negativePercent }];
          const positiveRadius = video.negativePercent === 0 ? [4, 4, 4, 4] : [4, 0, 0, 4];
          const negativeRadius = video.positivePercent === 0 ? [0, 4, 4, 0] : [0, 4, 4, 0];
          return (
            <div key={video.id} className="video-item-detail">
              <div className="video-info-header">
                {/* ... 비디오 정보 헤더 ... */}
                <img src={video.thumbnailUrl} alt={video.title} className="video-thumbnail-small" />
                <div className="video-text-info">
                  <h4 className="video-title-small">{video.title}</h4>
                  <p className="video-meta-small">
                    <span className="channel-name-text">{video.channelName}</span>
                    {' • 조회수 '} {typeof video.views === 'number' ? video.views.toLocaleString() : video.views}회
                    {' • '} {formatDuration(video.duration)}
                    {' • 업로드: '} {formatFullDateTime(video.publishedAt)}
                  </p>
                </div>
              </div>
              
              <div className="more-button-container">
                {/* ... 버튼들 ... */}
                <button onClick={() => toggleSummary(video.id)} className="more-button">
                  {video.isSummaryVisible ? '숨기기' : '상세분석'}
                </button>
                <Link to={`/channel/${video.channelId}`} className="more-button channel-analysis-link">
                  채널분석
                </Link>
              </div>
              
              {video.isSummaryVisible && (
                <div className="detailed-content-wrapper">
                  <div className="comment-analysis-section">
                    <h5>댓글 분석</h5>
                    <div className="sentiment-chart-container">
                      {/* 🚀 ResponsiveContainer 높이 조정 */}
                      <ResponsiveContainer width="100%" height={40}> 
                        <BarChart
                          layout="vertical"
                          data={sentimentChartData}
                          stackOffset="expand"
                          // 🚀 BarChart 내부 마진 조정 (선택 사항, 더 타이트하게)
                          margin={{ top: 2, right: 5, left: 5, bottom: 2 }} 
                        >
                          <XAxis type="number" hide domain={[0, 1]} />
                          <YAxis type="category" dataKey="name" hide />
                          <Tooltip content={<CustomTooltip />} cursor={{fill: 'transparent'}}/>
                          
                          {/* 🚀 Bar 크기(높이) 조정 */}
                          <Bar dataKey="positive" stackId="sentiment" fill="#FFC107" barSize={30} animationDuration={800} radius={positiveRadius}>
                            {video.positivePercent > 15 && (
                              <LabelList 
                                dataKey="positive" 
                                position="center" 
                                fill="#ffffff" 
                                fontSize={10} 
                                fontWeight="500"
                                formatter={(value) => `긍정 ${value}%`} 
                              />
                            )}
                          </Bar>
                          <Bar dataKey="negative" stackId="sentiment" fill="#F44336" barSize={30} animationDuration={800} radius={negativeRadius}>
                            {video.negativePercent > 15 && (
                              <LabelList 
                                dataKey="negative" 
                                position="center" 
                                fill="#ffffff" 
                                fontSize={10} 
                                fontWeight="500"
                                formatter={(value) => `부정 ${value}%`} 
                              />
                            )}
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
