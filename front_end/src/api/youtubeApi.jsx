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
    maxResults: 10
  };

  // ✨ 1. 우리가 백엔드에 보내는 요청 정보를 먼저 콘솔에 찍어봅니다.
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
    console.log('✅ API 응답 성공:', response.data); // 성공 시 데이터 출력
    return response.data;
  } catch (error) {
    // ✨ 2. 에러가 발생했을 때, 모든 정보를 상세하게 출력합니다.
    console.error(`❌ ${period} 인기 동영상 조회 실패:`, error);

    if (error.response) {
      // 서버가 응답을 했지만, 상태 코드가 2xx가 아닌 경우 (예: 500, 404, 401)
      console.error('🔥 서버 응답 데이터:', error.response.data);
      console.error('🔥 서버 응답 상태:', error.response.status);
      console.error('🔥 서버 응답 헤더:', error.response.headers);
    } else if (error.request) {
      // 요청은 보냈지만, 응답을 받지 못한 경우 (네트워크 문제, CORS 등)
      console.error('🚫 서버로부터 응답을 받지 못했습니다:', error.request);
    } else {
      // 요청을 설정하는 중에 에러가 발생한 경우
      console.error('💥 요청 설정 중 에러 발생:', error.message);
    }
    return null;
  }
};