import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8082/AscenTube',
});

/**
 * AI 페이지를 위한 AI 기반 채널 전략 리포트를 가져오는 함수.
 * GeminiAnalysisService의 analyzeChannelWithAi 메소드를 호출하는 백엔드 API와 연동합니다.
 * @param {string} channelId - 분석할 유튜브 채널의 ID
 * @returns {Promise<Object|null>} - AI 분석 결과 객체 (insightSummary, strategyProposals 포함) 또는 실패 시 null
 */
export const fetchAiStrategyReport = async (channelId) => {
    const token = localStorage.getItem('access_token');
    if (!token) {
        console.warn("인증 토큰('access_token')을 찾을 수 없습니다. 로그인 상태를 확인하세요.");
        return null;
    }

    if (!channelId) {
        console.error("API 호출 에러: channelId가 제공되지 않았습니다.");
        return null;
    }

    const userId = localStorage.getItem('user_google_id');
    if (!userId) {
        console.error("API 호출 에러: user_google_id를 찾을 수 없습니다. 로그인 상태를 확인하세요.");
        return null;
    }

    // myChannelTopic은 필요에 따라 동적으로 변경하거나, 현재는 기본값 사용
    const myChannelTopic = "유튜브 채널 콘텐츠"; 

    try {
        const response = await apiClient.get('/api/ai/youtube/channel-analysis', {
            headers: { 
                'Authorization': `Bearer ${token}` 
            },
            params: { 
                userId,
                channelId,
                myChannelTopic
            }
        });

        let rawAiText = response.data;
        let parsedAiAnalysis = null;

        // AI 응답 문자열에서 '```json' 마크다운 블록을 제거하는 로직을 추가합니다.
        if (typeof rawAiText === 'string') {
            const jsonStartIndex = rawAiText.indexOf("```json");
            const jsonEndIndex = rawAiText.lastIndexOf("```");

            if (jsonStartIndex !== -1 && jsonEndIndex !== -1 && jsonStartIndex < jsonEndIndex) {
                // "```json" 부분 이후부터, 마지막 "```" 이전까지 문자열 추출
                rawAiText = rawAiText.substring(jsonStartIndex + "```json".length, jsonEndIndex);
                rawAiText = rawAiText.trim(); // 앞뒤 공백 및 개행 문자 제거
            } else {
                console.warn("AI 응답이 예상되는 JSON 마크다운 형식으로 오지 않았습니다. 원본 그대로 파싱 시도.");
                // 마크다운 블록이 없어도 JSON일 수 있으므로 그대로 파싱 시도
                rawAiText = rawAiText.trim(); 
            }

            try {
                parsedAiAnalysis = JSON.parse(rawAiText);
                console.log("JSON.parse 성공 (AiApi):", parsedAiAnalysis);
            } catch (parseError) {
                console.error("AI 응답 JSON 파싱 중 오류 발생 (원본 문자열):", rawAiText, "오류:", parseError);
                // 호출하는 Ai.jsx에서 에러를 잡을 수 있도록 에러를 throw 합니다.
                throw new Error("AI 분석 데이터를 처리하는 중 오류가 발생했습니다.");
            }
        } else if (typeof rawAiText === 'object' && rawAiText !== null) {
            // axios가 이미 객체로 파싱해준 경우 (content-type이 application/json인 경우) 그대로 사용
            parsedAiAnalysis = rawAiText;
            console.log("AI 응답이 이미 객체입니다 (AiApi):", parsedAiAnalysis);
        } else {
            // 예상치 못한 응답 타입 처리
            console.error("예상치 못한 AI 응답 타입 (AiApi):", typeof rawAiText, rawAiText);
            throw new Error("AI 분석 데이터 형식이 올바르지 않습니다.");
        }
        
        // Ai.js에서 기대하는 구조 (insightSummary, strategyProposals)에 맞게 데이터를 변환합니다.
        const formattedData = {
            insightSummary: parsedAiAnalysis.channelAnalysis?.coreSummary || 'AI 요약 데이터가 없습니다.',
            strategyProposals: {
                // 백엔드의 actionableStrategies 배열을 Ai.js의 planning, timing, editing에 매핑합니다.
                // AI가 3가지 전략을 순서대로 잘 제공한다는 가정 하에 임시로 매핑합니다.
                planning: parsedAiAnalysis.actionableStrategies?.length > 0 
                          ? [`${parsedAiAnalysis.actionableStrategies[0].strategy}: ${parsedAiAnalysis.actionableStrategies[0].description}`] 
                          : [],
                timing: parsedAiAnalysis.actionableStrategies?.length > 1 
                        ? [`${parsedAiAnalysis.actionableStrategies[1].strategy}: ${parsedAiAnalysis.actionableStrategies[1].description}`] 
                        : [],
                editing: parsedAiAnalysis.actionableStrategies?.length > 2 
                         ? [`${parsedAiAnalysis.actionableStrategies[2].strategy}: ${parsedAiAnalysis.actionableStrategies[2].description}`] 
                         : [],
            }
        };

        return formattedData;

    } catch (error) {
        console.error("AI 전략 리포트 로딩 중 에러 발생:", error);
        if (axios.isAxiosError(error) && error.response) {
            console.error("서버 응답 데이터:", error.response.data);
            // 서버에서 보낸 에러 메시지가 있다면 사용하고, 없다면 일반 메시지 반환
            throw new Error(error.response.data.error || `서버에서 오류 응답 (${error.response.status})을 받았습니다.`);
        }
        // 네트워크 에러 등 다른 에러인 경우
        throw error;
    }
};