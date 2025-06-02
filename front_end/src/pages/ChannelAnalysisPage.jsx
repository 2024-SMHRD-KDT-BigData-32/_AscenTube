// src/pages/ChannelAnalysisPage.jsx (그래프 형식 변경)
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import '../styles/pages/ChannelAnalysisPage.css';
// 🚀 Recharts PieChart 관련 import는 삭제합니다. (다른 차트에서 Recharts를 계속 사용한다면 유지)
// import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const formatFullDateTime = (isoString) => {
  if (!isoString) return 'N/A';
  try {
    const date = new Date(isoString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}.${month}.${day} ${hours}:${minutes}`;
  } catch (e) { return 'N/A'; }
};

const parseDurationToSeconds = (isoDuration) => {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  const hours = parseInt(match[1] || 0);
  const minutes = parseInt(match[2] || 0);
  const seconds = parseInt(match[3] || 0);
  return (hours * 3600) + (minutes * 60) + seconds;
};

// 🚀 영상 길이 카테고리별 막대 색상 (파이 차트 색상 재활용 또는 새 색상 정의)
const DURATION_BAR_COLORS = ['#4CAF50', '#FFC107', '#2196F3', '#FF9800', '#9C27B0'];


function ChannelAnalysisPage() {
  const { channelId } = useParams();
  const [channelInfo, setChannelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  // 🚀 videoDurationData는 이제 각 카테고리의 이름, 개수, 퍼센트, 색상 정보를 가집니다.
  const [videoDurationData, setVideoDurationData] = useState([]);

  useEffect(() => {
    if (channelId) {
      setLoading(true);
      console.log(`Fetching data for channel ID: ${channelId}`);

      setTimeout(() => {
        const recentVideosList = [
          { id: 'vid1', title: `${channelId}의 최신 영상 1`, thumbnailUrl: '...', viewCount: Math.floor(Math.random() * 50000) + 500, publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), duration: 'PT5M30S' },
          { id: 'vid2', title: `${channelId}의 최신 영상 2`, thumbnailUrl: '...', viewCount: Math.floor(Math.random() * 30000) + 300, publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), duration: 'PT12M10S' },
          { id: 'vid3', title: `${channelId}의 최신 영상 3`, thumbnailUrl: '...', viewCount: Math.floor(Math.random() * 80000) + 1000, publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), duration: 'PT8M00S' },
        ];
        const popularVideosList = [
          { id: 'pop_vid1', title: `${channelId}의 최고 인기 영상`, thumbnailUrl: '...', viewCount: Math.floor(Math.random() * 500000) + 100000, publishedAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), duration: 'PT15M20S' },
          { id: 'pop_vid2', title: `${channelId}의 인기 영상`, thumbnailUrl: '...', viewCount: Math.floor(Math.random() * 300000) + 80000, publishedAt: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(), duration: 'PT22M05S' },
          { id: 'pop_vid3', title: `${channelId}의 꾸준한 인기 영상`, thumbnailUrl: '...', viewCount: Math.floor(Math.random() * 100000) + 50000, publishedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(), duration: 'PT3M45S' },
          { id: 'pop_vid4', title: `${channelId} 단편 인기 영상`, thumbnailUrl: '...', viewCount: Math.floor(Math.random() * 120000) + 60000, publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), duration: 'PT0M58S' },
        ];
        
        setChannelInfo({
          id: channelId,
          name: `채널 ${channelId} 분석 결과`,
          description: `이 채널은 ...`,
          subscriberCount: Math.floor(Math.random() * 1000000) + 1000,
          totalVideos: Math.floor(Math.random() * 500) + 10,
          bannerImageUrl: 'https://via.placeholder.com/1000x250/E0E0E0/424242?text=Channel+Banner+Area',
          profileImageUrl: `https://i.pravatar.cc/150?u=${channelId}`,
          recentVideos: recentVideosList,
          popularVideos: popularVideosList,
        });

        const allVideosForDuration = [...recentVideosList, ...popularVideosList];
        const durationCategories = {
          '1분 미만': 0, '1-5분': 0, '5-10분': 0, '10-20분': 0, '20분 초과': 0,
        };
        allVideosForDuration.forEach(video => {
          const seconds = parseDurationToSeconds(video.duration);
          if (seconds < 60) durationCategories['1분 미만']++;
          else if (seconds < 300) durationCategories['1-5분']++;
          else if (seconds < 600) durationCategories['5-10분']++;
          else if (seconds < 1200) durationCategories['10-20분']++;
          else durationCategories['20분 초과']++;
        });

        const totalVideosForDurationCalc = allVideosForDuration.length;
        const durationStats = Object.keys(durationCategories)
          .map((key, index) => ({
            name: key,
            count: durationCategories[key],
            percentage: totalVideosForDurationCalc > 0 ? parseFloat(((durationCategories[key] / totalVideosForDurationCalc) * 100).toFixed(1)) : 0,
            color: DURATION_BAR_COLORS[index % DURATION_BAR_COLORS.length]
          }))
          .filter(item => item.count > 0);
        setVideoDurationData(durationStats);

        setLoading(false);
      }, 1000);
    } else {
      setLoading(false);
    }
  }, [channelId]);


  if (loading) { /* ... 로딩 UI ... */ 
    return ( <div className="channel-analysis-page-loading"><p>채널 정보를 불러오는 중입니다 (채널 ID: {channelId})...</p></div> );
  }
  if (!channelInfo) { /* ... 에러 UI ... */ 
    return ( <div className="channel-analysis-page-error"><p>채널 정보를 불러올 수 없거나 유효한 채널 ID가 아닙니다.</p></div> );
  }

  return (
    <div className="channel-analysis-page">
      <header className="channel-header" style={{ backgroundImage: `url(${channelInfo.bannerImageUrl})` }}>
        <div className="channel-header-overlay">
          <img src={channelInfo.profileImageUrl} alt={`${channelInfo.name} 프로필`} className="channel-profile-image" />
          <h1 className="channel-name">{channelInfo.name}</h1>
        </div>
      </header>

      <div className="analysis-section-grid">
        <section className="channel-summary-card">
          <h2>채널 요약 정보</h2>
          {/* ... 채널 요약 내용 ... */}
          <div className="stats-grid">
            <p><strong>구독자 수:</strong> {channelInfo.subscriberCount.toLocaleString()} 명</p>
            <p><strong>총 동영상 수:</strong> {channelInfo.totalVideos.toLocaleString()} 개</p>
          </div>
          <p className="channel-description"><strong>설명:</strong> {channelInfo.description}</p>
          <p className="channel-id-display"><strong>채널 ID:</strong> {channelInfo.id}</p>
        </section>

        <section className="channel-content-card">
          <h2>최근 업로드 영상</h2>
          {/* ... 최근 업로드 영상 목록 ... */}
          {channelInfo.recentVideos && channelInfo.recentVideos.length > 0 ? (
            <div className="video-list">
              {channelInfo.recentVideos.map(video => (
                <div key={video.id} className="video-item-preview">
                  <img src={video.thumbnailUrl} alt={video.title} className="video-thumbnail-preview" />
                  <div className="video-info-preview">
                    <h4 className="video-title-preview">{video.title}</h4>
                    <p className="video-meta-preview">
                      조회수 {video.viewCount.toLocaleString()}회 • 게시일: {formatFullDateTime(video.publishedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : ( <p>최근 영상 정보가 없습니다.</p> )}
        </section>

        <section className="channel-content-card">
          <h2>인기 업로드 영상</h2>
          {/* ... 인기 업로드 영상 목록 ... */}
           {channelInfo.popularVideos && channelInfo.popularVideos.length > 0 ? (
            <div className="video-list">
              {channelInfo.popularVideos.map(video => (
                <div key={video.id} className="video-item-preview">
                  <img src={video.thumbnailUrl} alt={video.title} className="video-thumbnail-preview" />
                  <div className="video-info-preview">
                    <h4 className="video-title-preview">{video.title}</h4>
                    <p className="video-meta-preview">
                      조회수 {video.viewCount.toLocaleString()}회 • 게시일: {formatFullDateTime(video.publishedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : ( <p>인기 영상 정보가 없습니다.</p> )}
        </section>

        {/* 🚀 영상 길이 분포 그래프 (CSS 기반 가로 막대 목록 형태로 변경) */}
        <section className="channel-content-card">
          <h2>영상 길이 분포</h2>
          {videoDurationData.length > 0 ? (
            <div className="duration-bar-list-container">
              {videoDurationData.map((category) => (
                <div key={category.name} className="duration-bar-item">
                  <div className="duration-bar-header">
                    <span className="duration-bullet" style={{ color: category.color }}>•</span>
                    <span className="duration-category-name">{category.name}</span>
                  </div>
                  <div className="duration-bar-track">
                    <div
                      className="duration-bar-fill"
                      style={{ width: `${category.percentage}%`, backgroundColor: category.color }}
                      title={`${category.name}: ${category.percentage}% (${category.count}개)`}
                    ></div>
                  </div>
                  <div className="duration-percentage-value">{category.percentage}%</div>
                </div>
              ))}
            </div>
          ) : (
            <p>영상 길이 분포를 표시할 데이터가 충분하지 않습니다.</p>
          )}
        </section>
        
        <section className="channel-content-card">
           <h2>주요 콘텐츠 분석 (Gemini API 활용 영역 예시)</h2>
           {/* ... Gemini 예시 내용 ... */}
           <p><i>이 채널의 주요 성공 요인은 다음과 같습니다: (AI 분석 결과)</i></p>
           <ul>
            <li><i>분석 항목 1...</i></li>
            <li><i>분석 항목 2...</i></li>
           </ul>
           <p><i>내 채널에 적용할 만한 전략: (AI 제안)</i></p>
           <ul>
            <li><i>제안 1...</i></li>
            <li><i>제안 2...</i></li>
           </ul>
        </section>
      </div>
    </div>
  );
}

export default ChannelAnalysisPage;