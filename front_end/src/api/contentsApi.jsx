// src/api/contentsApi.js

// dashboardApi에 이미 fetchApiData 헬퍼 함수가 있다면 재사용할 수 있습니다.
// 여기서는 독립적으로 다시 정의합니다.
const fetchApiData = async (url, options, emptyState) => {
    try {
      const response = await fetch(url, options);
      if (response.status === 204) {
        console.log(`데이터 없음 (204 No Content): ${url}`);
        return emptyState;
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: response.statusText }));
        throw new Error(`API 오류 (${response.status}): ${errorData.message}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API 호출 실패: ${url}`, error);
      return emptyState;
    }
};

// [수정] 대시보드 API를 호출하여 콘텐츠 페이지 데이터를 임시로 구성하는 함수
export const fetchContentsPageData = async () => {
  const token = localStorage.getItem('access_token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');

  const channelId = localStorage.getItem('user_youtube_channel_id');
  if (!channelId) throw new Error('YouTube 채널 ID가 없습니다.');

  const baseApiUrl = 'http://localhost:8082/AscenTube/channel/my-channel';
  const commonHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const queryParams = (params = {}) => new URLSearchParams({ channelId, ...params }).toString();

  const emptyStates = {
    latestVideos: [],
    audienceSummary: {
        trafficSources: [],
        // ... (기타 audience 데이터)
    }
  };

  // 콘텐츠 페이지에 필요한 데이터를 대시보드 API에서 가져옴
  const [
    latestVideosRes,
    audienceSummaryRes,
  ] = await Promise.allSettled([
    // "모든 영상" 대신 "최신 영상 3개" 데이터로 임시 대체
    fetchApiData(`${baseApiUrl}/latest-video-performance?${queryParams({ limit: 10 })}`, { headers: commonHeaders }, emptyStates.latestVideos),
    // "통계" 데이터 대신 "대시보드 요약" 데이터로 임시 대체
    fetchApiData(`${baseApiUrl}/dashboard-summary?${queryParams()}`, { headers: commonHeaders }, emptyStates.audienceSummary),
  ]);

  const getValue = (response, defaultState) => response.status === 'fulfilled' ? response.value : defaultState;

  const latestVideos = getValue(latestVideosRes, emptyStates.latestVideos);
  const audienceSummary = getValue(audienceSummaryRes, emptyStates.audienceSummary);

  // 백엔드 DTO 필드명을 프론트엔드에서 사용하는 이름으로 변환
  const allVideos = latestVideos.map(v => ({
    videoId: v.videoKey,
    title: v.videoTitle,
    views: v.viewCount,
    likes: v.likeCount,
    comments: v.commentCount,
    thumb: v.thumbnailUrl,
    url: `https://www.youtube.com/watch?v=${v.videoKey}`,
    uploadDate: v.uploadedAt.split('T')[0],
    uploadTime: v.uploadedAt.split('T')[1].substring(0, 5),
    length: v.videoPlaytime ? (v.videoPlaytime / 60).toFixed(1) : 0,
  }));
  
  // 통계 데이터를 임시로 구성 (일부 데이터는 부정확할 수 있음)
  const statistics = {
    uploadCountByDay: { '월': 2, '화': 3, '수': 1, '목': 2, '금': 1, '토': 1, '일': 0 }, // 예시
    uploadCountByTimeZone: { '오전': 4, '오후': 3, '저녁': 3, '심야': 0 }, // 예시
    avgViewsByLength: { '1~5분': 1500, '5~10분': 2200, '10분 이상': 3000 }, // 예시
    viewsByTrafficSource: audienceSummary.trafficSources?.reduce((acc, curr) => {
        acc[curr.sourceType] = curr.percentage * 100; // 임시 계산
        return acc;
    }, {}) || {},
    viewsByDevice: { '모바일': 7000, 'PC': 3000, '태블릿': 500, 'TV': 100 }, // 예시
  };

  return {
    allVideos,
    statistics,
  };
};