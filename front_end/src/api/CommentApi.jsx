import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8082/AscenTube',
});

/**
 * 채널의 댓글 분석 요약 데이터를 서버로부터 가져옵니다.
 * @param {string} channelId - 분석할 채널의 ID
 * @param {string} period - 분석 기간 ('daily', 'weekly', 'monthly', 'quarter')
 * @returns {Promise<object|null>} API 응답 데이터 또는 실패 시 null
 */
export const fetchCommentAnalysisSummary = async (channelId, period) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.warn("인증 토큰('access_token')을 찾을 수 없습니다. 로그인 상태를 확인하세요.");
        return null;
    }

    // channelId가 없는 경우를 미리 방지합니다.
    if (!channelId) {
        console.error("API 호출 에러: channelId가 제공되지 않았습니다.");
        return null;
    }

    try {
        const response = await apiClient.get('/channel/my-channel/comment-analysis-summary', {
            headers: {
                'Authorization': `Bearer ${token}`
            },
            params: {
                channelId,
                // 기본 요청 기간을 'quarter'(분기)로 설정합니다.
                period: period || 'quarter'
            }
        });
        return response.data;

    } catch (error) {
        console.error("댓글 분석 데이터 로딩 중 에러 발생:", error);
        if (error.response) {
            console.error("서버 응답:", error.response.data);
        }
        return null;
    }
};