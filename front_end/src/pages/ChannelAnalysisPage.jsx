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

  // AI 분석 결과를 저장할 새로운 State 추가
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(null); // AI 관련 에러 메시지를 별도로 관리

  // useEffect 로직을 수정하여 AI 분석 API 호출을 추가합니다.
  useEffect(() => {
    const fetchAllData = async () => {
      if (!channelId) {
        setLoading(false);
        setError("유효한 채널 ID가 없습니다.");
        return;
      }

      setLoading(true);
      setError(null);
      const token = localStorage.getItem('access_token');
      const userId = localStorage.getItem('user_google_id');

      if (!token || !userId) {
        setLoading(false);
        setError("인증 정보가 없습니다. 로그인해주세요.");
        return;
      }

      try {
        // 1. 기존 채널 정보 API 호출
        const infoResponse = await axios.get(`${API_BASE_URL}/channel/channel-info`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: { channelId: channelId }
        });
        const data = infoResponse.data;
        setChannelInfo({
          id: data.channelId,
          name: data.title,
          description: data.description,
          subscriberCount: data.subscriberCount,
          totalVideos: data.videoCount,
          profileImageUrl: data.thumnailUrl,
          recentVideos: data.latestVideos,
          popularVideos: data.popularVideos,
        });
        setLoading(false); // 기본 정보 로딩 완료

        // 2. 채널 정보 로딩 성공 후, AI 분석 API 호출 시작
        setAiLoading(true);
        setAiError(null); // AI 분석 에러 초기화

        const aiParams = {
          userId: userId,
          channelId: channelId,
          myChannelTopic: 'IT 기술 및 개발자 VLOG' // 이 부분은 필요에 따라 변경 가능
        };

        const aiResponse = await axios.get(`${API_BASE_URL}/api/ai/youtube/channel-analysis`, {
          headers: { 'Authorization': `Bearer ${token}` },
          params: aiParams
        });

        // 백엔드로부터 받은 원본 AI 응답 데이터와 타입 확인 (디버깅용)
        console.log("백엔드로부터 받은 실제 AI 응답 데이터 (파싱 전):", typeof aiResponse.data, aiResponse.data);

        let rawAiText = aiResponse.data;
        let parsedAiAnalysis = null;

        // 응답이 문자열일 경우 JSON 파싱 시도 (마크다운 코드 블록 제거 포함)
        if (typeof rawAiText === 'string') {
          const jsonStartIndex = rawAiText.indexOf("```json");
          const jsonEndIndex = rawAiText.lastIndexOf("```");

          if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonStartIndex < jsonEndIndex) {
            // "```json" 부분 이후부터, 마지막 "```" 이전까지 문자열 추출
            // 예: "```json\n{...}\n```" 에서 "{...}"만 남김
            rawAiText = rawAiText.substring(jsonStartIndex + "```json".length, jsonEndIndex);
            // 앞뒤 공백 및 개행 문자 제거
            rawAiText = rawAiText.trim();
            
            console.log("마크다운 제거 후 순수 JSON 문자열:", rawAiText); 
          } else {
            // 마크다운 블록이 없어도 JSON일 수 있으므로 그대로 파싱 시도
            console.warn("AI 응답이 예상되는 JSON 마크다운 형식으로 오지 않았습니다. 원본 그대로 파싱 시도.");
          }

          try {
            parsedAiAnalysis = JSON.parse(rawAiText);
            console.log("JSON.parse 성공:", parsedAiAnalysis);
          } catch (parseError) {
            console.error("AI 응답 JSON 파싱 중 오류 발생 (원본 문자열):", rawAiText, "오류:", parseError);
            setAiError("AI 분석 데이터를 처리하는 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            setAiLoading(false);
            return; // 에러 발생 시 이후 로직 실행 중단
          }
        } else if (typeof rawAiText === 'object' && rawAiText !== null) {
            // axios가 이미 객체로 파싱해준 경우 그대로 사용
            parsedAiAnalysis = rawAiText;
            console.log("AI 응답이 이미 객체입니다:", parsedAiAnalysis);
        } else {
            // 예상치 못한 응답 타입 처리
            console.error("예상치 못한 AI 응답 타입:", typeof rawAiText, rawAiText);
            setAiError("AI 분석 데이터 형식이 올바르지 않습니다. 잠시 후 다시 시도해주세요.");
            setAiLoading(false);
            return;
        }
        
        setAiAnalysis(parsedAiAnalysis); // 파싱(또는 원본 객체)된 데이터를 state에 저장

      } catch (err) {
        console.error("데이터를 불러오는 중 오류 발생:", err);
        // 채널 정보 로딩 실패 시 전체 에러 메시지 처리
        const errorMessage = err.response?.data?.error || err.message || "데이터를 불러오는데 실패했습니다.";
        setError(errorMessage);
        setChannelInfo(null); // 채널 정보 로딩 실패 시 초기화

        // AI 분석 API 호출에서 발생한 특정 에러 처리 (예: 429 Too Many Requests, 500 Internal Server Error)
        if (axios.isAxiosError(err) && err.response) {
            if (err.response.status === 429) { // 429: Too Many Requests (API 호출 제한)
                setAiError("AI API 호출 횟수가 너무 많습니다. 잠시 후 다시 시도해주세요.");
            } else if (err.response.status >= 500) { // 5xx: 서버 내부 오류
                setAiError("AI 서버에 문제가 발생했습니다. 잠시 후 다시 시도해주세요.");
            } else {
                setAiError("AI 분석 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
            }
        } else {
            setAiError("AI 분석 중 네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.");
        }
        setAiAnalysis(null); // AI 분석 에러 발생 시 기존 데이터 초기화
      } finally {
        setLoading(false); // 전체 로딩 상태 종료
        setAiLoading(false); // AI 분석 로딩 상태 종료
      }
    };

    fetchAllData();
  }, [channelId]); // channelId가 변경될 때마다 다시 실행

  // 초기 로딩 중일 때만 전체 로딩 표시 (채널 정보 로드 전)
  if (loading && !channelInfo) {
    return (
      <div className="channel-analysis-page-loading">
        <p>채널 정보를 불러오는 중입니다 (채널 ID: {channelId})...</p>
      </div>
    );
  }

  // 채널 정보 로드 실패 시 에러 메시지 표시
  if (error) {
    return (
      <div className="channel-analysis-page-error">
        <p>오류: {error}</p>
      </div>
    );
  }

  // 채널 정보가 없으면 (에러는 아니지만 데이터 없는 경우)
  if (!channelInfo) {
    return (
      <div className="channel-analysis-page-error">
        <p>채널 정보를 찾을 수 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="channel-analysis-page">
      <div className="analysis-section-grid">
        {/* 채널 요약 섹션 */}
        <section className="channel-summary-card">
          <div className="summary-header">
            <img
              src={channelInfo.profileImageUrl}
              alt={`${channelInfo.name} 프로필`}
              className="summary-profile-image"
            />
            <div className="summary-title-section">
              <h2 className="summary-channel-name">{channelInfo.name}</h2>
            </div>
          </div>

          <h2>채널 통계</h2>
          <div className="stats-grid">
            <p><strong>구독자 수:</strong> {channelInfo.subscriberCount.toLocaleString()} 명</p>
            <p><strong>총 동영상 수:</strong> {channelInfo.totalVideos.toLocaleString()} 개</p>
          </div>
          <p className="channel-description"><strong>설명:</strong> {channelInfo.description}</p>
        </section>

        {/* 최근 업로드 영상 섹션 */}
        <section className="channel-content-card">
          <h2>최근 업로드 영상</h2>
          {channelInfo.recentVideos && channelInfo.recentVideos.length > 0 ? (
            <div className="video-list">
              {channelInfo.recentVideos.map(video => (
                <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="video-item-preview">
                  <img src={video.snippet.thumbnails.medium.url} alt={video.snippet.title} className="video-thumbnail-preview" />
                  <div className="video-info-preview">
                    <h4 className="video-title-preview">{video.snippet.title}</h4>
                    <p className="video-meta-preview">
                      조회수 {Number(video.statistics.viewCount).toLocaleString()}회 • 게시일: {formatFullDateTime(video.snippet.publishedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (<p>최근 영상 정보가 없습니다.</p>)}
        </section>

        {/* 인기 업로드 영상 섹션 */}
        <section className="channel-content-card">
          <h2>인기 업로드 영상</h2>
          {channelInfo.popularVideos && channelInfo.popularVideos.length > 0 ? (
            <div className="video-list">
              {channelInfo.popularVideos.map(video => (
                <a key={video.id} href={`https://www.youtube.com/watch?v=${video.id}`} target="_blank" rel="noopener noreferrer" className="video-item-preview">
                  <img src={video.snippet.thumbnails.medium.url} alt={video.snippet.title} className="video-thumbnail-preview" />
                  <div className="video-info-preview">
                    <h4 className="video-title-preview">{video.snippet.title}</h4>
                    <p className="video-meta-preview">
                      조회수 {Number(video.statistics.viewCount).toLocaleString()}회 • 게시일: {formatFullDateTime(video.snippet.publishedAt)}
                    </p>
                  </div>
                </a>
              ))}
            </div>
          ) : (<p>인기 영상 정보가 없습니다.</p>)}
        </section>

        {/* AI 분석 결과 섹션 */}
        <section className="channel-content-card ai-analysis-section">
          <h2>주요 콘텐츠 분석 (AI)</h2>

          {aiLoading && <p className="ai-loading">⏳ AI가 채널을 분석하고 있습니다. 잠시만 기다려주세요...</p>}
          {aiError && <p className="ai-error">❌ {aiError}</p>} {/* aiError 메시지를 직접 표시 */}

          {/* aiAnalysis 데이터가 있을 때만 내용을 렌더링 */}
          {aiAnalysis && (
            <>
              <div className="ai-analysis-part">
                <h3>{channelInfo.name} 채널의 콘텐츠 전략 및 성공 요인</h3>
                <ul>

                  <li><strong>성공 요인:</strong> {aiAnalysis.channelAnalysis?.successFactor || '분석 중...'}</li>
                </ul>
              </div>
              <div className="ai-analysis-part">
                <h3>내 채널에 적용할 만한 전략</h3>
                <ul>
                  {/* actionableStrategies 배열을 map 함수로 순회하며 리스트 아이템 생성 */}
                  {aiAnalysis.actionableStrategies?.map((item, index) => (
                    <li key={index}><strong>{item.strategy}:</strong> {item.description}</li>
                  ))}
                </ul>
              </div>
            </>
          )}
          {/* aiLoading이 false이고 aiAnalysis가 null이며 aiError도 없는 경우 (데이터가 아직 없거나 로드 실패) */}
          {/* 에러 메시지가 없을 때만 "아직 분석 결과 없음" 메시지를 보여줍니다. */}
          {!aiLoading && !aiAnalysis && !aiError && (
             <p className="ai-no-data">아직 AI 분석 결과가 없습니다. 채널 정보를 확인해주세요.</p>
          )}
        </section>
      </div>
    </div>
  );
}

export default ChannelAnalysisPage;