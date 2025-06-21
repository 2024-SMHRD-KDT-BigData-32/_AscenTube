// content_scripts/dom-scanner.js

const STAR_MARK_TEXT_SCANNER = "⭐";
const STAR_CLASS_NAME_SCANNER = "custom-star-highlight-v6-0-0";
const DEBUG_PREFIX_SCANNER = "[DOM Scanner v6.0.0] ";

function logScanner(message, ...optionalParams) {
    console.log(DEBUG_PREFIX_SCANNER + message, ...optionalParams);
}

function extractChannelIdentifierScanner(url) {
    if (!url) return null;
    try {
        const path = new URL(url, location.origin).pathname;
        const segments = path.split('/').filter(Boolean);
        if (segments.length > 0) {
            if (segments[0].startsWith('@')) { return segments[0]; }
            if ((segments[0] === 'c' || segments[0] === 'user') && segments.length > 1) { return '@' + segments[1]; }
            if (segments[0] === 'channel' && segments.length > 1 && segments[1].startsWith('UC')) { return segments[1]; }
        }
    } catch (e) { /* 무시 */ }
    return null;
}

function addStarToTitleScanner(titleLinkElement, channelInfo) {
    if (titleLinkElement.dataset.customStarred === "true") return;
    titleLinkElement.dataset.customStarred = "true";

    const starSpan = document.createElement('span');
    starSpan.textContent = STAR_MARK_TEXT_SCANNER;
    starSpan.classList.add(STAR_CLASS_NAME_SCANNER);
    
    starSpan.dataset.videoUrl = titleLinkElement.href;
    starSpan.dataset.videoTitle = titleLinkElement.textContent.replace(/\s+/g, ' ').trim();
    starSpan.dataset.channelName = channelInfo.cnlName;
    starSpan.dataset.channelHandle = channelInfo.handle || '';
    starSpan.dataset.channelUcId = channelInfo.ucId || '';

    Object.assign(starSpan.style, { marginRight: '4px', fontSize: 'inherit', color: 'inherit', cursor: 'pointer' });
    
    titleLinkElement.prepend(starSpan);
}

function processVideoContainerScanner(container, favoriteChannels) {
    let isTargetChannelVideo = false;
    let titleLinkElement = null;
    let matchedFavChannelInfo = null;
    
    const channelLinkSelectors = [ '.ytd-video-owner-renderer a.yt-simple-endpoint', 'ytd-rich-grid-media .byline-container .yt-formatted-string a', 'ytd-rich-grid-media #channel-name a', '#meta #channel-name a', '#meta .ytd-channel-name a', '#channel-info a.yt-simple-endpoint.yt-formatted-string', '#channel-name.ytd-compact-video-renderer a', 'ytd-playlist-video-renderer .ytd-channel-name a', 'ytd-playlist-video-renderer #byline-container a.yt-simple-endpoint', 'yt-lockup-view-model .yt-content-metadata-view-model-wiz__metadata-row a.yt-core-attributed-string__link', '#channel-info.ytd-reel-player-header-renderer a.yt-simple-endpoint.yt-formatted-string', '#text-container.ytd-channel-name a' ];

    for (const selector of channelLinkSelectors) {
        const potentialChannelLink = container.querySelector(selector);
        if (potentialChannelLink?.href) {
            const identifier = extractChannelIdentifierScanner(potentialChannelLink.href);
            if (identifier) {
                matchedFavChannelInfo = favoriteChannels.find(fav => (fav.ucId && fav.ucId === identifier) || (fav.handle && fav.handle === identifier));
                if (matchedFavChannelInfo) {
                    isTargetChannelVideo = true;
                    break;
                }
            }
        }
    }

    if (!isTargetChannelVideo && (container.matches('ytd-grid-video-renderer') || container.matches('ytd-rich-item-renderer')) && !container.querySelector(channelLinkSelectors[0])) {
        const pageIdentifier = extractChannelIdentifierScanner(location.href);
        if (pageIdentifier) {
            matchedFavChannelInfo = favoriteChannels.find(fav => (fav.ucId && fav.ucId === pageIdentifier) || (fav.handle && fav.handle === pageIdentifier));
            if (matchedFavChannelInfo) isTargetChannelVideo = true;
        }
    }
    
    if (isTargetChannelVideo) {
        const titleSelectors = [ 'a#video-title', 'ytd-rich-grid-media #video-title-link', 'h3.ytd-compact-video-renderer a#video-title' ];
        for (const selector of titleSelectors) {
            const el = container.querySelector(selector);
            if (el) {
                titleLinkElement = el.closest('a');
                if(titleLinkElement) break;
            }
        }
        if (!titleLinkElement) {
            const spanTitle = container.querySelector('span#video-title, yt-formatted-string#video-title');
            if (spanTitle) titleLinkElement = spanTitle.closest('a');
        }
    }

    if (isTargetChannelVideo && titleLinkElement?.href && matchedFavChannelInfo) {
        addStarToTitleScanner(titleLinkElement, matchedFavChannelInfo);
    }
}

function scanAndStarVideos(favoriteChannels) {
    logScanner("영상 스캔 및 별표 추가 시작...");
    const videoContainerSelectors = "ytd-rich-item-renderer, ytd-grid-video-renderer, ytd-video-renderer, ytd-playlist-video-renderer, ytd-compact-video-renderer, ytd-reel-item-renderer, ytd-shelf-renderer, yt-lockup-view-model";
    document.querySelectorAll(videoContainerSelectors).forEach(container => {
        if (container.matches('ytd-shelf-renderer')) {
            container.querySelectorAll("#contents ytd-video-renderer, #contents ytd-grid-video-renderer").forEach(item => processVideoContainerScanner(item, favoriteChannels));
        } else {
            processVideoContainerScanner(container, favoriteChannels);
        }
    });
}