import axios from 'axios';

// API 기본 주소를 상수로 관리합니다.
const API_BASE_URL = 'http://localhost:8082/AscenTube';

/**
 * 특정 영상 ID에 대한 AI 기반 분석 데이터를 요청합니다.
 * @param {string} videoId - 분석할 YouTube 영상의 ID
 * @param {string} token - 사용자의 인증 토큰 (Bearer)
 * @returns {Promise<object|null>} 분석 결과 데이터 또는 실패 시 null
 */
export const fetchVideoAnalysis = async (videoId, token) => {
  // --- 1. API 호출 전 필수 값 확인 ---
  if (!videoId) {
    console.error("API 호출 실패: videoId가 제공되지 않았습니다.");
    throw new Error("분석할 영상의 ID가 없습니다.");
  }
  if (!token) {
    console.error("API 호출 실패: 인증 토큰이 없습니다.");
    // 이 에러는 컴포넌트 단에서 로그인 여부를 확인하여 처리하는 것이 더 좋습니다.
    throw new Error("인증 정보가 없습니다. 로그인해주세요.");
  }

  // --- 2. API 호출 ---
  const requestUrl = `${API_BASE_URL}/api/ai/youtube/video-analysis/${videoId}`;
  console.log('🚀 영상 분석 API 요청:', requestUrl);

  try {
    const response = await axios.get(requestUrl, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ 영상 분석 API 응답 성공:', response.data);
    return response.data; // 성공 시, 백엔드로부터 받은 데이터 전체를 반환합니다.

  } catch (error) {
    // --- 3. 상세한 에러 처리 ---
    console.error(`❌ 영상(ID:${videoId}) 분석 실패:`, error);
    if (error.response) {
      // 서버에서 의도적으로 보낸 에러 (예: 404, 401, 500)
      console.error('🔥 서버 응답 데이터:', error.response.data);
      console.error('🔥 서버 응답 상태:', error.response.status);
      // 컴포넌트에서 에러 메시지를 사용할 수 있도록 서버가 보낸 에러를 그대로 던져줍니다.
      throw new Error(error.response.data?.error || `서버 에러 (상태: ${error.response.status})`);
    } else if (error.request) {
      // 네트워크 문제 등으로 서버로부터 응답을 받지 못한 경우
      console.error('🚫 서버로부터 응답을 받지 못했습니다.');
      throw new Error("서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.");
    } else {
      // 요청을 설정하는 중에 발생한 에러
      console.error('💥 요청 설정 중 에러 발생:', error.message);
      throw new Error("요청을 보내는 중 문제가 발생했습니다.");
    }
  }
};