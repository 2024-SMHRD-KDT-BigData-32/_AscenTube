// src/api/dashboardApi.js

const formatAverageWatchTime = (seconds) => {
  if (typeof seconds !== 'number' || isNaN(seconds) || seconds < 0) return "0:00";
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
};
const translateSourceType = (sourceType) => {
  const types = { 'SUBSCRIBER': '구독', 'YT_CHANNEL': 'YouTube 채널', 'YT_SEARCH': 'YouTube 검색', 'SHORTS': 'Shorts 피드', 'EXT_URL': '외부 소스', 'YT_OTHER_PAGE': '기타 YouTube 기능', 'PLAYLIST': '재생목록', 'NOTIFICATION': '알림', 'NO_LINK_OTHER': '직접/알수없음' };
  return types[sourceType] || sourceType;
};
const fetchApiData = async (url, options, emptyState) => {
  try {
    const response = await fetch(url, options);
    if (response.status === 204) return emptyState;
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

export const fetchDashboardData = async () => {
  const token = localStorage.getItem('access_token');
  if (!token) throw new Error('JWT 토큰이 없습니다.');
  const channelId = localStorage.getItem('user_youtube_channel_id');
  if (!channelId) throw new Error('YouTube 채널 ID가 없습니다.');

  const baseApiUrl = 'http://localhost:8082/AscenTube';
  const commonHeaders = { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' };
  const queryParams = (params = {}) => new URLSearchParams({ channelId, ...params }).toString();

  const emptyStates = {
    summary: { totalSubscribers: 0, totalViews: 0, averageWatchTime: "0:00", totalVideos: 0, averageUploadInterval: "N/A" },
    audienceSummary: { genderRatio: [], ageGroupDistribution: [], countryViewers: [], trafficSources: [] },
  };

  const [
    recentVideosRes,
    topSubRes,
    topAvgWatchTimeRes,
    summaryRes,
    audienceSummaryRes,
  ] = await Promise.allSettled([
    fetchApiData(`${baseApiUrl}/channel/my-channel/latest-video-performance?${queryParams({ limit: 3 })}`, { headers: commonHeaders }, []),
    fetchApiData(`${baseApiUrl}/channel/my-channel/top-sub-contribution?${queryParams({ limit: 3 })}`, { headers: commonHeaders }, []),
    fetchApiData(`${baseApiUrl}/channel/my-channel/top-avg-watch-time?${queryParams({ limit: 3 })}`, { headers: commonHeaders }, []),
    fetchApiData(`${baseApiUrl}/channel/my-channel/key-metrics?${queryParams()}`, { headers: commonHeaders }, emptyStates.summary),
    fetchApiData(`${baseApiUrl}/channel/my-channel/dashboard-summary?${queryParams()}`, { headers: commonHeaders }, emptyStates.audienceSummary),
  ]);

  const getValue = (response, defaultState) => response.status === 'fulfilled' ? response.value : defaultState;

  const recentVideosData = getValue(recentVideosRes, []);
  const topSubscriberVideosData = getValue(topSubRes, []);
  const topViewDurationVideosData = getValue(topAvgWatchTimeRes, []);
  const summaryData = getValue(summaryRes, emptyStates.summary);
  const audienceSummaryData = getValue(audienceSummaryRes, emptyStates.audienceSummary);
  
  const recentVideos = recentVideosData.map(v => ({ id: v.videoKey, title: v.videoTitle || '제목 없음', views: v.viewCount || 0, avgDuration: formatAverageWatchTime(v.avgWatchTime), likes: v.likeCount || 0, comments: v.commentCount || 0, newSubs: v.subscriberGained || 0, }));
  const topSubscriberVideos = topSubscriberVideosData.map(v => ({ id: v.videoKey, title: v.videoTitle || '제목 없음', views: v.viewCount || 0, newSubs: v.subscriberGained || 0, }));
  const topViewDurationVideos = topViewDurationVideosData.map(v => ({ id: v.videoKey, title: v.videoTitle || '제목 없음', views: v.viewCount || 0, avgDuration: formatAverageWatchTime(v.avgWatchTime), }));
  const stats = { subscriberCount: summaryData.totalSubscribers || 0, viewCount: summaryData.totalViews || 0, averageViewDuration: summaryData.averageWatchTime || "0:00", totalVideos: summaryData.totalVideos || 0, averageUploadInterval: summaryData.averageUploadInterval || "N/A", };
  const audience = {
    gender: audienceSummaryData.genderRatio?.reduce((acc, curr) => { acc[curr.gender.toLowerCase()] = curr.percentage; return acc; }, {}) || null,
    age: audienceSummaryData.ageGroupDistribution?.reduce((acc, curr) => { acc[curr.ageGroup] = curr.percentage; return acc; }, {}) || null,
    country: audienceSummaryData.countryViewers?.reduce((acc, curr) => { acc[curr.country] = curr.percentage; return acc; }, {}) || null,
    trafficSources: { labels: audienceSummaryData.trafficSources?.map(item => translateSourceType(item.sourceType)) || [], data: audienceSummaryData.trafficSources?.map(item => item.percentage) || [] },
    commentSentiment: {},
  };

  // ========================== 레이더 차트 데이터 계산 로직 ==========================
  const calculateRadarScores = () => {
    // 1. 성장성 (0~100점)
    const topSubGain = topSubscriberVideosData[0]?.subscriberGained || 0;
    const growthTarget = Math.max(stats.subscriberCount * 0.001, 10);
    const growthScore = Math.min((topSubGain / growthTarget) * 100, 100);

    // 2. 콘텐츠 파워 (0~100점)
    const topWatchTime = topViewDurationVideosData[0]?.avgWatchTime || 0;
    const contentPowerTarget = 300; // 5분
    const contentPowerScore = Math.min((topWatchTime / contentPowerTarget) * 100, 100);

    // 3. 시청자 반응 (0~100점)
    const recentPerformance = recentVideosData.reduce((acc, v) => {
        acc.views += v.viewCount || 0;
        acc.likes += v.likeCount || 0;
        acc.comments += v.commentCount || 0;
        return acc;
    }, { views: 0, likes: 0, comments: 0 });
    const engagementRate = recentPerformance.views > 0 ? ((recentPerformance.likes + recentPerformance.comments) / recentPerformance.views) * 100 : 0;
    const engagementTarget = 5; // 5%
    const engagementScore = Math.min((engagementRate / engagementTarget) * 100, 100);

    // 4. 트래픽 다양성 (0~100점)
    const topTrafficSource = Math.max(...(audience.trafficSources.data || [0]));
    const diversityScore = 100 - topTrafficSource;

    // 5. 타겟 집중도 (0~100점)
    const topAgeGroupPercentage = Math.max(...Object.values(audience.age || {}));
    const focusScore = topAgeGroupPercentage || 0;

    // 6. 채널 규모 (0~100점, 로그 스케일)
    const volumeTarget = 100000; // 10만 구독자
    const volumeScore = stats.subscriberCount > 0 ? Math.min((Math.log10(stats.subscriberCount) / Math.log10(volumeTarget)) * 100, 100) : 0;
    
    return {
        labels: ['성장성', '콘텐츠 파워', '시청자 반응', '트래픽 다양성', '타겟 집중도', '채널 규모'],
        scores: [growthScore, contentPowerScore, engagementScore, diversityScore, focusScore, volumeScore].map(s => s.toFixed(0))
    };
  };

  const radarData = calculateRadarScores();
  // ==============================================================================

  return {
    contentPerformance: { recentVideos, topSubscriberVideos, topViewDurationVideos },
    stats,
    audience,
    radarData,
  };
};