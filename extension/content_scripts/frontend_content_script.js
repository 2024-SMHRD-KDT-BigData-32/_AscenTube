// frontend_content_script.js (v2.9.3 - user_google_id 키 수정)
const DEBUG_PREFIX_FRONTEND_CS = "[AscenTube Frontend CS v2.9.3] ";
console.log(DEBUG_PREFIX_FRONTEND_CS + "Loaded and running on", window.location.href);

const ASCENTUBE_TOKEN_STORED_EVENT = 'ascenTubeTokenStored';

function sendUserDataToBackground() {
    console.log(DEBUG_PREFIX_FRONTEND_CS + "sendUserDataToBackground 함수 호출됨.");

    const tokenKey = 'access_token';
    // --- 여기를 수정했습니다 ---
    const googleIdKey = 'user_google_id'; // 'google_id'에서 'user_google_id'로 변경
    // -------------------------
    const userNameKey = 'user_name';
    const userEmailKey = 'user_email';

    const token = localStorage.getItem(tokenKey);
    const googleId = localStorage.getItem(googleIdKey); // 수정된 키로 값을 가져옵니다.
    const userName = localStorage.getItem(userNameKey);
    const userEmail = localStorage.getItem(userEmailKey);

    console.log(DEBUG_PREFIX_FRONTEND_CS + `localStorage에서 읽은 값:`);
    console.log(DEBUG_PREFIX_FRONTEND_CS + `  ${tokenKey}:`, token ? token.substring(0,10)+"..." : token);
    console.log(DEBUG_PREFIX_FRONTEND_CS + `  ${googleIdKey}:`, googleId); // 이제 이 값이 제대로 나와야 합니다.
    console.log(DEBUG_PREFIX_FRONTEND_CS + `  ${userNameKey}:`, userName);
    console.log(DEBUG_PREFIX_FRONTEND_CS + `  ${userEmailKey}:`, userEmail);

    if (token && typeof token === 'string' && googleId && typeof googleId === 'string') {
        console.log(DEBUG_PREFIX_FRONTEND_CS + "유효한 토큰과 Google ID 발견. 백그라운드로 메시지 전송 시도.");
        chrome.runtime.sendMessage({
            type: "SET_USER_DATA_FROM_WEB",
            token: token,
            userName: userName,
            userEmail: userEmail,
            googleId: googleId
        }, response => {
            if (chrome.runtime.lastError) {
                console.error(DEBUG_PREFIX_FRONTEND_CS + "백그라운드로 사용자 데이터 전송 중 오류:", chrome.runtime.lastError.message);
            } else {
                console.log(DEBUG_PREFIX_FRONTEND_CS + "백그라운드로 사용자 데이터 전송 완료. 응답:", response);
            }
        });
    } else {
        console.warn(DEBUG_PREFIX_FRONTEND_CS + "localStorage에서 필수 사용자 데이터(토큰 또는 Google ID)를 찾지 못했거나 유효하지 않습니다.");
    }
}

// 이 이벤트 리스너는 LoginCallback.jsx에서 커스텀 이벤트를 발생시켰을 때 실행됩니다.
window.addEventListener(ASCENTUBE_TOKEN_STORED_EVENT, () => {
    console.log(DEBUG_PREFIX_FRONTEND_CS + `커스텀 이벤트 '${ASCENTUBE_TOKEN_STORED_EVENT}' 수신됨.`);
    sendUserDataToBackground();
});

// 페이지 로드 시에도 한번 확인 (폴백 역할)
// 이 부분에서 경고가 발생할 수 있지만, 커스텀 이벤트 리스너가 핵심적인 역할을 합니다.
if (document.readyState === 'complete') {
    setTimeout(sendUserDataToBackground, 1500); // 약간의 지연 후 실행
} else {
    window.addEventListener('load', () => {
        setTimeout(sendUserDataToBackground, 1500); 
    });
}
console.log(DEBUG_PREFIX_FRONTEND_CS + "이벤트 리스너 설정 완료.");
