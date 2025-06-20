// content_scripts/modal-controller.js

const MODAL_ID_CTRL = "ascenTubeAnalysisModal";
const MODAL_OVERLAY_ID_CTRL = "ascenTubeModalOverlay";
const DEBUG_PREFIX_CTRL = "[Modal Controller v6.0.0] ";

let modalState = {
    isActive: false,
    videoInfo: null
};

function logCtrl(message, ...optionalParams) {
    console.log(DEBUG_PREFIX_CTRL + message, ...optionalParams);
}

function updateModalView() {
    const modal = document.getElementById(MODAL_ID_CTRL);
    const overlay = document.getElementById(MODAL_OVERLAY_ID_CTRL);
    if (!modal || !overlay) return;

    if (modalState.isActive && modalState.videoInfo) {
        const { videoInfo } = modalState;
        modal.querySelector("h2").textContent = `"${videoInfo.videoTitle}" 실시간 분석하기`;
        const p = modal.querySelector("#ascenTubeModalContent p");
        p.style.whiteSpace = 'pre-wrap';
        p.textContent = `채널: ${videoInfo.channelName} (${videoInfo.channelHandle || videoInfo.channelUcId})\n영상 링크: ${videoInfo.videoUrl}\n\n`;
        
        overlay.style.display = 'block';
        modal.style.display = 'flex';
        logCtrl("모달 상태 '켜짐':", videoInfo);
    } else {
        overlay.style.display = 'none';
        modal.style.display = 'none';
        logCtrl("모달 상태 '꺼짐'");
    }
}

function activateModal(videoInfo) {
    if (!videoInfo || !videoInfo.videoUrl) return;
    modalState = { isActive: true, videoInfo };
    updateModalView();
}

function deactivateModal() {
    modalState = { isActive: false, videoInfo: null };
    updateModalView();
}

function initializeModalDOM() {
    if (document.getElementById(MODAL_ID_CTRL)) return;
    const overlay = document.createElement('div');
    overlay.id = MODAL_OVERLAY_ID_CTRL;
    Object.assign(overlay.style, { position: 'fixed', top: '0', left: '0', width: '100%', height: '100%', backgroundColor: 'rgba(0, 0, 0, 0.6)', zIndex: '9998', display: 'none' });
    overlay.addEventListener('click', deactivateModal);
    document.body.appendChild(overlay);

    const modal = document.createElement('div');
    modal.id = MODAL_ID_CTRL;
    Object.assign(modal.style, { position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', backgroundColor: '#fff', padding: '20px', border: '1px solid #ccc', boxShadow: '0 4px 8px rgba(0,0,0,0.2)', zIndex: '9999', display: 'none', width: '480px', maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden', borderRadius: '8px', color: '#333', display: 'flex', flexDirection: 'column' });
    modal.innerHTML = `<div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #eee; margin-bottom: 15px; padding-bottom: 10px;"><h2 style="margin: 0; font-size: 1.3em; color: #1a73e8; font-weight: 600;">실시간 분석하기</h2><button id="ascenTubeModalCloseButton" style="background: none; border: none; font-size: 1.8em; cursor: pointer; color: #888; padding: 0 5px; line-height: 1;">×</button></div><div id="ascenTubeModalContent" style="flex-grow: 1; overflow-y: auto; padding-right: 10px; padding-bottom: 50px;"><p style="margin-top: 0; line-height: 1.6;"></p><div id="ascenTubeAnalysisButtonContainer" style="text-align: center; margin-top: 20px;"><button id="ascenTubeRealtimeAnalysisButton" style="display: flex; align-items: center; justify-content: center; background-color: #ff0000; color: white; padding: 12px 30px; border: none; border-radius: 8px; cursor: pointer; font-size: 1.3em; font-weight: bold; transition: background-color 0.2s; margin: 0 auto; gap: 10px;"><span style="font-size: 1.4em;">🔍</span> 실시간 분석하기</button></div></div>`;
    document.body.appendChild(modal);

    document.getElementById('ascenTubeModalCloseButton').addEventListener('click', deactivateModal);
    document.getElementById('ascenTubeRealtimeAnalysisButton').addEventListener('click', () => {
        if (modalState.videoInfo?.videoUrl) {
            window.open(`http://localhost:3000/vidanalysis?videoUrl=${encodeURIComponent(modalState.videoInfo.videoUrl)}`, '_blank');
            deactivateModal();
        }
    });
}