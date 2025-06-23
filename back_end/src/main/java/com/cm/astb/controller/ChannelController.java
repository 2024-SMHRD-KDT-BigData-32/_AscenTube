package com.cm.astb.controller;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cm.astb.dto.ChannelDailyMetricsDataDto;
import com.cm.astb.dto.ChannelDashboardSummaryDto;
import com.cm.astb.dto.ChannelKeyMetricsDto;
import com.cm.astb.dto.ChannelKeywordDto;
import com.cm.astb.dto.CommentAnalysisSummaryDto;
import com.cm.astb.dto.DayOfWeekViewsDto;
import com.cm.astb.dto.HourOfDayViewsDto;
import com.cm.astb.dto.PopularVideoDto;
import com.cm.astb.dto.TopAverageWatchTimeVideoDto;
import com.cm.astb.dto.TopSubscriberContributingVideoDto;
import com.cm.astb.dto.VideoCommentAnalysisSummaryDto;
import com.cm.astb.dto.VideoLengthViewsDto;
import com.cm.astb.dto.VideoPerformanceDto;
import com.cm.astb.security.CustomUserDetails;
import com.cm.astb.service.ChannelAnalysisService;
import com.cm.astb.service.ChannelService;
import com.cm.astb.service.CommentAnalysisService;
import com.cm.astb.service.KeywordAnalysisService;
import com.cm.astb.service.VideoAnalysisService;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.Video;

@RestController
@RequestMapping("/channel")
public class ChannelController {

	private final ChannelService channelService;
	private final VideoAnalysisService videoAnalysisService;
	private final ChannelAnalysisService channelAnalysisService;
	private final KeywordAnalysisService keywordAnalysisService;
	private final CommentAnalysisService commentAnalysisService;
	
	public ChannelController(ChannelService channelService, VideoAnalysisService videoAnalysisService,
			ChannelAnalysisService channelAnalysisService, KeywordAnalysisService keywordAnalysisService,
			CommentAnalysisService commentAnalysisService) {
		this.channelService = channelService;
		this.videoAnalysisService = videoAnalysisService;
		this.channelAnalysisService = channelAnalysisService;
		this.keywordAnalysisService = keywordAnalysisService;
		this.commentAnalysisService = commentAnalysisService;
	}

	@GetMapping("/channel-info")
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
    
    /**
     * 특정 채널의 종합 대시보드 통계 데이터를 반환하는 엔드포인트.
     * @param channelId 유튜브 채널 ID
     * @return 채널 대시보드 종합 통계 DTO
     */
    @GetMapping("/my-channel/dashboard-summary")
    public ResponseEntity<ChannelDashboardSummaryDto> getChannelDashboardSummary(@RequestParam String channelId) {
        Optional<ChannelDashboardSummaryDto> summaryDto = channelAnalysisService.getChannelDashboardSummary(channelId);

        return summaryDto.map(ResponseEntity::ok)
                         .orElseGet(() -> ResponseEntity.noContent().build());
    }
    
    /**
     * 특정 채널의 주요 지표 데이터를 반환하는 엔드포인트.
     * @param channelId 유튜브 채널 ID
     * @return 채널 주요 지표 DTO
     */
    @GetMapping("/my-channel/key-metrics")
    public ResponseEntity<ChannelKeyMetricsDto> getChannelKeyMetrics(@RequestParam String channelId) {
        Optional<ChannelKeyMetricsDto> keyMetricsDto = channelAnalysisService.getChannelKeyMetrics(channelId);

        return keyMetricsDto.map(ResponseEntity::ok)
                            .orElseGet(() -> ResponseEntity.noContent().build());
    }
    
