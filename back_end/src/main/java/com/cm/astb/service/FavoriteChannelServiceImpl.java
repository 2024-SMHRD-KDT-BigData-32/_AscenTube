// FavoriteChannelServiceImpl.java
package com.cm.astb.service; // 실제 프로젝트의 서비스 패키지 경로에 맞게 수정해주세요.

import java.io.IOException;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.cm.astb.dto.FavoriteChannelDto;
import com.cm.astb.dto.FavoriteChannelRequestDto;
import com.cm.astb.entity.FavoriteChannel;
import com.cm.astb.repository.FavoriteChannelRepository;
import com.google.api.services.youtube.model.Channel; // YouTube Data API 모델 클래스

@Service
@Transactional
public class FavoriteChannelServiceImpl implements FavoriteChannelService {

    private final FavoriteChannelRepository favoriteChannelRepository;
    private final YoutubeDataApiService youtubeDataApiService; // YouTube API 호출 서비스
    private static final int MAX_FAVORITE_CHANNELS = 5;
    private static final String YOUTUBE_CHANNEL_BASE_URL = "youtube.com/`에서"; // 또는 @핸들 기반 URL

    @Autowired
    public FavoriteChannelServiceImpl(FavoriteChannelRepository favoriteChannelRepository,
                                   YoutubeDataApiService youtubeDataApiService) {
        this.favoriteChannelRepository = favoriteChannelRepository;
        this.youtubeDataApiService = youtubeDataApiService;
    }

    /**
     * URL에서 YouTube 채널 ID 또는 @handle 추출.
     * @param channelUrl 채널 URL
     * @return @handle 또는 UC...ID, 없으면 null
     */
    private String extractIdentifierFromUrl(String channelUrl) {
        if (!StringUtils.hasText(channelUrl)) {
            return null;
        }
        // 패턴: @handle, /channel/UC..., /c/handle, /user/handle
        Pattern pattern = Pattern.compile("(?:https?://(?:www\\.)?youtube.com/*(?:/c/|/channel/|/user/|/@))?(?:(?:channel/([U][C][\\w-]{22}))|(?:c/([\\w-]+))|(?:user/([\\w-]+))|(@[\\w.-]+))");
        Matcher matcher = pattern.matcher(channelUrl);

        if (matcher.find()) {
            if (matcher.group(1) != null) {
				return matcher.group(1); // UC... ID
			}
            if (matcher.group(4) != null) {
				return matcher.group(4); // @handle
			}
            if (matcher.group(2) != null) {
				return "@" + matcher.group(2); // /c/handle -> @handle
			}
            if (matcher.group(3) != null) {
				return "@" + matcher.group(3); // /user/handle -> @handle (legacy)
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
        return favoriteChannelRepository.findByGoogleIdOrderByCreatedAtDesc(googleId)
                .stream()
                .map(FavoriteChannelDto::fromEntity)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public FavoriteChannelDto addFavoriteChannel(String googleId, FavoriteChannelRequestDto requestDto) throws IOException, IllegalArgumentException {
        if (!StringUtils.hasText(googleId)) {
            throw new IllegalArgumentException("Google ID는 필수입니다.");
        }
        if (requestDto == null || !StringUtils.hasText(requestDto.getChannelUrl())) {
            throw new IllegalArgumentException("채널 URL은 필수입니다.");
        }

        if (favoriteChannelRepository.countByGoogleId(googleId) >= MAX_FAVORITE_CHANNELS) {
            throw new IllegalArgumentException("관심 채널은 최대 " + MAX_FAVORITE_CHANNELS + "개까지 등록할 수 있습니다.");
        }

        String userInputIdentifier = extractIdentifierFromUrl(requestDto.getChannelUrl());
        if (!StringUtils.hasText(userInputIdentifier)) {
            throw new IllegalArgumentException("유효하지 않은 채널 URL 형식입니다: " + requestDto.getChannelUrl());
        }

        // --- YouTube Data API를 사용하여 채널 정보 검증 및 가져오기 ---
        Channel youtubeChannelInfo;
        try {
            // YoutubeDataApiService를 통해 채널 ID 또는 핸들로 채널 정보 조회
            // getChannelDetailsByIdentifier는 @handle 또는 UCid를 받아 처리한다고 가정
            youtubeChannelInfo = youtubeDataApiService.getChannelDetailsByIdentifier(userInputIdentifier);
            if (youtubeChannelInfo == null || youtubeChannelInfo.getSnippet() == null || !StringUtils.hasText(youtubeChannelInfo.getId())) {
                throw new IllegalArgumentException("YouTube에서 '" + userInputIdentifier + "'에 해당하는 채널 정보를 찾을 수 없거나 유효하지 않습니다.");
            }
        } catch (IOException e) {
            System.err.println("YouTube API 호출 중 오류 발생 (채널 정보 조회): " + e.getMessage());
            // API 호출 실패 시 사용자에게 알리고 등록 절차 중단
            throw new IOException("YouTube 채널 정보 조회 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.", e);
        }
        // --- YouTube Data API 연동 로직 끝 ---

        String actualChannelId = youtubeChannelInfo.getId(); // 항상 정식 UC... ID 사용
        String actualChannelName = youtubeChannelInfo.getSnippet().getTitle();
        String actualChannelUrl = YOUTUBE_CHANNEL_BASE_URL + actualChannelId; // 표준 URL 형식으로 저장
        if (StringUtils.hasText(youtubeChannelInfo.getSnippet().getCustomUrl())) { // @핸들이 있다면 그것을 URL로 사용
            actualChannelUrl = YOUTUBE_CHANNEL_BASE_URL + youtubeChannelInfo.getSnippet().getCustomUrl();
        }


        if (favoriteChannelRepository.findByGoogleIdAndCnlId(googleId, actualChannelId).isPresent()) {
            throw new IllegalArgumentException("'" + actualChannelName + "' 채널은 이미 관심 채널로 등록되어 있습니다.");
        }

        FavoriteChannel favoriteChannel = FavoriteChannel.builder()
                .googleId(googleId)
                .cnlId(actualChannelId) // YouTube API로부터 받은 정식 채널 ID (UC...)
                .cnlName(actualChannelName) // YouTube API로부터 받은 채널명
                .cnlUrl(actualChannelUrl)   // YouTube API로부터 구성한 정규화된 URL
                .cnlMemo(requestDto.getCnlMemo()) // 사용자가 입력한 메모
                .build();

        FavoriteChannel savedChannel = favoriteChannelRepository.save(favoriteChannel);
        return FavoriteChannelDto.fromEntity(savedChannel);
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

        FavoriteChannel favoriteChannel = favoriteChannelRepository.findByFavIdAndGoogleId(favId, googleId)
                .orElseThrow(() -> new IllegalArgumentException("해당 관심 채널을 찾을 수 없거나 삭제 권한이 없습니다. (ID: " + favId + ")"));

        favoriteChannelRepository.delete(favoriteChannel);
    }
}
