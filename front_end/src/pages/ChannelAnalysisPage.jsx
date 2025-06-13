// src/pages/ChannelAnalysisPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/ChannelAnalysisPage.css';

const API_BASE_URL = 'http://localhost:8082/AscenTube'; 

const formatFullDateTime = (publishedAtObject) => {
    // 1. publishedAtObject가 객체이고, 그 안에 value 속성이 있는지 확인합니다.
    if (!publishedAtObject || typeof publishedAtObject.value === 'undefined') {
        return 'N/A';
    }
    try {
        // 2. new Date()에 객체가 아닌, 객체 안의 숫자 값(value)을 전달합니다.
        const date = new Date(publishedAtObject.value);

        // 3. 날짜가 유효한지 한번 더 확인합니다.
        if (isNaN(date.getTime())) { 
            return 'N/A';
        }

        const year = date.getFullYear();
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        const hours = date.getHours().toString().padStart(2, '0');
        const minutes = date.getMinutes().toString().padStart(2, '0');
        return `${year}.${month}.${day} ${hours}:${minutes}`;

    } catch (e) { 
        return 'N/A'; 
    }
};

function ChannelAnalysisPage() {
  const { channelId } = useParams();
  const [channelInfo, setChannelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchChannelAnalysis = async () => {
      if (!channelId) {
        setLoading(false);
        setError("유효한 채널 ID가 없습니다.");
        return;
      }

      setLoading(true);
      setError(null);
      console.log(`채널 ID ${channelId}에 대한 정보를 불러오는 중...`);

      const token = localStorage.getItem('access_token'); 
      if (!token) {
        setLoading(false);
        setError("인증 토큰이 없습니다. 로그인해주세요.");
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/channel/channel-info`, {
          headers: {
            'Authorization': `Bearer ${token}`
          },
          params: {
            channelId: channelId
          }
        });

        const data = response.data;
        console.log("API 응답 데이터:", data);

        setChannelInfo({
          id: data.channelId,
          name: data.title,
          description: data.description,
          subscriberCount: data.subscriberCount,
          totalVideos: data.videoCount,
          bannerImageUrl: data.bannerImageUrl || 'https://via.placeholder.com/1000x250/E0E0E0/424242?text=Channel+Banner+Area',
          profileImageUrl: data.thumnailUrl,
          recentVideos: data.latestVideos.map(video => ({
            id: video.id,
            title: video.snippet.title,
            thumbnailUrl: video.snippet.thumbnails.medium.url,
            viewCount: video.statistics.viewCount,
            publishedAt: video.snippet.publishedAt,
          })),
          popularVideos: data.popularVideos.map(video => ({
            id: video.id,
            title: video.snippet.title,
            thumbnailUrl: video.snippet.thumbnails.medium.url,
            viewCount: video.statistics.viewCount,
            publishedAt: video.snippet.publishedAt,
          })),
        });
      } catch (err) {
        console.error("채널 정보를 불러오는 중 오류 발생:", err);
        if (axios.isAxiosError(err) && err.response) {
            console.error('서버 응답 데이터:', err.response.data);
            console.error('서버 응답 상태:', err.response.status);
            setError(err.response.data.error || `서버 오류: ${err.response.status}`);
        } else {
            setError(err.message || "채널 정보를 불러오는데 실패했습니다.");
        }
        setChannelInfo(null);
      } finally {
        setLoading(false);
      }
    };

    fetchChannelAnalysis();
  }, [channelId]);


  if (loading) {
    return (
      <div className="channel-analysis-page-loading">
        <p>채널 정보를 불러오는 중입니다 (채널 ID: {channelId})...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="channel-analysis-page-error">
        <p>오류: {error}</p>
        <p>채널 정보를 불러올 수 없습니다.</p>
      </div>
    );
  }

  if (!channelInfo || !channelInfo.id) {
    return (
      <div className="channel-analysis-page-error">
        <p>채널 정보를 불러올 수 없거나 유효한 채널 ID가 아닙니다.</p>
      </div>
    );
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
          <div className="stats-grid">
            <p><strong>구독자 수:</strong> {channelInfo.subscriberCount.toLocaleString()} 명</p>
            <p><strong>총 동영상 수:</strong> {channelInfo.totalVideos.toLocaleString()} 개</p>
          </div>
          <p className="channel-description"><strong>설명:</strong> {channelInfo.description}</p>
          <p className="channel-id-display"><strong>채널 ID:</strong> {channelInfo.id}</p>
        </section>

        <section className="channel-content-card">
          <h2>최근 업로드 영상</h2>
          {channelInfo.recentVideos && channelInfo.recentVideos.length > 0 ? (
            <div className="video-list">
              {channelInfo.recentVideos.map(video => (
                // 🚀 이 부분 수정: <a> 태그로 감싸고 href 속성 추가
                <a 
                  key={video.id} 
                  href={`https://www.youtube.com/watch?v=${video.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="video-item-preview" // 기존 스타일 유지
                >
                  <img src={video.thumbnailUrl} alt={video.title} className="video-thumbnail-preview" />
                  <div className="video-info-preview">
                    <h4 className="video-title-preview">{video.title}</h4>
                    <p className="video-meta-preview">
                      조회수 {video.viewCount.toLocaleString()}회 • 게시일: {formatFullDateTime(video.publishedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : ( <p>최근 영상 정보가 없습니다.</p> )}
        </section>

        <section className="channel-content-card">
          <h2>인기 업로드 영상</h2>
            {channelInfo.popularVideos && channelInfo.popularVideos.length > 0 ? (
            <div className="video-list">
              {channelInfo.popularVideos.map(video => (
                // 🚀 이 부분 수정: <a> 태그로 감싸고 href 속성 추가
                <a 
                  key={video.id} 
                  href={`https://www.youtube.com/watch?v=${video.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="video-item-preview" // 기존 스타일 유지
                >
                  <img src={video.thumbnailUrl} alt={video.title} className="video-thumbnail-preview" />
                  <div className="video-info-preview">
                    <h4 className="video-title-preview">{video.title}</h4>
                    <p className="video-meta-preview">
                      조회수 {video.viewCount.toLocaleString()}회 • 게시일: {formatFullDateTime(video.publishedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : ( <p>인기 영상 정보가 없습니다.</p> )}
        </section>
        
        <section className="channel-content-card">
            <h2>주요 콘텐츠 분석 (Gemini API 활용 영역 예시)</h2>
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