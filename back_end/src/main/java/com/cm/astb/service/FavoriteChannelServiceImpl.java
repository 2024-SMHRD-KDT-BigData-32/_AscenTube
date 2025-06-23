// FavoriteChannelServiceImpl.java
package com.cm.astb.service; // 실제 프로젝트의 서비스 패키지 경로에 맞게 수정해주세요.

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.cm.astb.dto.ChannelSearchResultDto;
import com.cm.astb.dto.FavoriteChannelDto;
import com.cm.astb.dto.FavoriteChannelRequestDto;
import com.cm.astb.entity.FavoriteChannel;
import com.cm.astb.entity.YouTubeChannel;
import com.cm.astb.repository.FavoriteChannelRepository;
import com.cm.astb.repository.YouTubeChannelRepository;
import com.google.api.services.youtube.model.Channel; // YouTube Data API 모델 클래스

@Service
@Transactional
public class FavoriteChannelServiceImpl implements FavoriteChannelService {
	
    private static final Logger logger = LoggerFactory.getLogger(FavoriteChannelServiceImpl.class); // 로거 인스턴스 생성
	
    private final FavoriteChannelRepository favoriteChannelRepository;
    private final YoutubeDataApiService youtubeDataApiService; // YouTube API 호출 서비스
    private final YouTubeChannelRepository youTubeChannelRepository;
    private static final int MAX_FAVORITE_CHANNELS = 5;
    private static final String YOUTUBE_CHANNEL_BASE_URL = "https://www.youtube.com/";

    public FavoriteChannelServiceImpl(FavoriteChannelRepository favoriteChannelRepository,
			YoutubeDataApiService youtubeDataApiService, YouTubeChannelRepository youTubeChannelRepository) {
		this.favoriteChannelRepository = favoriteChannelRepository;
		this.youtubeDataApiService = youtubeDataApiService;
		this.youTubeChannelRepository = youTubeChannelRepository;
	}

