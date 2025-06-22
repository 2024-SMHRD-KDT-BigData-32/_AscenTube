// src/api/contentsApi.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8082/AscenTube';

/**
 * 시간(hour) 값을 시간대 이름으로 매핑합니다.
 * @param {number} hour - 0부터 23까지의 시간 값
 * @returns {string} 해당 시간대 이름 (예: '새벽', '오전', '오후', '저녁', '심야')
 */
const mapHourToTimeZone = (hour) => {
    if (hour >= 0 && hour <= 6) return '새벽'; // 00:00 ~ 06:59
    if (hour >= 7 && hour <= 11) return '오전'; // 07:00 ~ 11:59
    if (hour >= 12 && hour <= 17) return '오후'; // 12:00 ~ 17:59
    if (hour >= 18 && hour <= 21) return '저녁'; // 18:00 ~ 21:59
    if (hour >= 22 && hour <= 23) return '심야'; // 22:00 ~ 23:59
    return '알 수 없음';
};

/**
 * 콘텐츠 페이지에 필요한 모든 데이터를 백엔드 API로부터 가져옵니다.
 *
 * @param {string} period - 데이터를 가져올 기간 (예: 'month', 'week', 'day'). 기본값은 'month'.
 * @returns {Promise<{allVideos: Array, statistics: Object}>}
 * allVideos: 최신 및 인기 영상 데이터 배열
 * statistics: 요일별, 시간대별, 길이별, 유입경로별, 기기별 통계 데이터 객체
 */
