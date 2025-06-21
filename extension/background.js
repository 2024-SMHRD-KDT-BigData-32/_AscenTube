// background.js (v7.1.0 - 최종 안정화 버전)
const DEBUG_PREFIX_BG = "[관심 채널 BG v7.1.0] ";
const USER_DATA_STORAGE_KEY = 'ascenTubeUserData';
// 중요: 백엔드 서버는 반드시 https를 사용해야 합니다.
const FAVORITE_CHANNELS_API_URL = 'https://localhost:8082/AscenTube/api/ascen/user/me/favorite-channels';

console.log(DEBUG_PREFIX_BG + "서비스 워커 시작됨.");

// storage에서 사용자 데이터를 가져오는 함수
async function getStoredUserData() {
    try {
        const data = await chrome.storage.local.get([USER_DATA_STORAGE_KEY]);
        return data[USER_DATA_STORAGE_KEY] || null;
    } catch (e) {
        console.error(DEBUG_PREFIX_BG + "저장된 사용자 데이터 로드 실패:", e);
        return null;
    }
}

// storage에 사용자 데이터를 저장하는 함수
async function storeUserData(userData) {
    try {
        await chrome.storage.local.set({ [USER_DATA_STORAGE_KEY]: userData });
        console.log(DEBUG_PREFIX_BG + "사용자 데이터 저장 완료.");
    } catch (e) {
        console.error(DEBUG_PREFIX_BG + "사용자 데이터 저장 실패:", e);
    }
}

// 백엔드 API로부터 관심 채널 정보를 가져오는 함수
async function fetchFavoriteChannelsInfo() {
    const userData = await getStoredUserData();
    if (!userData?.token) {
        // 토큰이 없으면 API를 호출하지 않고 빈 배열을 반환하도록 수정
        console.warn(DEBUG_PREFIX_BG + "토큰이 없어 API를 호출하지 않습니다.");
        return []; 
    }
    
    console.log(DEBUG_PREFIX_BG + "API 호출 시도:", FAVORITE_CHANNELS_API_URL);
    try {
        const response = await fetch(FAVORITE_CHANNELS_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${userData.token}`
            }
        });

        if (!response.ok) {
            // API 서버가 에러 코드를 반환한 경우
            throw new Error(`API 서버 응답 오류: ${response.status} ${response.statusText}`);
        }

        const rawData = await response.json();
        console.log(DEBUG_PREFIX_BG + "백엔드로부터 받은 원본 데이터:", rawData);

        if (!Array.isArray(rawData)) {
            console.error(DEBUG_PREFIX_BG + "API 응답이 배열 형식이 아닙니다.");
            return [];
        }
        
        // content.js가 필요한 형태로 데이터 가공
        const processedData = rawData.map(item => {
            const cnlUrl = item.cnlUrl || '';
            const handleMatch = cnlUrl.match(/@[\w.-]+/);
            return {
                ucId: item.cnlId || null,
                handle: handleMatch ? handleMatch[0] : null,
                cnlName: item.cnlName || "이름 없음"
            };
        }).filter(item => item.ucId || item.handle);

        console.log(DEBUG_PREFIX_BG + "content.js로 전달할 가공된 관심 채널 정보:", processedData);
        return processedData;

    } catch (error) {
        // fetch 자체의 실패(네트워크 오류, CORS 등)
        console.error(DEBUG_PREFIX_BG + "백엔드 API 호출 중 오류 발생:", error);
        // 오류 발생 시에도 안정적으로 빈 배열을 반환
        return []; 
    }
}


// 모든 메시지를 안정적으로 처리하는 단일 리스너
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    const messageType = message.type;
    console.log(DEBUG_PREFIX_BG + `메시지 수신: ${messageType}`);

    if (messageType === "GET_FAVORITE_CHANNELS_INFO") {
        fetchFavoriteChannelsInfo()
            .then(channelsInfo => {
                sendResponse({ success: true, favoriteChannelsData: channelsInfo });
            })
            .catch(error => {
                // fetchFavoriteChannelsInfo 내부에서 오류를 처리하므로, 여기서는 거의 호출되지 않음
                sendResponse({ success: false, error: error.message, favoriteChannelsData: [] });
            });
        return true; // 비동기 응답을 위해 true 반환
    }
    
    else if (messageType === "SET_USER_DATA_FROM_WEB") {
        const userData = {
            token: message.token,
            userName: message.userName,
            userEmail: message.userEmail,
            googleId: message.googleId
        };
        storeUserData(userData).then(() => {
            sendResponse({ success: true });
        });
        return true; // 비동기 응답
    }

    else if (messageType === "GET_USER_STATUS") {
        getStoredUserData()
            .then(userData => {
                sendResponse({ isLoggedIn: !!userData?.token, userName: userData?.userName });
            })
            .catch(() => {
                sendResponse({ isLoggedIn: false });
            });
        return true; // 비동기 응답
    }
});