// src/api/keywordApi.jsx

import axios from 'axios';

// --- Axios 인스턴스 (기존과 동일) ---
const apiClient = axios.create({
    baseURL: 'http://localhost:8082/AscenTube',
});


// --- Helper Functions (새로 추가) ---
// 숫자를 '만', '억' 단위의 문자열로 변환 (예: 125000 -> "12.5만회")
const formatViews = (views) => {
    if (views >= 100000000) {
        return `${(views / 100000000).toFixed(1)}억회`;
    }
    if (views >= 10000) {
        return `${(views / 10000).toFixed(1)}만회`;
    }
    return `${views}회`;
};

// ISO 날짜 형식(YYYY-MM-DDTHH:mm:ss)을 YY.MM.DD로 변환
const formatDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}.${month}.${day}`;
};


// --- API 호출 함수들 ---

/**
 * 채널 키워드 데이터를 가져오는 함수 (기존과 동일)
 */
export const fetchChannelKeywords = async (channelId, limit = 50) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.warn("인증 토큰('access_token')을 찾을 수 없습니다. 로그인 상태를 확인하세요.");
        return [];
    }

    try {
        const response = await apiClient.get('/channel/my-channel/keywords', {
            params: { channelId, limit },
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (Array.isArray(response.data)) {
            return response.data.map(item => ({
                text: item.text,
                value: item.weight
            }));
        } else {
            console.error("키워드 API 응답이 배열 형식이 아닙니다.", response.data);
            return [];
        }
    } catch (error) {
        console.error("채널 키워드 데이터를 가져오는 중 오류 발생", error);
        return [];
    }
};


/**
 * 채널의 키워드를 기반으로 연관 인기 동영상을 가져오는 함수 (새로 추가)
 */
export const fetchRelatedPopularVideos = async (channelId, totalResultLimit = 8, keywordLimit = 5) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.warn("인증 토큰('access_token')을 찾을 수 없습니다. 로그인 상태를 확인하세요.");
        return [];
    }
    try {
        const response = await apiClient.get('/channel/my-channel/popular-videos-by-keywords', {
            params: {
                channelId,
                totalResultLimit,
                keywordLimit,
                videoCategoryId: '' // videoCategoryId는 현재 사용하지 않으므로 빈 값으로 전달
            },
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (Array.isArray(response.data)) {
            // API 응답 데이터를 프론트엔드에서 사용하기 좋은 형태로 변환
            return response.data.map(video => ({
                id: video.videoKey,
                title: video.videoTitle,
                thumbnailUrl: video.thumbnailUrl,
                channel: video.channelTitle,
                date: formatDate(video.publishedAt),
                views: formatViews(video.viewsCount),
                hreflink: `https://www.youtube.com/watch?v=${video.videoKey}`
            }));
        } else {
            console.error("연관 동영상 API 응답이 배열 형식이 아닙니다.", response.data);
            return [];
        }
    } catch (error) {
        console.error("연관 인기 동영상 데이터를 가져오는 중 오류 발생", error);
        return [];
    }
};