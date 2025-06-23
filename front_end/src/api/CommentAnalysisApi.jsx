// src/api/commentAnalysisApi.js

/**
 * 특정 동영상에 대한 댓글 분석 데이터를 가져오는 함수.
 * @param {string} token - 인증 토큰.
 * @param {string} videoId - 분석할 동영상의 ID.
 * @returns {Promise<Object>} 댓글 분석 데이터.
 * @throws {Error} API 호출 실패 시 에러 발생.
 */
export const fetchCommentAnalysis = async (token, videoId) => {
    // 서버 주소를 정확히 반영합니다.
    const baseUrl = 'http://localhost:8082/AscenTube';
    const url = `${baseUrl}/channel/videos/comment-analysis?videoId=${videoId}`;

    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`, // 인증 토큰 포함
            },
        });

        if (!response.ok) {
            let errorMessage = `댓글 분석 데이터를 가져오는 데 실패했습니다. (HTTP ${response.status})`;
            try {
                const errorData = await response.json();
                errorMessage = errorData?.message || errorMessage;
            } catch (_) {
                // 응답이 JSON이 아닐 수도 있으므로 무시
            }
            throw new Error(errorMessage);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("❌ 댓글 분석 API 호출 중 오류 발생:", error.message || error);
        throw error;
    }
};
