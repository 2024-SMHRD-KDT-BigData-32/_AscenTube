import axios from 'axios';

const API_BASE_URL = 'http://localhost:8082/AscenTube';

export const fetchTrendingVideosByPeriod = async (token, userId, categoryId, period) => {
  if (!token || !userId) {
    console.error("API 호출 실패: 인증 토큰 또는 유저 ID가 없습니다.");
    return null;
  }

  const requestUrl = `${API_BASE_URL}/data/trending`;
  const requestParams = {
    userId,
    categoryId,
    period,
    regionCode: 'KR',
    maxResults: 50
  };

  console.log('🚀 API 요청 전송:', {
    url: requestUrl,
    params: requestParams,
    token: token ? `Bearer ${token.substring(0, 15)}...` : null
  });

  try {
    const response = await axios.get(requestUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      },
      params: requestParams
    });

    console.log('✅ API 응답 성공:', response.data);
    return response.data;
  } catch (error) {
    console.error(`❌ ${period} 인기 동영상 조회 실패:`, error);

    if (error.response) {
      console.error('🔥 서버 응답 데이터:', error.response.data);
      console.error('🔥 서버 응답 상태:', error.response.status);
      console.error('🔥 서버 응답 헤더:', error.response.headers);
    } else if (error.request) {
      console.error('🚫 서버로부터 응답을 받지 못했습니다:', error.request);
    } else {
      console.error('💥 요청 설정 중 에러 발생:', error.message);
    }
    return null;
  }
};

export const fetchTotalViewsForCategory = async (categoryId, token, userId) => {
    if (!token || !userId) {
      console.error("API 호출 실패: 인증 토큰 또는 유저 ID가 없습니다.");
      return 0;
    }

    const requestUrl = `${API_BASE_URL}/data/trending`;
    const requestParams = { userId, categoryId, regionCode: 'KR', maxResults: 10 };

    console.log('🚀 API 요청 전송:', {
      url: requestUrl,
      params: requestParams,
      token: token ? `Bearer ${token.substring(0, 15)}...` : null
    });

    try {
        const response = await axios.get(requestUrl, {
            headers: { 'Authorization': `Bearer ${token}` },
            params: requestParams
        });
        const totalViews = response.data.reduce((sum, video) => {
            const views = parseInt(video.statistics.viewCount, 10);
            return sum + (isNaN(views) ? 0 : views);
        }, 0);
        console.log(`✅ 카테고리(ID:${categoryId}) 조회수 합산 성공: ${totalViews}`);
        return totalViews;
    } catch (error) {
        console.error(`❌ 카테고리(ID:${categoryId}) 조회수 합산 실패:`, error.response || error);
        if (error.response) {
          console.error('🔥 서버 응답 데이터:', error.response.data);
          console.error('🔥 서버 응답 상태:', error.response.status);
          console.error('🔥 서버 응답 헤더:', error.response.headers);
        } else if (error.request) {
          console.error('🚫 서버로부터 응답을 받지 못했습니다:', error.request);
        } else {
          console.error('💥 요청 설정 중 에러 발생:', error.message);
        }
        return 0;
    }
};

export const fetchCommentAnalysis = async (token, videoId) => {
  if (!token || !videoId) {
    console.error("API 호출 실패: 인증 토큰 또는 비디오 ID가 없습니다.", { token: token ? `Bearer ${token.substring(0, 15)}...` : null, videoId });
    return null;
  }

  // videoId가 숫자형이어야 함을 확인
  const parsedVideoId = parseInt(videoId);
  if (isNaN(parsedVideoId)) {
    console.error("❌ 비디오 ID가 숫자형이 아닙니다:", { videoId });
    return null;
  }

  const requestUrl = `${API_BASE_URL}/channel/videos/comment-analysis`;
  const requestParams = { videoId: parsedVideoId }; // 숫자형으로 변환

  console.log('🚀 API 요청 전송:', {
    url: requestUrl,
    params: requestParams,
    token: token ? `Bearer ${token.substring(0, 15)}...` : null
  });

  try {
    const response = await axios.get(requestUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      params: requestParams,
    });
    console.log('✅ 댓글 분석 API 응답 성공:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ 댓글 분석 조회 실패:', error);
    if (error.response) {
      console.error('🔥 서버 응답 데이터:', error.response.data);
      console.error('🔥 서버 응답 상태:', error.response.status);
      console.error('🔥 서버 응답 헤더:', error.response.headers);
    } else if (error.request) {
      console.error('🚫 서버로부터 응답을 받지 못했습니다:', error.request);
    } else {
      console.error('💥 요청 설정 중 에러 발생:', error.message);
    }
    return null;
  }
};