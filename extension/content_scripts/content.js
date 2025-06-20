// content_scripts/content.js (v6.2.0 - API 직접 호출, 전체 코드)

const DEBUG_PREFIX_MAIN = "[Main Controller v6.2.0] ";
const FAVORITE_CHANNELS_API_URL = 'https://localhost:8082/AscenTube/api/ascen/user/me/favorite-channels'; // https로 변경
let isInitialLoad = true;

function logMain(message, ...optionalParams) {
    console.log(DEBUG_PREFIX_MAIN + message, ...optionalParams);
}

// content.js가 직접 API를 호출하도록 변경된 함수
async function handlePageUpdate() {
    logMain("페이지 업데이트 감지. API 호출 시작...");
    try {
        // 1. background.js에 사용자 정보(토큰 포함) 요청
        const response = await chrome.runtime.sendMessage({ type: "GET_USER_DATA_FOR_API" });

        if (response && response.success && response.userData.token) {
            const token = response.userData.token;
            logMain(`백그라운드로부터 토큰 수신 완료. API 호출 시도.`);
            
            // 2. content.js가 직접 fetch API 호출
            const apiResponse = await fetch(FAVORITE_CHANNELS_API_URL, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!apiResponse.ok) {
                throw new Error(`API 서버 응답 오류: ${apiResponse.status}`);
            }

            const rawData = await apiResponse.json();
            logMain("API로부터 받은 원본 데이터:", rawData);

            // 3. 받은 데이터 가공
            if (Array.isArray(rawData)) {
                const favoriteChannels = rawData.map(item => {
                    const cnlUrl = item.cnlUrl || '';
                    const handleMatch = cnlUrl.match(/@[\w.-]+/);
                    return { 
                        ucId: item.cnlId || null,
                        handle: handleMatch ? handleMatch[0] : null,
                        cnlName: item.cnlName || "이름 없음"
                    };
                }).filter(item => item.ucId || item.handle);

                logMain("가공된 관심 채널 정보:", favoriteChannels);
                if (favoriteChannels.length > 0) {
                    scanAndStarVideos(favoriteChannels); // dom-scanner.js 호출
                }
            }
        } else {
            logMain("백그라운드로부터 토큰을 가져오는 데 실패했습니다.", response?.error);
        }
    } catch (e) {
        console.error(DEBUG_PREFIX_MAIN + "handlePageUpdate 함수 실행 중 오류:", e.message);
    }
}

/**
 * 스크립트의 모든 기능을 초기화하고 이벤트 리스너를 설정합니다.
 */
function initializeContentScript() {
    logMain("스크립트 초기화");
    initializeModalDOM(); // modal-controller.js의 함수

    // 페이지 전체에 대한 단일 클릭 리스너 (모달 켜기 담당)
    document.addEventListener('mousedown', (event) => {
        // 초기 로드 안전장치가 켜져 있으면 모든 클릭 무시
        if (isInitialLoad) {
            return;
        }
        
        // 클릭된 대상이 별표인지 확인
        const star = event.target.closest(".custom-star-highlight-v6-0-0");
        if (star) {
            // 별표 클릭 시, 영상 페이지로 이동하는 기본 동작을 막음
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            const videoInfo = { ...star.dataset };
            activateModal(videoInfo); // modal-controller.js의 함수를 호출하여 모달 '켜기'
        }
    }, { capture: true });

    // 유튜브 페이지 이동(SPA 네비게이션) 감지
    window.addEventListener("yt-navigate-finish", () => {
        logMain("페이지 이동 완료. 500ms 후 영상 처리 시작.");
        setTimeout(handlePageUpdate, 500);
    });

    // 동적 DOM 변경 감지 (무한 스크롤 등)
    let debounceTimer;
    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(handlePageUpdate, 750);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // 최초 페이지 로드 시 실행
    handlePageUpdate();

    // 2.5초 뒤에 초기 로드 안전장치를 해제
    setTimeout(() => {
        logMain("초기 로드 안전장치 해제.");
        isInitialLoad = false;
    }, 2500);
}

// 스크립트 초기화 함수 실행
initializeContentScript();