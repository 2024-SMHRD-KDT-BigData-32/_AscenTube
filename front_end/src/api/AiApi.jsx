// src/api/aiApi.jsx

import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8082/AscenTube',
});

/**
 * 채널 ID를 기반으로 AI 전략 분석 리포트를 가져오는 함수
 * (Gemini API 등을 호출하는 백엔드 API라고 가정)
 * @param {string} channelId - 분석할 유튜브 채널의 ID
 * @returns {Promise<Object|null>} - AI 분석 결과 객체 또는 실패 시 null
 */
export const fetchAiStrategyReport = async (channelId) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.warn("인증 토큰('access_token')을 찾을 수 없습니다. 로그인 상태를 확인하세요.");
        return null;
    }

    try {
        // [가정] 백엔드에 만들어질 AI 분석 API 엔드포인트
        const response = await apiClient.get('/ai/strategy-report', {
            params: { channelId },
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // 백엔드 응답이 예상한 형식인지 확인하고 반환
        if (response.data && response.data.strategyProposals) {
            return response.data;
        } else {
            console.error("AI 전략 리포트 API의 응답 형식이 올바르지 않습니다.", response.data);
            return null;
        }

    } catch (error) {
        console.error("AI 전략 리포트를 가져오는 중 오류 발생", error);
        return null; // 에러 발생 시 null 반환
    }
};