    /**
     * URL에서 YouTube 채널 ID (UC...) 또는 @handle 추출.
     * @param channelUrl 사용자가 입력한 채널 URL
     * @return @handle 또는 UC...ID, 없으면 null
     */
    private String extractIdentifierFromUrl(String channelUrl) {
        if (!StringUtils.hasText(channelUrl)) {
            return null;
        }
        // 패턴: @handle, /channel/UC..., /c/handle, /user/handle
        Pattern pattern = Pattern.compile("(?:https?://(?:www\\.)?youtube\\.com/(?:c/|channel/|user/|@))?([a-zA-Z0-9_-]+)");
        Matcher matcher = pattern.matcher(channelUrl);

        if (matcher.find()) {
            String identifier = matcher.group(1);
            if (identifier.startsWith("UC") && identifier.length() == 24) {
                return identifier; // UC... ID
            } else if (identifier.startsWith("@")) {
                return identifier; // @handle (이미 @ 포함)
            } else {
                return "@" + identifier; // /c/handle, /user/handle -> @handle
            }
        }
        // URL 자체가 핸들이거나 ID일 경우
        if (channelUrl.startsWith("@") || (channelUrl.startsWith("UC") && channelUrl.length() == 24)) {
            return channelUrl;
        }
        return null;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FavoriteChannelDto> getFavoriteChannelsByGoogleId(String googleId) {
        if (!StringUtils.hasText(googleId)) {
             throw new IllegalArgumentException("Google ID는 필수입니다.");
        }

        List<FavoriteChannel> favChannels = favoriteChannelRepository.findByGoogleIdOrderByCreatedAtDesc(googleId);

        if (favChannels.isEmpty()) {
            logger.info("No favorite channels found for user: '{}'.", googleId);
            return List.of(); // Collections.emptyList() 대신 List.of()
        }

        // 최신 YouTubeChannel 정보를 가져와 DTO에 포함 (N+1 방지를 위해 미리 조회)
        List<String> channelIds = favChannels.stream()
                                            .map(FavoriteChannel::getCnlId)
                                            .collect(Collectors.toList());
        Map<String, YouTubeChannel> ytChannelMap = youTubeChannelRepository.findByChannelIdIn(channelIds).stream()
                                                                           .collect(Collectors.toMap(YouTubeChannel::getChannelId, Function.identity()));

        return favChannels.stream()
                .map(fav -> {
                    YouTubeChannel ytChannel = ytChannelMap.get(fav.getCnlId());
                    String thumbnailUrl = (ytChannel != null) ? ytChannel.getThumbnailUrl() : null;
                    Long subscriberCount = (ytChannel != null) ? ytChannel.getSubscriberCount() : 0L; // null 대비 0L
                    Long videoCount = (ytChannel != null) ? ytChannel.getVideoCount() : 0L; // 추가
                    Long viewCount = (ytChannel != null) ? ytChannel.getViewCount() : 0L; // 추가

                    return FavoriteChannelDto.fromEntity(fav, thumbnailUrl, subscriberCount, videoCount, viewCount); // DTO::fromEntity 메서드 수정
                })
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public FavoriteChannelDto addFavoriteChannel(String googleId, FavoriteChannelRequestDto requestDto) throws IOException, IllegalArgumentException {
        if (!StringUtils.hasText(googleId)) {
            throw new IllegalArgumentException("Google ID는 필수입니다.");
        }
        if (requestDto == null || !StringUtils.hasText(requestDto.getChannelUrl())) { // requestDto.getChannelUrl()로 변경
            throw new IllegalArgumentException("채널 URL은 필수입니다.");
        }

        if (favoriteChannelRepository.countByGoogleId(googleId) >= MAX_FAVORITE_CHANNELS) {
            throw new IllegalArgumentException("관심 채널은 최대 " + MAX_FAVORITE_CHANNELS + "개까지 등록할 수 있습니다.");
        }

        String userInputIdentifier = extractIdentifierFromUrl(requestDto.getChannelUrl()); // requestDto.getChannelUrl()
        if (!StringUtils.hasText(userInputIdentifier)) {
            throw new IllegalArgumentException("유효하지 않은 채널 URL 형식입니다: " + requestDto.getChannelUrl());
        }

        // --- YouTube Data API를 사용하여 채널 정보 검증 및 가져오기 ---
        Channel youtubeChannelInfo;
        try {
            youtubeChannelInfo = youtubeDataApiService.getChannelDetailsByIdentifier(userInputIdentifier); // YouTube API 호출
            if (youtubeChannelInfo == null || youtubeChannelInfo.getSnippet() == null || !StringUtils.hasText(youtubeChannelInfo.getId())) {
                throw new IllegalArgumentException("YouTube에서 '" + userInputIdentifier + "'에 해당하는 채널 정보를 찾을 수 없거나 유효하지 않습니다.");
            }
        } catch (IOException e) {
            logger.error("YouTube API 호출 중 오류 발생 (채널 정보 조회): {}", e.getMessage(), e); // System.err 대신 logger 사용
            throw new IOException("YouTube 채널 정보 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", e);
        }

        String actualChannelId = youtubeChannelInfo.getId(); // 항상 정식 UC... ID 사용
        String actualChannelName = youtubeChannelInfo.getSnippet().getTitle();
        // 정규화된 채널 URL 구성
        String actualChannelUrl = YOUTUBE_CHANNEL_BASE_URL + actualChannelId; // 기본적으로 Channel ID 기반
        if (StringUtils.hasText(youtubeChannelInfo.getSnippet().getCustomUrl())) { // @handle (customUrl)이 있다면 그것을 URL로 사용
            actualChannelUrl = YOUTUBE_CHANNEL_BASE_URL + youtubeChannelInfo.getSnippet().getCustomUrl();
        }

        if (favoriteChannelRepository.findByGoogleIdAndCnlId(googleId, actualChannelId).isPresent()) {
            throw new IllegalArgumentException("'" + actualChannelName + "' 채널은 이미 관심 채널로 등록되어 있습니다.");
        }

        FavoriteChannel favoriteChannel = FavoriteChannel.builder()
                .googleId(googleId)
                .cnlId(actualChannelId)
                .cnlName(actualChannelName)
                .cnlUrl(actualChannelUrl)
                .cnlMemo(requestDto.getCnlMemo()) // requestDto.getCnlMemo()
                .build();

        FavoriteChannel savedChannel = favoriteChannelRepository.save(favoriteChannel);
        
        // TB_YT_CHANNEL에도 채널 정보가 없으면 추가 (이미 채널 정보 수집 스케줄러가 있지만, 혹시 모를 경우)
//        youTubeChannelRepository.findById(actualChannelId).ifPresentOrElse(
//            ytCh -> { // 이미 있으면 업데이트
//                ytCh.setChannelName(actualChannelName);
//                ytCh.setChannelUrl(actualChannelUrl);
//                // 기타 필요한 정보 업데이트
//                youTubeChannelRepository.save(ytCh);
//            },
//            () -> { // 없으면 새로 저장
//                YouTubeChannel newYtChannel = YouTubeChannel.builder()
//                        .channelId(actualChannelId)
//                        .channelName(actualChannelName)
//                        .channelUrl(actualChannelUrl)
//                        .profileThumbnailUrl(youtubeChannelInfo.getSnippet().getThumbnails().getDefault().getUrl()) // 썸네일 추가
//                        .build();
//                // 조회수, 구독자 수 등은 DataCollectorService가 나중에 채워넣을 것
//                youTubeChannelRepository.save(newYtChannel);
//            }
//        );

        return FavoriteChannelDto.fromEntity(savedChannel,
                                            youtubeChannelInfo.getSnippet().getThumbnails().getDefault().getUrl(),
                                            youtubeChannelInfo.getStatistics().getSubscriberCount().longValue(),
                                            youtubeChannelInfo.getStatistics().getVideoCount().longValue(),
                                            youtubeChannelInfo.getStatistics().getViewCount().longValue()
                                            );
    }

    @Override
    @Transactional
    public void deleteFavoriteChannel(String googleId, Long favId) throws IllegalArgumentException {
        if (!StringUtils.hasText(googleId)) {
            throw new IllegalArgumentException("Google ID는 필수입니다.");
        }
        if (favId == null) {
            throw new IllegalArgumentException("삭제할 관심 채널의 ID(favId)는 필수입니다.");
        }

        FavoriteChannel favoriteChannel = favoriteChannelRepository.findByFavIdAndGoogleId(favId, googleId) // favId로 조회
                .orElseThrow(() -> new IllegalArgumentException("해당 관심 채널을 찾을 수 없거나 삭제 권한이 없습니다. (ID: " + favId + ")"));

        favoriteChannelRepository.delete(favoriteChannel);
        logger.info("User '{}' successfully deleted favorite channel with favId: {}.", googleId, favId);
    }

    // --- searchChannels 메서드 추가 (인터페이스에 맞춤) ---
    @Override
    @Transactional(readOnly = true)
    public List<ChannelSearchResultDto> searchChannels(String keyword, String googleId, int limit) {
        logger.info("Searching channels with keyword: '{}' for user: '{}', limit: {}", keyword, googleId, limit);

        // YouTubeChannelRepository에 findByChannelNameContainingIgnoreCaseOrderByNameAsc 또는 유사한 쿼리 메서드 필요
        Pageable pageable = PageRequest.of(0, limit, Sort.by("title").ascending()); // 채널명으로 정렬

        // TB_YT_CHANNEL에서 채널명으로 검색
        List<YouTubeChannel> foundChannels = youTubeChannelRepository.findByTitleContainingIgnoreCase(keyword, pageable);

        if (foundChannels.isEmpty()) {
            logger.warn("No channels found for keyword: '{}'.", keyword);
            return List.of();
        }

        // 사용자가 이미 찜한 채널 ID 목록을 미리 조회
		Set<String> favoritedChannelIds = favoriteChannelRepository.findByGoogleId(googleId).stream()
				.map(fav -> fav.getCnlId())
				.collect(Collectors.toSet());

        // ChannelSearchResultDto로 매핑하면서 찜 여부 설정
        List<ChannelSearchResultDto> searchResults = foundChannels.stream()
        		.map((YouTubeChannel ytChannel) -> ChannelSearchResultDto.builder() // <--- ytChannel 앞에 타입 명시
                        .channelId(ytChannel.getChannelId())
                        .channelName(ytChannel.getTitle())
                        // 각 필드에 값을 전달할 때, 명시적 캐스팅을 시도합니다.
                        .thumbnailUrl((String) Optional.ofNullable(ytChannel.getThumbnailUrl()).orElse(null)) // <--- 캐스팅
                        .subscriberCount((Long) Optional.ofNullable(ytChannel.getSubscriberCount()).orElse(0L)) // <--- 캐스팅
                        .videoCount((Long) Optional.ofNullable(ytChannel.getVideoCount()).orElse(0L))           // <--- 캐스팅
                        .viewCount((Long) Optional.ofNullable(ytChannel.getViewCount()).orElse(0L))             // <--- 캐스팅
                        .isFavorited(favoritedChannelIds.contains(ytChannel.getChannelId()))
                        .build())
                .collect(Collectors.toList());

        logger.info("Found {} channels for keyword: '{}'. Total search results: {}", searchResults.size(), keyword, searchResults.size());
        return searchResults;
    }
    
    @Override
    @Transactional
    public FavoriteChannelDto updateFavoriteChannelMemo(String googleId, String channelId, String newMemo) throws IllegalArgumentException {
        logger.info("User '{}' attempting to update memo for favorite channel: {}", googleId, channelId);

        // 사용자의 관심 채널인지 확인 (googleId와 channelId로 조회)
        FavoriteChannel existingFavChannel = favoriteChannelRepository.findByGoogleIdAndCnlId(googleId, channelId)
                .orElseThrow(() -> new IllegalArgumentException("해당 관심 채널을 찾을 수 없거나 업데이트 권한이 없습니다. (채널 ID: " + channelId + ")"));

        existingFavChannel.setCnlMemo(newMemo); // 메모 업데이트
        FavoriteChannel updatedFavChannel = favoriteChannelRepository.save(existingFavChannel); // 변경 사항 저장

        // 업데이트된 DTO 반환을 위해 YouTubeChannel 정보도 가져옴
        Optional<YouTubeChannel> ytChannelOpt = youTubeChannelRepository.findById(updatedFavChannel.getCnlId());
        YouTubeChannel ytChannel = ytChannelOpt.orElse(null); // 없을 수도 있음

        // FavoriteChannelDto로 변환하여 반환
        return FavoriteChannelDto.builder()
                .favId(updatedFavChannel.getFavId())
                .googleId(updatedFavChannel.getGoogleId())
                .cnlId(updatedFavChannel.getCnlId())
                .cnlName(updatedFavChannel.getCnlName())
                .cnlUrl(updatedFavChannel.getCnlUrl())
                .cnlMemo(updatedFavChannel.getCnlMemo())
                .createdAt(updatedFavChannel.getCreatedAt().toString())
                .thumbnailUrl(ytChannel != null ? ytChannel.getThumbnailUrl() : null)
                .subscriberCount(ytChannel != null ? ytChannel.getSubscriberCount() : 0L) // null 대비
                .build();
    }
}