    /**
     * 특정 채널의 영상을 업로드한 요일별 총 조회수 데이터를 DB에서 집계하여 반환하는 엔드포인트.
     * @param channelId 유튜브 채널 ID
     * @param period    조회 기간 ("month", "quarter", "6month", "year", 기본값: "month")
     * @return 요일별 총 조회수 리스트
     */
    @GetMapping("/my-channel/upload-views-by-day-of-week")
    public ResponseEntity<List<DayOfWeekViewsDto>> getUploadViewsByDayOfWeek(
            @RequestParam String channelId,
            @RequestParam(defaultValue = "month") String period) {

        List<DayOfWeekViewsDto> result = channelAnalysisService.getChannelViewsByDayOfWeekFromDB(channelId, period);

        if (result.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
    }
    
    /**
     * 특정 채널의 영상을 업로드한 시간대별 총 조회수 데이터를 DB에서 집계하여 반환하는 엔드포인트.
     * @param channelId 유튜브 채널 ID
     * @param period    조회 기간 ("month", "quarter", "6month", "year", 기본값: "month")
     * @return 시간대별 총 조회수 리스트
     */
    @GetMapping("/my-channel/upload-views-by-hour-of-day")
    public ResponseEntity<List<HourOfDayViewsDto>> getUploadViewsByHourOfDay(
            @RequestParam String channelId,
            @RequestParam(defaultValue = "month") String period) {

        List<HourOfDayViewsDto> result = channelAnalysisService.getChannelViewsByHourFromDB(channelId, period);

        if (result.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
    }
    
    /**
     * 특정 채널의 영상 길이별 조회수 데이터를 DB에서 집계하여 반환하는 엔드포인트.
     * 백분율은 채널의 총 조회수 대비 계산됩니다.
     * @param channelId 유튜브 채널 ID
     * @param period    조회 기간 ("month", "quarter", "6month", "year", 기본값: "month")
     * @return 영상 길이별 조회수 리스트
     */
    @GetMapping("/my-channel/views-by-video-length")
    public ResponseEntity<List<VideoLengthViewsDto>> getViewsByVideoLength(
            @RequestParam String channelId,
            @RequestParam(defaultValue = "month") String period) {

        List<VideoLengthViewsDto> result = channelAnalysisService.getViewsByVideoLength(channelId, period);

        if (result.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(result);
    }
    
    /**
     * 특정 채널의 일일 조회수, 시청 시간, 평균 시청 지속 시간, 구독자 증가량 시계열 데이터를 반환하는 엔드포인트.
     * 프론트엔드에서 그래프를 그릴 데이터 묶음을 직접 전달합니다.
     * @param channelId 유튜브 채널 ID
     * @param period    조회 기간 ("month", "quarter", "6month", "year", 기본값: "month")
     * @return 일일 채널 성과 추이 데이터 DTO 리스트
     */
    @GetMapping("/my-channel/daily-metrics-trend")
    public ResponseEntity<List<ChannelDailyMetricsDataDto>> getDailyMetricsTrend(
            @RequestParam String channelId,
            @RequestParam(defaultValue = "month") String period) {

        List<ChannelDailyMetricsDataDto> trendData = channelAnalysisService.getChannelDailyMetricsData(channelId, period); // 반환 타입 변경

        if (trendData.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(trendData);
    }
    
    /**
     * 특정 채널의 워드클라우드용 키워드 데이터를 반환하는 엔드포인트.
     * 이제 KeywordAnalysisService가 이 로직을 담당합니다.
     *
     * @param channelId 조회할 유튜브 채널 ID
     * @param limit     반환할 키워드의 최대 개수 (기본값: 50)
     * @return 키워드 및 빈도수 리스트
     */
    @GetMapping("/my-channel/keywords")
    public ResponseEntity<List<ChannelKeywordDto>> getChannelKeywords(
            @RequestParam String channelId,
            @RequestParam(defaultValue = "10") int limit) {
        List<ChannelKeywordDto> keywords = keywordAnalysisService.getChannelKeywordsForWordCloud(channelId, limit); // <--- 서비스 호출 변경
        if (keywords.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(keywords);
    }
    
    /**
     * 특정 채널의 상위 키워드들을 기반으로 인기 동영상 목록을 반환하는 엔드포인트.
     * 검색 결과는 DB에 캐시된 데이터를 사용하거나, 캐시 미스/만료 시 YouTube API를 호출하여 가져옵니다.
     * @param channelId 유튜브 채널 ID (키워드 추출의 기준)
     * @param videoCategoryId 동영상 카테고리 ID (선택 사항, null 또는 "ALL"인 경우 전체 카테고리)
     * @param totalResultLimit 최종적으로 반환할 영상의 최대 개수 (기본값: 10)
     * @param keywordLimit     채널에서 가져올 상위 키워드의 개수 (기본값: 5)
     * @return 인기 동영상 목록 DTO
     */
    @GetMapping("/my-channel/popular-videos-by-keywords")
    public ResponseEntity<List<PopularVideoDto>> getPopularVideosForChannelKeywords(
            @RequestParam String channelId,
            @RequestParam(required = false) String videoCategoryId,
            @RequestParam(defaultValue = "5") int totalResultLimit,
            @RequestParam(defaultValue = "5") int keywordLimit) {

        List<PopularVideoDto> popularVideos = keywordAnalysisService.getPopularVideosForChannelKeywords(
            channelId, videoCategoryId, totalResultLimit, keywordLimit
        );

        if (popularVideos.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(popularVideos);
    }
    
    /**
     * 특정 채널의 댓글 분석 요약 정보 (총 댓글 수, 감성/화행 분포, 최신/인기 댓글 등)를 반환하는 엔드포인트.
     * 예시: GET /api/channels/{channelId}/comment-analysis-summary?period=month
     *
     * @param channelId 유튜브 채널 ID
     * @param period    조회 기간 ("month", "quarter", "6month", "year", 기본값: "month")
     * @return 댓글 분석 요약 DTO
     */
    @GetMapping("/my-channel/comment-analysis-summary")
    public ResponseEntity<CommentAnalysisSummaryDto> getCommentAnalysisSummary(
            @RequestParam String channelId,
            @RequestParam(defaultValue = "quarter") String period) {

        CommentAnalysisSummaryDto summaryDto = commentAnalysisService.getCommentAnalysisSummary(channelId, period);

        if (summaryDto.getTotalComments() == null || summaryDto.getTotalComments() == 0) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(summaryDto);
    }
    
    /**
     * 특정 영상에 대한 댓글 분석 요약 정보를 반환하는 엔드포인트.
     * 이 엔드포인트는 '카테고리별 인기 영상 목록'에서 '상세 분석' 버튼을 눌렀을 때 사용됩니다.
     *
     * @param videoId 조회할 영상의 DB 고유 ID (TB_VIDEO.VIDEO_ID)
     * @return 영상 댓글 분석 요약 DTO
     */
    @GetMapping("/videos/comment-analysis")
    public ResponseEntity<VideoCommentAnalysisSummaryDto> getVideoCommentAnalysisSummary(
            @RequestParam String videoKey) { // videoId is Long type

        VideoCommentAnalysisSummaryDto summaryDto = commentAnalysisService.getVideoCommentAnalysisSummary(videoKey);

        // totalComments가 0이면 데이터가 없는 것으로 간주 (204 No Content)
        if (summaryDto.getTotalComments() == null || summaryDto.getTotalComments() == 0) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(summaryDto);
    }
}

