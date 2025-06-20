// popup.js (alert 제거 및 메시지 영역 사용)
document.addEventListener('DOMContentLoaded', function() {
    const loginStatusDiv = document.getElementById('loginStatus');
    const syncBtn = document.getElementById('syncBtn');
    const syncMessageDiv = document.getElementById('syncMessage'); // 메시지 표시용 div

    function updateUserStatus() {
        syncMessageDiv.textContent = ""; // 이전 메시지 초기화
        if (chrome.runtime && chrome.runtime.sendMessage) {
            loginStatusDiv.textContent = "상태 확인 중..."; // 확인 시작 알림
            chrome.runtime.sendMessage({ type: "GET_USER_STATUS" }, function(response) {
                if (chrome.runtime.lastError) {
                    loginStatusDiv.textContent = "상태 확인 중 오류 발생";
                    syncMessageDiv.textContent = "백그라운드 스크립트 연결을 확인해주세요.";
                    console.warn("Error getting user status:", chrome.runtime.lastError.message);
                    return;
                }
                if (response) {
                    if (response.isLoggedIn && response.userName) {
                        loginStatusDiv.textContent = `${response.userName}님, 환영합니다!`;
                    } else if (response.isLoggedIn) {
                        loginStatusDiv.textContent = "로그인 상태입니다.";
                         syncMessageDiv.textContent = "사용자 정보가 일부 누락되었을 수 있습니다.";
                    } else {
                        loginStatusDiv.textContent = "로그인이 필요합니다.";
                        syncMessageDiv.textContent = "AscenTube 웹사이트에서 먼저 로그인해주세요.";
                    }
                } else {
                    loginStatusDiv.textContent = "응답 없음";
                    syncMessageDiv.textContent = "백그라운드 스크립트 오류일 수 있습니다.";
                }
            });
        } else {
            loginStatusDiv.textContent = "오류 발생";
            syncMessageDiv.textContent = "익스텐션 실행 환경에 문제가 있습니다.";
        }
    }

    if (syncBtn) {
        syncBtn.addEventListener('click', () => {
            console.log("수동 동기화 버튼 클릭됨");
            // alert 대신 div에 메시지 표시
            syncMessageDiv.textContent = "웹사이트 로그인 후, 유튜브 페이지를 새로고침하거나 잠시 기다려주세요."; 
            updateUserStatus(); // 상태 즉시 업데이트 시도
            
            // 메시지가 잠시 후 사라지도록 설정 (선택 사항)
            setTimeout(() => {
                if (syncMessageDiv.textContent === "웹사이트 로그인 후, 유튜브 페이지를 새로고침하거나 잠시 기다려주세요.") {
                    syncMessageDiv.textContent = "";
                }
            }, 5000); // 5초 후 메시지 자동 제거
        });
    }
    
    // 팝업이 열릴 때마다 사용자 상태 업데이트
    updateUserStatus();
});
