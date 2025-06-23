import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8082/AscenTube',
});

/**
 * [수정] 채널의 댓글 분석 요약 데이터를 가져오는 함수로 변경되었습니다.
 * 기존 AI 전략 리포트가 아닌, 댓글 분석 API를 호출합니다.
 * @param {string} channelId - 분석할 유튜브 채널의 ID
 * @returns {Promise<Object|null>} - 댓글 분석 결과 객체 또는 실패 시 null
 */
export const fetchAiStrategyReport = async (channelId) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.warn("인증 토큰('access_token')을 찾을 수 없습니다. 로그인 상태를 확인하세요.");
        return null;
    }

    // [수정] channelId가 없는 경우를 방지하는 로직을 추가하여 안정성을 높였습니다.
    if (!channelId) {
        console.error("API 호출 에러: channelId가 제공되지 않았습니다.");
        return null;
    }

    try {
        // [수정] 댓글 분석 페이지와 동일한 최신 데이터를 가져오기 위해,
        // API 엔드포인트와 파라미터를 변경했습니다.
        
        // 기간을 'weekly'에서 'quarter'(분기)로 변경했습니다.
        const period = 'quarter'; 
        
        const response = await apiClient.get('/channel/my-channel/comment-analysis-summary', {
            headers: { 
                'Authorization': `Bearer ${token}` 
            },
            params: { 
                channelId, 
                period 
            }
        });

        // [수정] 응답 데이터를 바로 반환하도록 로직을 단순화했습니다.
        return response.data;

    } catch (error) {
        // [수정] 에러 로그를 더 상세하게 표시하도록 개선했습니다.
        console.error("AI 페이지용 데이터 로딩 중 에러 발생:", error);
        if (error.response) {
            console.error("서버 응답:", error.response.data);
        }
        return null;
    }
};