// src/pages/ChannelAnalysisPage.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import '../styles/pages/ChannelAnalysisPage.css';

const API_BASE_URL = 'http://localhost:8082/AscenTube';

const formatFullDateTime = (publishedAtObject) => {
    if (!publishedAtObject || typeof publishedAtObject.value === 'undefined') {
        return 'N/A';
    }
    try {
        const date = new Date(publishedAtObject.value);
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
      const token = localStorage.getItem('access_token');
      if (!token) {
        setLoading(false);
        setError("인증 토큰이 없습니다. 로그인해주세요.");
        return;
      }

      try {
        const response = await axios.get(`${API_BASE_URL}/channel/channel-info`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { channelId: channelId }
        });

        const data = response.data;
        setChannelInfo({
          id: data.channelId,
          name: data.title,
          description: data.description,
          subscriberCount: data.subscriberCount,
          totalVideos: data.videoCount,
          profileImageUrl: data.thumnailUrl, // 'thumnailUrl' 오타일 수 있으나 API 응답을 그대로 사용
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
      {/* 화면 상단 헤더가 제거되었습니다. */}
      
      <div className="analysis-section-grid">
        {/* ▼▼▼ [수정됨] 채널 요약 카드 ▼▼▼ */}
        <section className="channel-summary-card">
          {/* 채널 프로필 이미지와 이름, ID를 보여주는 새로운 헤더 */}
          <div className="summary-header">
            <img 
              src={channelInfo.profileImageUrl} 
              alt={`${channelInfo.name} 프로필`} 
              className="summary-profile-image" 
            />
            <div className="summary-title-section">
              <h2 className="summary-channel-name">{channelInfo.name}</h2>
              {/* <p className="summary-channel-id">채널 ID: {channelInfo.id}</p> */}
            </div>
          </div>
          
          <h2>채널 통계</h2>
          <div className="stats-grid">
            <p><strong>구독자 수:</strong> {channelInfo.subscriberCount.toLocaleString()} 명</p>
            <p><strong>총 동영상 수:</strong> {channelInfo.totalVideos.toLocaleString()} 개</p>
          </div>
          <p className="channel-description"><strong>설명:</strong> {channelInfo.description}</p>
        </section>

        <section className="channel-content-card">
          <h2>최근 업로드 영상</h2>
          {channelInfo.recentVideos && channelInfo.recentVideos.length > 0 ? (
            <div className="video-list">
              {channelInfo.recentVideos.map(video => (
                <a 
                  key={video.id} 
                  // ▼▼▼ [수정됨] 실제 YouTube 링크로 변경
                  href={`https://www.youtube.com/watch?v=${video.id}`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="video-item-preview"
                >
                  <img src={video.thumbnailUrl} alt={video.title} className="video-thumbnail-preview" />
                  <div className="video-info-preview">
                    <h4 className="video-title-preview">{video.title}</h4>
                    <p className="video-meta-preview">
                      조회수 {Number(video.viewCount).toLocaleString()}회 • 게시일: {formatFullDateTime(video.publishedAt)}
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
                <a 
                  key={video.id} 
                  // ▼▼▼ [수정됨] 실제 YouTube 링크로 변경
                  href={`https://www.youtube.com/watch?v=${video.id}`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="video-item-preview"
                >
                  <img src={video.thumbnailUrl} alt={video.title} className="video-thumbnail-preview" />
                  <div className="video-info-preview">
                    <h4 className="video-title-preview">{video.title}</h4>
                    <p className="video-meta-preview">
                      조회수 {Number(video.viewCount).toLocaleString()}회 • 게시일: {formatFullDateTime(video.publishedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : ( <p>인기 영상 정보가 없습니다.</p> )}
        </section>
        
        <section className="channel-content-card ai-analysis-section">
            <h2>주요 콘텐츠 분석 </h2>
            <div className="ai-analysis-part">
              <h3>📈 LCK 채널의 주요 성공 요인</h3>
              <ul>
                <li><strong>압도적인 스타 플레이어 파워와 서사:</strong> "페이커"라는 전설적인 선수를 중심으로 한 T1의 서사, 그리고 매 시즌 등장하는 신예들과의 경쟁 구도는 단순한 e스포츠를 넘어 한 편의 드라마를 만들어냅니다.</li>
                <li><strong>최상급 중계 퀄리티와 제작 능력:</strong> 전문성과 대중성을 모두 갖춘 중계진은 경기의 재미를 배가시킵니다. 또한, 깔끔한 UI, 실시간 데이터 시각화 등은 최고의 시청 경험을 제공합니다.</li>
                <li><strong>다각화된 콘텐츠 포트폴리오:</strong> 실시간 경기 중계 외에도, 경기 하이라이트, POG 인터뷰쇼, 주간 명장면 분석 등 다양한 2차 콘텐츠를 지속적으로 생산합니다.</li>
                <li><strong>글로벌 팬덤을 겨냥한 현지화 전략:</strong> LCK Global 채널 운영을 통해 다양한 언어의 중계를 제공하며 전 세계 팬들이 LCK를 즐길 수 있도록 지원합니다.</li>
              </ul>
            </div>
            <div className="ai-analysis-part">
              <h3>🚀 내 채널에 적용할 만한 전략</h3>
              <ul>
                <li><strong>내 채널의 "핵심 서사" 발굴 및 강화:</strong> LCK가 팀과 선수의 서사를 활용하듯, 내 채널의 핵심 주제나 등장인물의 성장 스토리를 만들어보세요.</li>
                <li><strong>핵심 순간을 활용한 "숏폼 콘텐츠" 확장:</strong> 긴 영상의 가장 재미있거나 유익한 부분을 1분 내외의 Shorts, Reels 영상으로 재가공하여 신규 시청자 유입 통로로 활용하세요.</li>
                <li><strong>커뮤니티와의 상호작용을 통한 "소속감" 증대:</strong> 댓글 이벤트나 라이브 스트리밍을 통해 시청자와의 유대감을 강화하고 팬덤을 구축하는 것이 중요합니다.</li>
              </ul>
            </div>
        </section>
      </div>
    </div>
  );
}

export default ChannelAnalysisPage;