export const fetchContentsPageData = async (period = 'month') => { // period 매개변수 추가
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.error('API 호출 실패: JWT 토큰이 없습니다.');
        throw new Error('JWT 토큰이 없습니다. 로그인해주세요.');
    }

    const channelId = localStorage.getItem('user_youtube_channel_id');
    if (!channelId) {
        console.error('API 호출 실패: YouTube 채널 ID가 없습니다.');
        throw new Error('YouTube 채널 ID가 없습니다.');
    }

    const commonHeaders = { 'Authorization': `Bearer ${token}` };
    
    // API 엔드포인트 정의
    const dashboardSummaryUrl = `${API_BASE_URL}/channel/my-channel/dashboard-summary`;
    const latestVideoPerformanceUrl = `${API_BASE_URL}/channel/my-channel/latest-video-performance`;
    const uploadViewsByHourUrl = `${API_BASE_URL}/channel/my-channel/upload-views-by-hour-of-day`; 
    // ⭐ [수정] 영상 길이별 조회수 API URL을 정확히 변경합니다.
    const viewsByVideoLengthUrl = `${API_BASE_URL}/channel/my-channel/views-by-video-length`; 
    const uploadViewsByDayOfWeekUrl = `${API_BASE_URL}/channel/my-channel/upload-views-by-day-of-week`; 
    const viewsByTrafficSourceUrl = `${API_BASE_URL}/channel/my-channel/views-by-traffic-source`; // 추가
    const viewsByDeviceUrl = `${API_BASE_URL}/channel/my-channel/views-by-device`; // 추가


    // 각 API 호출에 사용할 파라미터 객체
    const commonParams = { channelId };
    const latestVideoParams = { channelId, limit: 20 }; // 최신 영상은 limit 파라미터도 함께 보냄
    // ⭐ [수정] viewsByVideoLengthUrl에 period 파라미터 추가
    const viewsByVideoLengthParams = { channelId, period };
    const dayOfWeekParams = { channelId, period }; // 요일별 API도 period 파라미터 사용

    console.log('🚀 Contents API 요청 전송 시작:', {
        dashboardSummaryUrl,
        latestVideoPerformanceUrl,
        uploadViewsByHourUrl,
        viewsByVideoLengthUrl, // URL 변수명 변경
        uploadViewsByDayOfWeekUrl,
        viewsByTrafficSourceUrl, // 추가
        viewsByDeviceUrl, // 추가
        commonParams,
        viewsByVideoLengthParams, // 새로운 파라미터 로그 추가
        dayOfWeekParams, // 새로운 파라미터 로그 추가
        token: token ? `Bearer ${token.substring(0, 15)}...` : null
    });

    try {
        const [
            dashboardSummaryRes,
            latestVideosRes,
            uploadViewsByHourRes,
            viewsByVideoLengthRes, // 변수명 변경
            uploadViewsByDayOfWeekRes, 
            viewsByTrafficSourceRes, // 추가
            viewsByDeviceRes, // 추가
        ] = await Promise.allSettled([
            axios.get(dashboardSummaryUrl, { headers: commonHeaders, params: commonParams }),
            axios.get(latestVideoPerformanceUrl, { headers: commonHeaders, params: latestVideoParams }),
            axios.get(uploadViewsByHourUrl, { headers: commonHeaders, params: commonParams }),
            // ⭐ [수정] viewsByVideoLengthUrl 호출 시 viewsByVideoLengthParams 사용
            axios.get(viewsByVideoLengthUrl, { headers: commonHeaders, params: viewsByVideoLengthParams }), 
            axios.get(uploadViewsByDayOfWeekUrl, { headers: commonHeaders, params: dayOfWeekParams }), 
            axios.get(viewsByTrafficSourceUrl, { headers: commonHeaders, params: commonParams }), // 추가
            axios.get(viewsByDeviceUrl, { headers: commonHeaders, params: commonParams }), // 추가
        ]);

        const processResponse = (res, url) => {
            if (res.status === 'fulfilled') {
                if (res.value.status === 200 && res.value.data) {
                    console.log(`✅ API 응답 성공 (${url}):`, res.value.data);
                    return res.value.data;
                } else if (res.value.status === 204) {
                    console.warn(`⚠️ 데이터 없음 (204 No Content) from ${url}`);
                    return null; // 데이터 없음은 null로 처리
                } else {
                    console.error(`❌ API 응답 오류 (${url} - ${res.value.status}):`, res.value.data || res.value.statusText);
                    return null; // 응답 오류는 null로 처리
                }
            }
            console.error(`❌ API 호출 실패 (네트워크/Promise rejected - ${url}):`, res.reason);
            // Promise rejected 시, URL에 따라 적절한 기본값을 반환
            if (url.includes('dashboard-summary')) return { genderRatio: [], ageGroupDistribution: [], countryViewers: [], trafficSources: [], deviceDistribution: [] };
            if (url.includes('latest-video-performance')) return [];
            if (url.includes('upload-views-by-hour-of-day')) return []; // 시간대별은 배열 예상
            // ⭐ [수정] views-by-video-length 실패 시 빈 배열 반환
            if (url.includes('views-by-video-length')) return []; 
            if (url.includes('upload-views-by-day-of-week')) return []; // 요일별은 배열 예상
            if (url.includes('views-by-traffic-source')) return []; // 배열 예상
            if (url.includes('views-by-device')) return []; // 배열 예상
            return null; // 그 외는 null
        };

        const dashboardSummaryData = processResponse(dashboardSummaryRes, dashboardSummaryUrl);
        const latestVideosData = processResponse(latestVideosRes, latestVideoPerformanceUrl);
        const uploadViewsByHourData = processResponse(uploadViewsByHourRes, uploadViewsByHourUrl);
        // ⭐ [수정] viewsByVideoLengthData 변수 사용
        const viewsByVideoLengthData = processResponse(viewsByVideoLengthRes, viewsByVideoLengthUrl); 
        const uploadViewsByDayOfWeekData = processResponse(uploadViewsByDayOfWeekRes, uploadViewsByDayOfWeekUrl);
        const viewsByTrafficSourceData = processResponse(viewsByTrafficSourceRes, viewsByTrafficSourceUrl); // 추가
        const viewsByDeviceData = processResponse(viewsByDeviceRes, viewsByDeviceUrl); // 추가

        console.log("DEBUG: dashboardSummaryData (전체):", dashboardSummaryData);
        console.log("DEBUG: uploadViewsByDayOfWeekData (요일별 데이터):", uploadViewsByDayOfWeekData);
        // ⭐ [수정] viewsByVideoLengthData 로그
        console.log("DEBUG: viewsByVideoLengthData parsed:", viewsByVideoLengthData); 
        console.log("DEBUG: viewsByTrafficSourceData parsed:", viewsByTrafficSourceData); // 추가
        console.log("DEBUG: viewsByDeviceData parsed:", viewsByDeviceData); // 추가

        const allVideos = (latestVideosData || []).map(v => ({
            videoId: v.videoKey,
            title: v.videoTitle,
            views: v.viewCount,
            likes: v.likeCount,
            comments: v.commentCount,
            thumb: v.thumbnailUrl,
            url: `http://youtube.com/watch?v=${v.videoKey}`, // YouTube URL 형식 수정
            uploadDate: v.uploadedAt ? v.uploadedAt.split('T')[0] : '--',
            uploadTime: v.uploadedAt ? v.uploadedAt.split('T')[1].substring(0, 5) : '--:--',
            length: v.videoPlaytime ? (v.videoPlaytime / 60).toFixed(1) : 0, 
        }));

        // statistics 데이터 구성
        const statistics = {
            // ⭐ [업로드 요일별 분포] - 이제 `uploadViewsByDayOfWeekData`를 사용합니다.
            // 백엔드에서 [{"dayOfWeekName": "월요일", "views": 60}, ...] 형태로 온다고 가정
            uploadCountByDay: (uploadViewsByDayOfWeekData || []).reduce((acc, curr) => {
                // 요일 순서 보장을 위해 백엔드에서 정렬된 상태로 오거나, 프론트에서 특정 순서를 정의해야 합니다.
                // 현재는 데이터에 있는 순서대로 객체를 구성합니다.
                if (curr.dayOfWeekName && curr.views !== undefined) {
                    acc[curr.dayOfWeekName] = curr.views;
                }
                return acc;
            }, {}),
            
            // 업로드 시간대별 조회수
            uploadCountByTimeZone: (uploadViewsByHourData || []).reduce((acc, curr) => {
                if (curr.hour !== undefined && curr.views !== undefined) {
                    const timeZone = mapHourToTimeZone(curr.hour);
                    acc[timeZone] = (acc[timeZone] || 0) + curr.views; 
                }
                return acc;
            }, {}),

            // ⭐ [수정] 영상 길이별 평균 조회수 - viewsByVideoLengthData 사용 (배열 형태)
            // { lengthSegment: "0-1분", viewsCount: 1676, percentage: 97.5 } 형태의 배열
            avgViewsByLength: (viewsByVideoLengthData || []).map(item => ({
                lengthSegment: item.lengthSegment,
                viewsCount: item.viewsCount,
                percentage: item.percentage
            })),
            
            // 유입경로 분석
            viewsByTrafficSource: (() => {
                const data = dashboardSummaryData?.trafficSources || viewsByTrafficSourceData || []; // 두 곳에서 데이터 가져올 수 있도록
                const labels = data.map(item => item.sourceType);
                const values = data.map(item => item.percentage);
                const percents = data.map(item => item.percentage);
                return { labels, values, percents };
            })(),

            // 기기 접속 환경
            viewsByDevice: (() => {
                const data = dashboardSummaryData?.deviceDistribution || viewsByDeviceData || []; // 두 곳에서 데이터 가져올 수 있도록
                const labels = data.map(item => item.deviceType);
                const values = data.map(item => item.viewsCount);
                const percents = data.map(item => item.percentage);
                return { labels, values, percents };
            })(),

            // 성별 시청자 비율
            genderRatio: (() => {
                const data = dashboardSummaryData?.genderRatio || [];
                const labels = data.map(item => item.gender);
                const values = data.map(item => item.percentage);
                const percents = data.map(item => item.percentage);
                return { labels, values, percents };
            })(),

            // 연령대별 시청자 분포
            ageGroupDistribution: (() => {
                const data = dashboardSummaryData?.ageGroupDistribution || [];
                const labels = data.map(item => item.ageGroup);
                const values = data.map(item => item.percentage);
                const percents = data.map(item => item.percentage);
                return { labels, values, percents };
            })(),

            // 국가별 시청자 (조회수 기준)
            countryViewers: (() => {
                const data = dashboardSummaryData?.countryViewers || [];
                const labels = data.map(item => item.country);
                const values = data.map(item => item.viewsCount);
                const percents = data.map(item => item.percentage);
                return { labels, values, percents };
            })(),
        };
        
        console.log("DEBUG: Final statistics object processed:", statistics);

        return {
            allVideos: allVideos,
            statistics: statistics,
        };

    } catch (error) {
        console.error("fetchContentsPageData 최상위 API 호출 실패:", error);
        // 에러 발생 시 모든 통계 데이터를 빈 값으로 초기화하여 UI가 깨지지 않도록 함
        return {
            allVideos: [],
            statistics: {
                uploadCountByDay: {},
                uploadCountByTimeZone: {},
                avgViewsByLength: [], // 빈 배열로 변경
                viewsByTrafficSource: { labels: [], values: [], percents: [] },
                viewsByDevice: { labels: [], values: [], percents: [] },
                genderRatio: { labels: [], values: [], percents: [] },
                ageGroupDistribution: { labels: [], values: [], percents: [] },
                countryViewers: { labels: [], values: [], percents: [] },
            },
        };
    }
};