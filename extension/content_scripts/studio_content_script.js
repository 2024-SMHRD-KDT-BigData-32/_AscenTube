const DEBUG_PREFIX = "[AscenTube Studio Script] ";

function insertAscenTubeLogoButton() {
  if (document.getElementById("ascenTubeLogoButton")) return;

  const tryInsert = () => {
    const homeButton = document.querySelector("#home-button");
    if (homeButton && homeButton.parentElement) {
      const wrapper = document.createElement("div");
      wrapper.id = "ascenTubeLogoButton";
      wrapper.style.display = "flex";
      wrapper.style.alignItems = "center";
      wrapper.style.gap = "8px";
      wrapper.style.marginLeft = "16px";
      wrapper.style.marginTop = "-10px";
      wrapper.style.cursor = "pointer";
      wrapper.style.padding = "6px 12px";
      wrapper.style.background = "transparent";
      wrapper.style.borderRadius = "4px";
      wrapper.style.color = "#000";
      wrapper.style.fontWeight = "bold";
      wrapper.style.fontSize = "18px";
      wrapper.style.textDecoration = "none";
      wrapper.style.zIndex = "9999";

      // 로고 이미지
      const logo = document.createElement("img");
      logo.src = chrome.runtime.getURL("logo.png");
      logo.alt = "AscenTube";
      logo.style.height = "32px";
      logo.style.width = "auto";
      logo.style.display = "block";

      // 🔧 구분선 (divider)
      const divider = document.createElement("div");
      divider.style.height = "32px";
      divider.style.width = "1px";
      divider.style.backgroundColor = "rgba(0, 0, 0, 0.1)";
      divider.style.margin = "0 8px";

      // 텍스트
      const text = document.createElement("span");
      text.innerText = "AscenTube 대시보드";
      text.style.whiteSpace = "nowrap";
      text.style.lineHeight = "1";
      text.style.color = "#000";

      // 버튼 클릭 이벤트
      wrapper.onclick = () => {
        window.open("http://localhost:3000/", "_blank");
      };

      // 순서 중요! 로고 → 구분선 → 텍스트
      wrapper.appendChild(divider);
      wrapper.appendChild(logo);
      wrapper.appendChild(text);

      // 유튜브 로고 옆에 삽입
      homeButton.parentElement.insertBefore(wrapper, homeButton.nextSibling);

      console.log(DEBUG_PREFIX + "로고+구분선 버튼 삽입 완료 ✅");
      return true;
    } else {
      console.log(DEBUG_PREFIX + "home-button 요소 탐색 실패...");
      return false;
    }
  };

  let attempts = 0;
  const interval = setInterval(() => {
    attempts++;
    const success = tryInsert();
    if (success || attempts > 20) clearInterval(interval);
  }, 500);
}

if (document.readyState === "loading") {
  window.addEventListener("DOMContentLoaded", insertAscenTubeLogoButton);
} else {
  insertAscenTubeLogoButton();
}
