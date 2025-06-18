package com.cm.astb.controller;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cm.astb.dto.TopAverageWatchTimeVideoDto;
import com.cm.astb.dto.TopSubscriberContributingVideoDto;
import com.cm.astb.dto.VideoPerformanceDto;
import com.cm.astb.security.CustomUserDetails;
import com.cm.astb.service.ChannelService;
import com.cm.astb.service.VideoAnalysisService;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.Video;

@RestController
@RequestMapping("/channel")
public class ChannelController {

	private final ChannelService channelService;
	private final VideoAnalysisService videoAnalysisService;

	public ChannelController(ChannelService channelService, VideoAnalysisService videoAnalysisService) {
		this.channelService = channelService;
		this.videoAnalysisService = videoAnalysisService;
	}

	public ResponseEntity<?> getChannelInfo(@RequestParam String channelId) {
		try {

			Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
			if (authentication == null || !authentication.isAuthenticated()) {
				return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
						.body(Map.of("error", "User is unauthorized."));
			}

			Object principal = authentication.getPrincipal();
			if(!(principal instanceof CustomUserDetails)) {
				return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
						.body(Map.of("error", "Invalid user information."));
			}
			CustomUserDetails userDetails = (CustomUserDetails) principal;
			String userId = userDetails.getUsername();


			if(userId == null || userId.isEmpty()) {
				return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
						.body(Map.of("error", "Can't load authorized user's ID."));
			}

			ChannelListResponse response = channelService.getChannelInfoById(userId, channelId);

			List<Video> latestVideos = channelService.getLatestVideosFromChannel(userId, response);
			List<Video> popularVideos = channelService.getPopularVideosFromChannel(userId, channelId);

			if (response != null && response.getItems() != null && !response.isEmpty()) {
				Channel channel = response.getItems().get(0);
				Map<String, Object> channelInfo = Map.of(
					"channelId", channel.getId(),
					"title", channel.getSnippet().getTitle(),
					"description", channel.getSnippet().getDescription(),
					"thumnailUrl", channel.getSnippet().getThumbnails().getDefault().getUrl(),
					"publishedAt", channel.getSnippet().getPublishedAt(),
					"viewCount", channel.getStatistics().getViewCount(),
					"subscriberCount", channel.getStatistics().getSubscriberCount(),
					"videoCount", channel.getStatistics().getVideoCount(),
					"latestVideos", latestVideos,
					"popularVideos", popularVideos
				);

				return ResponseEntity.ok(channelInfo);
			} else {
				return ResponseEntity.status(HttpStatus.NOT_FOUND)
						.body(Map.of("error", "Can't find channel infomation."));
			}
		} catch (IOException e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", "An Error occured while call YouTube Data API: " + e.getMessage()));
		} catch (GeneralSecurityException e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
					.body(Map.of("error", e.getMessage()));
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", e.getMessage()));
		}
	}
	
	/**
     * 특정 채널의 최신 업로드 영상 성과 리스트를 반환하는 엔드포인트.
     *
     * @param channelId 유튜브 채널 ID
     * @return 최신 영상 성과 정보 리스트
     */
    @GetMapping("/my-channel/latest-video-performance")
    public ResponseEntity<List<VideoPerformanceDto>> getLatestVideoPerformance(
    		@RequestParam String channelId,
    		@RequestParam(defaultValue = "5") int limit) {
        List<VideoPerformanceDto> performanceList = videoAnalysisService.getLatestUploadedVideoPerformance(channelId, limit);
        if (performanceList.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(performanceList);
    }
    
    /**
     * 특정 채널에서 구독자 증가 기여가 높은 영상 리스트를 반환하는 엔드포인트.
     *
     * @param channelId 유튜브 채널 ID
     * @param limit     가져올 영상의 최대 개수 (기본값: 5)
     * @return 구독자 증가 기여도 높은 영상 리스트
     */
    @GetMapping("/my-channel/top-sub-contribution")
    public ResponseEntity<List<TopSubscriberContributingVideoDto>> getTopSubscriberVideos(
            @RequestParam String channelId,
            @RequestParam(defaultValue = "5") int limit) {
        List<TopSubscriberContributingVideoDto> topVideos = videoAnalysisService.getTopSubscriberContributingVideos(channelId, limit);
        if (topVideos.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(topVideos);
    }
    
    /**
     * 특정 채널에서 평균 시청 지속 시간이 높은 영상 리스트를 반환하는 엔드포인트.
     *
     * @param channelId 유튜브 채널 ID
     * @param limit     가져올 영상의 최대 개수 (기본값: 5)
     * @return 평균 시청 지속 시간 높은 영상 리스트
     */
    @GetMapping("/my-channel/top-avg-watch-time")
    public ResponseEntity<List<TopAverageWatchTimeVideoDto>> getTopAverageWatchTimeVideos(
            @RequestParam String channelId,
            @RequestParam(defaultValue = "5") int limit) {
        List<TopAverageWatchTimeVideoDto> topVideos = videoAnalysisService.getTopAverageWatchTimeVideos(channelId, limit);
        if (topVideos.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(topVideos);
    }
}

