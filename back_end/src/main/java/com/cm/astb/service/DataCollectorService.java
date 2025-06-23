package com.cm.astb.service;

import java.io.IOException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.entity.AgeGroup;
import com.cm.astb.entity.AudienceStat;
import com.cm.astb.entity.AudienceStatsId;
import com.cm.astb.entity.ChannelDashboardStat;
import com.cm.astb.entity.ChannelDashboardStatsId;
import com.cm.astb.entity.ChannelStat;
import com.cm.astb.entity.ChannelStatsId;
import com.cm.astb.entity.DeviceAnalysis;
import com.cm.astb.entity.DeviceAnalysisId;
import com.cm.astb.entity.DeviceType;
import com.cm.astb.entity.Gender;
import com.cm.astb.entity.InflowRoute;
import com.cm.astb.entity.InflowRouteId;
import com.cm.astb.entity.User;
import com.cm.astb.entity.VideoStat;
import com.cm.astb.entity.VideoStatsId;
import com.cm.astb.entity.YouTubeChannel;
import com.cm.astb.entity.YouTubeVideo;
import com.cm.astb.repository.AudienceStatRepository;
import com.cm.astb.repository.CachedKeywordSearchResultRepository;
import com.cm.astb.repository.ChannelDashboardStatRepository;
import com.cm.astb.repository.ChannelStatRepository;
import com.cm.astb.repository.CommentRepository;
import com.cm.astb.repository.DeviceAnalysisRepository;
import com.cm.astb.repository.InflowRouteRepository;
import com.cm.astb.repository.InsightRepository;
import com.cm.astb.repository.VideoStatRepository;
import com.cm.astb.repository.YouTubeChannelRepository;
import com.cm.astb.repository.YouTubeVideoRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.auth.oauth2.TokenResponseException;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.PlaylistItemListResponse;
import com.google.api.services.youtube.model.Video;
import com.google.api.services.youtube.model.VideoListResponse;
import com.google.api.services.youtubeAnalytics.v2.model.QueryResponse;

@Service
public class DataCollectorService {

	private static final Logger logger = LoggerFactory.getLogger(DataCollectorService.class);
	
	private final OAuthService oAuthService;
	private final UserService userService;
	private final ChannelService channelService;
	private final YoutubeAnalyticsService youtubeAnalyticsService;
	private final YoutubeDataApiService youtubeDataApiService;
	private final KeywordAnalysisService keywordAnalysisService;
	
	private final YouTubeChannelRepository youTubeChannelRepository;
    private final YouTubeVideoRepository youTubeVideoRepository;
    private final VideoStatRepository videoStatRepository;
    private final ChannelStatRepository channelStatRepository;
    private final AudienceStatRepository audienceStatRepository;
    private final InflowRouteRepository inflowRouteRepository;
    private final DeviceAnalysisRepository deviceAnalysisRepository;
    private final CommentRepository commentRepository;
    private final InsightRepository insightRepository;
    private final ChannelDashboardStatRepository channelDashboardStatRepository;
    private final CachedKeywordSearchResultRepository cachedKeywordSearchResultRepository;
    private final ObjectMapper objectMapper;
    
    @Value("${youtube.data-collection.admin-user-id}")
    private String adminGoogleId;

    @Value("${youtube.data-collection.channel-update-days}")
    private int channelUpdateDays;
	
	public DataCollectorService(OAuthService oAuthService, UserService userService, ChannelService channelService,
			YoutubeAnalyticsService youtubeAnalyticsService, YoutubeDataApiService youtubeDataApiService,
			KeywordAnalysisService keywordAnalysisService, YouTubeChannelRepository youTubeChannelRepository,
			YouTubeVideoRepository youTubeVideoRepository, VideoStatRepository videoStatRepository,
			ChannelStatRepository channelStatRepository, AudienceStatRepository audienceStatRepository,
			InflowRouteRepository inflowRouteRepository, DeviceAnalysisRepository deviceAnalysisRepository,
			CommentRepository commentRepository, InsightRepository insightRepository,
			ChannelDashboardStatRepository channelDashboardStatRepository,
			CachedKeywordSearchResultRepository cachedKeywordSearchResultRepository, ObjectMapper objectMapper) {
		this.oAuthService = oAuthService;
		this.userService = userService;
		this.channelService = channelService;
		this.youtubeAnalyticsService = youtubeAnalyticsService;
		this.youtubeDataApiService = youtubeDataApiService;
		this.keywordAnalysisService = keywordAnalysisService;
		this.youTubeChannelRepository = youTubeChannelRepository;
		this.youTubeVideoRepository = youTubeVideoRepository;
		this.videoStatRepository = videoStatRepository;
		this.channelStatRepository = channelStatRepository;
		this.audienceStatRepository = audienceStatRepository;
		this.inflowRouteRepository = inflowRouteRepository;
		this.deviceAnalysisRepository = deviceAnalysisRepository;
		this.commentRepository = commentRepository;
		this.insightRepository = insightRepository;
		this.channelDashboardStatRepository = channelDashboardStatRepository;
		this.cachedKeywordSearchResultRepository = cachedKeywordSearchResultRepository;
		this.objectMapper = objectMapper;
		this.adminGoogleId = adminGoogleId;
		this.channelUpdateDays = channelUpdateDays;
	}

	/**
	 * Store all of user's channel, once in a day.
	 * initialDelay = 10000ms (Scheduling starts in 10 seconds after application starting)
     * fixedRate = 24 * 60 * 60 * 1000ms (schedule again in 24hrs)
	 */
//	@Scheduled(initialDelay = 5000, fixedRate = 24 * 60 * 60 * 1000)
	@Scheduled(cron = "0 0 2 * * ?", zone = "Asia/Seoul")
	@Transactional
	public void collectDailyChannelAndVideoStats() {
		logger.info("Starting daily data collection for YouTube Analytics for all users.");

		List<User> users = userService.findAllUsers();

		if (users.isEmpty()) {
			logger.warn("No users found in DB. Skipping data collection for all users.");
			return;
		}

		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
		LocalDate today = LocalDate.now();
		LocalDate analyticsDataEndDate = today.minusDays(1); // 어제까지의 데이터 (Google API 지연 고려)

		for (User user : users) {
			String googleId = user.getGoogleId();
			String channelId = user.getMyChannelId();

			if (channelId == null || channelId.isEmpty()) {
				logger.warn("User {} has no linked YouTube channel ID. Skipping data collection for this user.", googleId);
				continue;
			}
            
            collectDataForSingleUserInternal(user, formatter, today, analyticsDataEndDate);
		}
		logger.info("Daily data collection for all users finished.");
	}
	
	/**
     * [새로운 기능] 특정 사용자(채널)에 대한 데이터 수집을 즉시 트리거합니다.
     * 주로 신규 사용자 로그인 시 또는 관리자가 수동으로 특정 채널 데이터 갱신 시 사용합니다.
     *
     * @param googleId 데이터를 수집할 사용자의 Google ID
     */
    @Transactional
    public void collectDataForSingleUser(String googleId) {
        logger.info("Triggering immediate data collection for single user: {}.", googleId);

        Optional<User> userOpt = userService.findByGoogleId(googleId);
        if (userOpt.isEmpty()) {
            logger.warn("User {} not found for immediate data collection. Skipping.", googleId);
            return;
        }

        User user = userOpt.get();
        String channelId = user.getMyChannelId();

        if (channelId == null || channelId.isEmpty()) {
            logger.warn("User {} has no linked YouTube channel ID. Skipping immediate data collection for this user.", googleId);
            return;
        }

        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate today = LocalDate.now();
        LocalDate analyticsDataEndDate = today.minusDays(1);

        collectDataForSingleUserInternal(user, formatter, today, analyticsDataEndDate);

        logger.info("Immediate data collection finished for user: {}.", googleId);
    }
    
    /**
     * [내부 헬퍼] 단일 사용자(채널)에 대한 모든 데이터 수집의 핵심 로직.
     * collectDailyChannelAndVideoStats 및 collectDataForSingleUser에서 호출됩니다.
     * @param user 대상 User 엔티티
     * @param formatter 날짜 포맷터
     * @param today 현재 날짜
     * @param analyticsDataEndDate 분석 데이터 종료 날짜
     */
    @Transactional // 내부 호출이지만 Transactional 명시
    protected void collectDataForSingleUserInternal(User user, DateTimeFormatter formatter, LocalDate today, LocalDate analyticsDataEndDate) {
        String googleId = user.getGoogleId();
        String channelId = user.getMyChannelId(); // myChannelId는 이미 User 엔티티에 있다고 가정

        if (channelId == null || channelId.isEmpty()) {
            logger.warn("Internal: User {} has no linked YouTube channel ID. Skipping data collection.", googleId);
            return;
        }

        try {
            // --------------------------------------------------------------------------------
            // 0. (재확인) TB_YT_CHANNEL 엔트리 및 통계 업데이트
            // --------------------------------------------------------------------------------
            logger.info("Ensuring TB_YT_CHANNEL entry for channel: {} and fetching latest stats.", channelId);
            ChannelListResponse currentChannelInfoResponse = channelService.getChannelInfoById(googleId, channelId);

            if (currentChannelInfoResponse == null || currentChannelInfoResponse.getItems() == null || currentChannelInfoResponse.getItems().isEmpty()) {
                logger.warn("Could not retrieve current channel info from API/Cache for channel {}. Skipping further data collection for this user.", channelId);
                return;
            }
            Channel currentChannel = currentChannelInfoResponse.getItems().get(0);


            // --------------------------------------------------------------------------------
            // 1. 채널 통계 (TB_CHANNEL_STATS) 데이터 수집
            // --------------------------------------------------------------------------------
            LocalDate channelStatStartDate = analyticsDataEndDate.minus(Period.ofDays(29));
            Long cumulativeTotalWatchTime = 0L;
            try {
                // TODO: 실제 채널 생성일로 대체 (YouTubeChannel 엔티티에 있다면 가져와야 함)
                String channelCreationDateStr = "2005-01-01"; // YouTube 설립 초기일
                
                QueryResponse cumulativeWatchTimeResponse = youtubeAnalyticsService.getChannelCumulativeWatchTime(
                    googleId, channelCreationDateStr, analyticsDataEndDate.format(formatter), channelId
                );

                if (cumulativeWatchTimeResponse != null && cumulativeWatchTimeResponse.getRows() != null && !cumulativeWatchTimeResponse.getRows().isEmpty()) {
                    // getRows().get(0).get(0)이 BigDecimal일 경우를 안전하게 처리
                    Object rawValue = cumulativeWatchTimeResponse.getRows().get(0).get(0);
                    if (rawValue instanceof BigDecimal) {
                        cumulativeTotalWatchTime = ((BigDecimal) rawValue).longValue();
                    } else if (rawValue instanceof Long) { // 혹시 Long으로 바로 올 경우 대비
                        cumulativeTotalWatchTime = (Long) rawValue;
                    } else if (rawValue instanceof Integer) { // 혹시 Integer로 바로 올 경우 대비
                        cumulativeTotalWatchTime = ((Integer) rawValue).longValue();
                    }
                    logger.info("Retrieved cumulative total watch time for channel {}: {} minutes", channelId, cumulativeTotalWatchTime);
                } else {
                    logger.warn("No cumulative total watch time data found for channel {}. Setting to 0.", channelId);
                }

            } catch (Exception e) {
                logger.warn("Failed to fetch cumulative total watch time for channel {}: {}", channelId, e.getMessage());
            }

            for (LocalDate currentDate = channelStatStartDate; !currentDate.isAfter(analyticsDataEndDate); currentDate = currentDate.plusDays(1)) {
                String dateStr = currentDate.format(formatter);
                LocalDateTime statsDateTime = currentDate.atStartOfDay();

                ChannelStatsId channelStatsId = new ChannelStatsId(channelId, statsDateTime);
                Optional<ChannelStat> existingStat = channelStatRepository.findById(channelStatsId);

                if (existingStat.isPresent()) {
                    logger.debug("Channel stats already exist for channel {} on {}. Skipping API call for this date.", channelId, dateStr);
                    continue;
                }

                logger.info("Collecting daily channel stats for user: {}, channel: {} on date: {}", googleId, channelId, dateStr);
                QueryResponse channelStatsResponse = youtubeAnalyticsService.getChannelBasicAnalytics(googleId, dateStr, dateStr, channelId);

                Long views = 0L;
                Long estimatedMinutesWatched = 0L;
                Long subscribersGained = 0L;
                Long averageViewDuration = 0L;

                if (channelStatsResponse != null && channelStatsResponse.getRows() != null && !channelStatsResponse.getRows().isEmpty()) {
                    List<Object> row = channelStatsResponse.getRows().get(0);
                    views = ((BigDecimal) row.get(1)).longValue();
                    estimatedMinutesWatched = ((BigDecimal) row.get(2)).longValue();
                    subscribersGained = ((BigDecimal) row.get(3)).longValue();
                    averageViewDuration = ((BigDecimal) row.get(4)).longValue();
                } else {
                    logger.warn("No rows found in channelStatsResponse for channel {} on {}. Setting daily stats to 0.", channelId, dateStr);
                }

                ChannelStat channelStat = new ChannelStat();
                channelStat.setId(channelStatsId);
                channelStat.setSubscriberGained(subscribersGained.intValue());
                channelStat.setDailyViewsCnt(views);
                channelStat.setEstimatedMinWatched(estimatedMinutesWatched);
                channelStat.setAvgViewDuration(averageViewDuration); // DB는 Integer
                // DB의 ChannelStat.avgViewDuration은 Long으로 되어 있으므로 intValue() 대신 longValue() 사용
                // channelStat.setAvgViewDuration(averageViewDuration); // if DB is Long

                // 누적 통계 필드 (YouTube Data API의 Channel Resource에서 가져옴)
                if (currentChannel.getStatistics() != null) {
                    channelStat.setSubscriberCnt(currentChannel.getStatistics().getSubscriberCount().longValue());
                    channelStat.setTotalViewsCnt(currentChannel.getStatistics().getViewCount().longValue());
                    channelStat.setVideosCnt(currentChannel.getStatistics().getVideoCount().longValue());
                    channelStat.setTotalWatchTime(cumulativeTotalWatchTime); // 위에서 가져온 누적 시청 시간
                } else {
                    logger.warn("No statistics found for channel {} from Data API. Setting total counts to 0.", channelId);
                    channelStat.setSubscriberCnt(0L);
                    channelStat.setTotalViewsCnt(0L);
                    channelStat.setVideosCnt(0L);
                    channelStat.setTotalWatchTime(0L);
                }

                try {
                    channelStatRepository.save(channelStat);
                    logger.info("Saved daily channel stats for {}: Views={}, MinWatched={}, SubGained={}, AvgDur={}. TotalSub={}, TotalViews={}, TotalVideos={}, TotalWatchTime={}",
                            dateStr, views, estimatedMinutesWatched, subscribersGained, averageViewDuration,
                            channelStat.getSubscriberCnt(), channelStat.getTotalViewsCnt(), channelStat.getVideosCnt(), channelStat.getTotalWatchTime());
                } catch (Exception dbSaveEx) {
                    logger.error("Error saving daily channel stats for {}: {}", dateStr, dbSaveEx.getMessage(), dbSaveEx);
                }
            }


            // --------------------------------------------------------------------------------
            // 2. 비디오 메타데이터 (TB_VIDEO) 수집
            // --------------------------------------------------------------------------------
            logger.info("Collecting video metadata for user: {}, channel: {}", googleId, channelId);
            String uploadsPlaylistId = null;
            if (currentChannel.getContentDetails() != null
                    && currentChannel.getContentDetails().getRelatedPlaylists() != null
                    && currentChannel.getContentDetails().getRelatedPlaylists().getUploads() != null) {
                uploadsPlaylistId = currentChannel.getContentDetails().getRelatedPlaylists().getUploads();
            }
            
            Credential credential = oAuthService.getCredential(googleId);
			if (credential == null || credential.getAccessToken() == null) {
	            throw new GeneralSecurityException("OAuth 인증이 필요합니다. 사용자(" + googleId + ")의 Credential이 유효하지 않습니다.");
	        }

            YouTube youTube = oAuthService.getYouTubeService(credential); // User의 googleId로 Credential 가져옴

            if (uploadsPlaylistId != null) {
                YouTube.PlaylistItems.List playlistItemsRequest = youTube.playlistItems()
                        .list(Arrays.asList("snippet", "contentDetails"));
                playlistItemsRequest.setPlaylistId(uploadsPlaylistId);
                playlistItemsRequest.setMaxResults(50L);

                PlaylistItemListResponse playlistResponse;
                String nextPageToken = null;
                do {
                    playlistItemsRequest.setPageToken(nextPageToken);
                    playlistResponse = playlistItemsRequest.execute();
                    if (playlistResponse.getItems() != null) {
                        List<String> videoKeys = playlistResponse.getItems().stream()
                                .map(item -> item.getContentDetails().getVideoId()).collect(Collectors.toList());
                        // processAndSaveVideoData는 TB_VIDEO (메타데이터)만 저장합니다.
                        processAndSaveVideoData(googleId, videoKeys, youTube, LocalDate.now().minusDays(1).format(formatter));
                    }
                    nextPageToken = playlistResponse.getNextPageToken();
                } while (nextPageToken != null);
            } else {
                logger.warn("Uploads playlist ID not found for channel {}. Skipping video metadata collection.", channelId);
            }


            // --------------------------------------------------------------------------------
            // 3. 비디오별 일일 통계 (TB_VIDEO_STATS) 수집
            // --------------------------------------------------------------------------------
            logger.info("Collecting daily video stats for user: {}, channel: {}", googleId, channelId);
            List<YouTubeVideo> allChannelVideos = youTubeVideoRepository.findByChannelId(channelId);

            for (YouTubeVideo youTubeVideo : allChannelVideos) {
                Long videoDbId = youTubeVideo.getVideoId();
                String youTubeVideoKey = youTubeVideo.getVideoKey();
                LocalDate videoUploadedDate = youTubeVideo.getUploadedAt().toLocalDate();

                if (videoUploadedDate.isAfter(analyticsDataEndDate)) {
                    logger.debug("Video {} uploaded date {} is after current analytics end date {}. Skipping detailed video stats collection.", youTubeVideoKey, videoUploadedDate, analyticsDataEndDate);
                    continue;
                }

                LocalDateTime videoStatsCollectionDate = analyticsDataEndDate.atStartOfDay(); // video stats date

                VideoStatsId videoStatsId = new VideoStatsId(videoDbId, videoStatsCollectionDate);
                Optional<VideoStat> existingVideoStat = videoStatRepository.findById(videoStatsId);

                if (existingVideoStat.isPresent() && existingVideoStat.get().getViewCount() != null && existingVideoStat.get().getSubscriberGained() != null) {
                    logger.debug("All Video stats already exist for video {} on {}. Skipping API call for this video.", youTubeVideoKey, videoStatsCollectionDate);
                    continue;
                }
                
                VideoStat videoStatToSave = existingVideoStat.orElseGet(VideoStat::new);
                videoStatToSave.setId(videoStatsId);

                // YouTube Data API를 통한 누적 통계 가져오기 (views, likes, comments)
                try {
                    Video videoDetailsAndStats = youtubeDataApiService.getVideoStatistics(googleId, youTubeVideoKey);
                    if (videoDetailsAndStats != null && videoDetailsAndStats.getStatistics() != null) {
                        videoStatToSave.setViewCount(videoDetailsAndStats.getStatistics().getViewCount().longValue());
                        videoStatToSave.setLikeCount(videoDetailsAndStats.getStatistics().getLikeCount() != null ? videoDetailsAndStats.getStatistics().getLikeCount().intValue() : null);
                        videoStatToSave.setCommentCount(videoDetailsAndStats.getStatistics().getCommentCount() != null ? videoDetailsAndStats.getStatistics().getCommentCount().intValue() : null);
                        logger.debug("Retrieved Data API Stats for video {} (Current): ViewCount={}, LikeCount={}, CommentCount={}", youTubeVideoKey, videoStatToSave.getViewCount(), videoStatToSave.getLikeCount(), videoStatToSave.getCommentCount());
                    } else {
                        logger.warn("No statistics found from Data API for video {}. Setting counts to NULL.", youTubeVideoKey);
                        videoStatToSave.setViewCount(null); videoStatToSave.setLikeCount(null); videoStatToSave.setCommentCount(null);
                    }
                } catch (IOException | GeneralSecurityException e) {
                    logger.error("Error fetching current video statistics from Data API for video {}: {}", youTubeVideoKey, e.getMessage());
                    videoStatToSave.setViewCount(null); videoStatToSave.setLikeCount(null); videoStatToSave.setCommentCount(null);
                }

                // YouTube Analytics API를 통한 누적 통계 (AvgWatchTime, SubscriberGained) 가져오기
                try {
                    String metricsForCumulative = "subscribersGained,averageViewDuration";
                    QueryResponse videoAnalyticsCumulativeResponse = youtubeAnalyticsService.getVideoAnalyticsCumulativeMetrics(
                            googleId, videoUploadedDate.format(formatter), analyticsDataEndDate.format(formatter), youTubeVideoKey, metricsForCumulative);

                    if (videoAnalyticsCumulativeResponse != null && videoAnalyticsCumulativeResponse.getRows() != null && !videoAnalyticsCumulativeResponse.getRows().isEmpty()) {
                        List<Object> analyticRow = videoAnalyticsCumulativeResponse.getRows().get(0);
                        Integer cumulativeSubGained = ((BigDecimal) analyticRow.get(0)).intValue();
                        Long cumulativeAvgDuration = ((BigDecimal) analyticRow.get(1)).longValue();

                        videoStatToSave.setAvgWatchTime(cumulativeAvgDuration.intValue());
                        videoStatToSave.setSubscriberGained(cumulativeSubGained);
                        logger.debug("Retrieved Cumulative Analytics for video {} (Up to {}): SubGained={}, AvgDuration={}", youTubeVideoKey, analyticsDataEndDate.format(formatter), cumulativeSubGained, cumulativeAvgDuration);
                    } else {
                        logger.warn("No cumulative analytics data found for video {} up to {}. Setting relevant stats to NULL.", youTubeVideoKey, analyticsDataEndDate.format(formatter));
                        videoStatToSave.setAvgWatchTime(null); videoStatToSave.setSubscriberGained(null);
                    }
                } catch (IOException | GeneralSecurityException e) {
                    logger.error("Error fetching cumulative video analytics for video {} up to {}: {}", youTubeVideoKey, analyticsDataEndDate.format(formatter), e.getMessage());
                    videoStatToSave.setAvgWatchTime(null); videoStatToSave.setSubscriberGained(null);
                }

                try {
                    videoStatRepository.save(videoStatToSave);
                    logger.info("Saved/Updated VideoStat for video {} on {}. Final values: ViewCount={}, LikeCount={}, CommentCount={}, AvgWatchTime={}, SubscriberGained={}",
                            youTubeVideoKey, videoStatsCollectionDate.format(formatter), videoStatToSave.getViewCount(), videoStatToSave.getLikeCount(),
                            videoStatToSave.getCommentCount(), videoStatToSave.getAvgWatchTime(), videoStatToSave.getSubscriberGained());
                } catch (Exception dbSaveEx) {
                    logger.error("Error saving/updating VideoStat for video {} on {}: {}", youTubeVideoKey, videoStatsCollectionDate.format(formatter), dbSaveEx.getMessage(), dbSaveEx);
                }
            }


            // --------------------------------------------------------------------------------
            // 4. 채널별 Audience (성별, 연령대), Inflow Route, Device Analysis, Country Stats 수집
            // --------------------------------------------------------------------------------
            logger.info("Collecting channel-wide analytics stats (Audience, Inflow, Device, Country) for user: {}, channel: {}", googleId, channelId);

            // 대시보드 통계 저장 기준 날짜
            LocalDateTime dashboardCollectionDate = LocalDate.now().atStartOfDay(); // 모든 분포 통계에 일관된 날짜

            ChannelDashboardStatsId dashboardStatsId = new ChannelDashboardStatsId(channelId, dashboardCollectionDate);
            Optional<ChannelDashboardStat> existingDashboardStat = channelDashboardStatRepository.findById(dashboardStatsId);
            ChannelDashboardStat dashboardStatToSave = existingDashboardStat.orElseGet(ChannelDashboardStat::new);
            dashboardStatToSave.setId(dashboardStatsId);


            // 1. 성별 분포 (Gender Distribution)
            QueryResponse genderAgeResponse = youtubeAnalyticsService.getChannelAudienceAnalytics(googleId, channelStatStartDate.format(formatter), analyticsDataEndDate.format(formatter), channelId);
            if (genderAgeResponse != null && genderAgeResponse.getRows() != null && !genderAgeResponse.getRows().isEmpty()) {
                Map<String, Long> genderViews = new HashMap<>();
                long totalViewsForGender = 0;
                for (List<Object> row : genderAgeResponse.getRows()) {
                    String gender = (String) row.get(0);
                    Long views = ((BigDecimal) row.get(2)).longValue();
                    genderViews.merge(gender, views, Long::sum);
                    totalViewsForGender += views;
                }
                List<Map<String, Object>> genderList = new ArrayList<>();
                for (Map.Entry<String, Long> entry : genderViews.entrySet()) {
                    double percentage = (totalViewsForGender > 0) ? (double) entry.getValue() / totalViewsForGender * 100 : 0.0;
                    Map<String, Object> genderData = new HashMap<>();
                    genderData.put("gender", entry.getKey());
                    genderData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                    genderList.add(genderData);
                }
                dashboardStatToSave.setGenderDistributionJson(objectMapper.writeValueAsString(genderList));
            } else {
                logger.warn("No gender data found for channel {}", channelId);
                dashboardStatToSave.setGenderDistributionJson("[]");
            }


            // 2. 연령대 분포 (Age Group Distribution)
            if (genderAgeResponse != null && genderAgeResponse.getRows() != null && !genderAgeResponse.getRows().isEmpty()) {
                Map<String, Long> ageGroupViews = new HashMap<>();
                long totalViewsForAgeGroup = 0;
                for (List<Object> row : genderAgeResponse.getRows()) {
                    String ageGroup = (String) row.get(1);
                    Long views = ((BigDecimal) row.get(2)).longValue();
                    ageGroupViews.merge(ageGroup, views, Long::sum);
                    totalViewsForAgeGroup += views;
                }
                List<Map<String, Object>> ageGroupList = new ArrayList<>();
                for (Map.Entry<String, Long> entry : ageGroupViews.entrySet()) {
                    String formattedAgeGroup = entry.getKey();
                    if (formattedAgeGroup.startsWith("age")) {
                        formattedAgeGroup = formattedAgeGroup.substring(3);
                    }
                    if (formattedAgeGroup.endsWith("_")) {
                        formattedAgeGroup = formattedAgeGroup.replace("_", "+");
                    }
                    double percentage = (totalViewsForAgeGroup > 0) ? (double) entry.getValue() / totalViewsForAgeGroup * 100 : 0.0;
                    Map<String, Object> ageGroupData = new HashMap<>();
                    ageGroupData.put("ageGroup", formattedAgeGroup);
                    ageGroupData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                    ageGroupList.add(ageGroupData);
                }
                dashboardStatToSave.setAgeGroupDistributionJson(objectMapper.writeValueAsString(ageGroupList));
            } else {
                logger.warn("No age group data found for channel {}", channelId);
                dashboardStatToSave.setAgeGroupDistributionJson("[]");
            }


            // 3. 국가별 시청자 (Country Distribution)
            QueryResponse countryResponse = youtubeAnalyticsService.getChannelCountryAnalytics(googleId, channelStatStartDate.format(formatter), analyticsDataEndDate.format(formatter), channelId);
            if (countryResponse != null && countryResponse.getRows() != null && !countryResponse.getRows().isEmpty()) {
                long totalViewsForCountry = countryResponse.getRows().stream()
                                                            .mapToLong(row -> ((BigDecimal) row.get(1)).longValue())
                                                            .sum();
                List<Map<String, Object>> countryList = new ArrayList<>();
                for (List<Object> row : countryResponse.getRows()) {
                    String countryCode = (String) row.get(0);
                    Long viewsCount = ((BigDecimal) row.get(1)).longValue();
                    double percentage = (totalViewsForCountry > 0) ? (double) viewsCount / totalViewsForCountry * 100 : 0.0;
                    Map<String, Object> countryData = new HashMap<>();
                    countryData.put("country", countryCode);
                    countryData.put("viewsCount", viewsCount);
                    countryData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                    countryList.add(countryData);
                }
                dashboardStatToSave.setCountryDistributionJson(objectMapper.writeValueAsString(countryList));
            } else {
                logger.warn("No country data found for channel {}", channelId);
                dashboardStatToSave.setCountryDistributionJson("[]");
            }


            // 4. 주요 트래픽 소스 (Traffic Source Distribution)
            QueryResponse trafficSourceResponse = youtubeAnalyticsService.getChannelTrafficSourceAnalytics(googleId, channelStatStartDate.format(formatter), analyticsDataEndDate.format(formatter), channelId);
            if (trafficSourceResponse != null && trafficSourceResponse.getRows() != null && !trafficSourceResponse.getRows().isEmpty()) {
                long totalViewsForTraffic = trafficSourceResponse.getRows().stream()
                                                                .mapToLong(row -> ((BigDecimal) row.get(1)).longValue())
                                                                .sum();
                List<Map<String, Object>> trafficList = new ArrayList<>();
                for (List<Object> row : trafficSourceResponse.getRows()) {
                    String sourceType = (String) row.get(0);
                    Long views = ((BigDecimal) row.get(1)).longValue();
                    double percentage = (totalViewsForTraffic > 0) ? (double) views / totalViewsForTraffic * 100 : 0.0;
                    Map<String, Object> trafficData = new HashMap<>();
                    trafficData.put("sourceType", sourceType);
                    trafficData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                    trafficList.add(trafficData);
                }
                dashboardStatToSave.setTrafficSourceDistributionJson(objectMapper.writeValueAsString(trafficList));
            } else {
                logger.warn("No traffic source data found for channel {}", channelId);
                dashboardStatToSave.setTrafficSourceDistributionJson("[]");
            }


            // 5. 기기 유형별 시청 비율 (Device Distribution)
            QueryResponse deviceResponse = youtubeAnalyticsService.getChannelDeviceAnalytics(googleId, channelStatStartDate.format(formatter), analyticsDataEndDate.format(formatter), channelId);
            if (deviceResponse != null && deviceResponse.getRows() != null && !deviceResponse.getRows().isEmpty()) {
                long totalViewsForDevice = deviceResponse.getRows().stream()
                                                            .mapToLong(row -> ((BigDecimal) row.get(1)).longValue())
                                                            .sum();
                List<Map<String, Object>> deviceList = new ArrayList<>();
                for (List<Object> row : deviceResponse.getRows()) {
                    String deviceTypeStr = (String) row.get(0);
                    Long views = ((BigDecimal) row.get(1)).longValue();
                    double percentage = (totalViewsForDevice > 0) ? (double) views / totalViewsForDevice * 100 : 0.0;
                    Map<String, Object> deviceData = new HashMap<>();
                    deviceData.put("deviceType", deviceTypeStr);
                    deviceData.put("viewsCount", views);
                    deviceData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                    deviceList.add(deviceData);
                }
                dashboardStatToSave.setDeviceDistributionJson(objectMapper.writeValueAsString(deviceList));
            } else {
                logger.warn("No device data found for channel {}", channelId);
                dashboardStatToSave.setDeviceDistributionJson("[]");
            }

            // 최종 ChannelDashboardStat 저장
            channelDashboardStatRepository.save(dashboardStatToSave);
            logger.info("Successfully collected and saved dashboard stats for channel: {}", channelId);

        } catch (TokenResponseException e) {
            logger.error("Authentication required for channel {}: {}", channelId, e.getMessage());
            // TODO: 사용자에게 재인증을 요청하는 로직 (예: 이메일 전송, 상태 업데이트)
        } catch (IOException | GeneralSecurityException e) {
            logger.error("Error collecting dashboard stats for channel {}: {}", channelId, e.getMessage(), e);
        } catch (Exception e) {
            logger.error("Unexpected error during dashboard stats collection for channel {}: {}", channelId, e.getMessage(), e);
        }
    }
	
	@Transactional
	private void collectAudienceStats(String googleId, String youTubeVideoKey, String dateStr, Long videoId, LocalDate uploadedDate) throws GeneralSecurityException, IOException {
		logger.info("Collecting Audience Stats for video: {} (YouTube ID: {}) on date: {}", videoId, youTubeVideoKey, dateStr);
		
		LocalDateTime startDate = uploadedDate.atStartOfDay();
		LocalDateTime endDate = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).minusDays(1).atStartOfDay();
		
		QueryResponse audienceResponse = youtubeAnalyticsService.getAudienceStats(googleId, startDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), endDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), youTubeVideoKey);

        if (audienceResponse == null || audienceResponse.getRows() == null || audienceResponse.getRows().isEmpty()) {
            logger.warn("No audience data found for video {} on {}. Skipping saving.", youTubeVideoKey, dateStr);
            return;
        }
        
        LocalDateTime statsDateTime = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).atStartOfDay();
        
        for (List<Object> row : audienceResponse.getRows()) {
        	logger.debug("AudienceStats - Full Row for video {} on {}: {}", videoId, dateStr, row);
        	
            String genderStr = (String) row.get(0);
            String ageGroupStr = (String) row.get(1);
            Double watchingRatioDouble = ((BigDecimal) row.get(2)).doubleValue();

            // Convert to ENUM
            Gender gender = Gender.valueOf(genderStr.toUpperCase());
            AgeGroup ageGroup = AgeGroup.fromDbValue(ageGroupStr);
            logger.info("AudienceStats - API ageGroupStr: '{}', Converted AgeGroup: {}, getDbValue(): '{}'", ageGroupStr, ageGroup, ageGroup.getDbValue());
            
            
            AudienceStatsId audienceStatsId = new AudienceStatsId(videoId, gender, ageGroup, statsDateTime);
            Optional<AudienceStat> existingStat = audienceStatRepository.findById(audienceStatsId);
            if (existingStat.isPresent()) {
                logger.info("Audience Stats already exist for video {} on {} for device type {}. Skipping saving (inner loop).", videoId, dateStr);
                continue;
           }
            AudienceStat audienceStat = existingStat.orElseGet(AudienceStat::new);
            
            audienceStat.setId(audienceStatsId);
            audienceStat.setWatchingRatio(BigDecimal.valueOf(watchingRatioDouble)); // Double -> BigDecimal

            try {
                audienceStatRepository.save(audienceStat);
                logger.info("Saved Audience Stats for video {} on {}: Gender={}, Age={}, Ratio={}", videoId, dateStr, genderStr, ageGroupStr, watchingRatioDouble);
            } catch (Exception dbSaveEx) {
                logger.error("Error saving Audience Stats for video {} on {}: {}", videoId, dateStr, dbSaveEx.getMessage(), dbSaveEx);
            }
        }
        
	}
	
	@Transactional
	private void collectInflowRouteStats(String googleId, String youTubeVideoKey, String dateStr, Long videoId, LocalDate uploadedDate) throws GeneralSecurityException, IOException {
		logger.info("Collecting Inflow Route Stats for video: {} (YouTube ID: {}) on date: {}", videoId, youTubeVideoKey, dateStr);
		
		LocalDateTime startDate = uploadedDate.atStartOfDay();
		LocalDateTime endDate = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).minusDays(1).atStartOfDay();
		
		LocalDateTime statsDateTime = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).atStartOfDay();
		
		QueryResponse inflowResponse = youtubeAnalyticsService.getInflowRouteStats(googleId, startDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), endDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
				youTubeVideoKey);

		if (inflowResponse == null || inflowResponse.getRows() == null || inflowResponse.getRows().isEmpty()) {
			logger.warn("No inflow route data found for video {} on {}. Skipping saving.", youTubeVideoKey, dateStr);
			return;
		}
		
		long totalInflowViewsForVideoAndDate = 0L;
		for (List<Object> row : inflowResponse.getRows()) {
			totalInflowViewsForVideoAndDate += ((BigDecimal) row.get(1)).longValue();
		}
        
        for (List<Object> row : inflowResponse.getRows()) {
            String trafficSourceTypeDimension = (String) row.get(0);
            Long viewsMetric = ((BigDecimal) row.get(1)).longValue();
            
            InflowRouteId inflowRouteId = new InflowRouteId(videoId, trafficSourceTypeDimension, statsDateTime);
            Optional<InflowRoute> existingStat = inflowRouteRepository.findById(inflowRouteId);
            if (existingStat.isPresent() || viewsMetric < 1) {
                logger.info("Inflow Route Stats already exist for video {} on {} for device type {}. Skipping saving (inner loop).", videoId, dateStr);
                continue;
           }
            
            InflowRoute inflowRoute = existingStat.orElseGet(InflowRoute::new);
            
            inflowRoute.setId(inflowRouteId);
            inflowRoute.setInflowCount(viewsMetric.intValue());
            
            BigDecimal inflowRate;
            if (totalInflowViewsForVideoAndDate > 0) {
                inflowRate = BigDecimal.valueOf(viewsMetric)
                                          .divide(BigDecimal.valueOf(totalInflowViewsForVideoAndDate), 3, RoundingMode.HALF_UP) // 소수점 3자리까지 계산
                                          .multiply(BigDecimal.valueOf(100));
                inflowRate = inflowRate.setScale(1, RoundingMode.HALF_UP);
            } else {
                inflowRate = BigDecimal.ZERO;
            }
            
            inflowRoute.setInflowRate(inflowRate);

            try {
                inflowRouteRepository.save(inflowRoute);
                logger.info("Saved Inflow Route Stats for video {} on {}: Type={}, Count={}", videoId, dateStr, trafficSourceTypeDimension, viewsMetric);
            } catch (Exception dbSaveEx) {
                logger.error("Error saving Inflow Route Stats for video {} on {}: {}", videoId, dateStr, dbSaveEx.getMessage(), dbSaveEx);
            }
        }
	}
	
	@Transactional
	private void collectDeviceAnalysisStats(String googleId, String youTubeVideoKey, String dateStr, Long videoId, LocalDate uploadedDate) throws IOException, GeneralSecurityException {
        logger.info("Collecting Device Analysis Stats for video: {} (YouTube ID: {}) on date: {}", videoId, youTubeVideoKey, dateStr);
        
        LocalDateTime startDate = uploadedDate.atStartOfDay();
		LocalDateTime endDate = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).minusDays(1).atStartOfDay();
		
		LocalDateTime statsDateTime = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).atStartOfDay();
		
        QueryResponse deviceResponse = youtubeAnalyticsService.getDeviceAnalysisStats(googleId, startDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), 
        		endDate.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), youTubeVideoKey);
        
        if (deviceResponse == null || deviceResponse.getRows() == null || deviceResponse.getRows().isEmpty()) {
            logger.warn("No device analysis data found for video {} on {}. Skipping saving.", youTubeVideoKey, dateStr);
            return;
        }
        
        
        long totalDeviceViewsForVideoAndDate = 0L;
        for (List<Object> row : deviceResponse.getRows()) {
            totalDeviceViewsForVideoAndDate += ((BigDecimal) row.get(1)).longValue(); // 각 row의 views 메트릭 합산
        }
        
        for (List<Object> row : deviceResponse.getRows()) {
            String deviceTypeStr = (String) row.get(0);
            Long deviceViewsMetric = ((BigDecimal) row.get(1)).longValue(); // Metrics: views (BigDecimal -> Long)

            DeviceType deviceType = DeviceType.fromDbValue(deviceTypeStr);

            DeviceAnalysisId currentDeviceAnalysisId = new DeviceAnalysisId(videoId, deviceType, statsDateTime);
            Optional<DeviceAnalysis> currentExistingStat = deviceAnalysisRepository.findById(currentDeviceAnalysisId);
            if (currentExistingStat.isPresent()) {
                 logger.info("Device Analysis Stats already exist for video {} on {} for device type {}. Skipping saving (inner loop).", videoId, dateStr, deviceTypeStr);
                 continue;
            }

            DeviceAnalysis deviceAnalysis = new DeviceAnalysis();
            deviceAnalysis.setId(currentDeviceAnalysisId);
            
            BigDecimal watchingRatio;
            if (totalDeviceViewsForVideoAndDate > 0) {
                watchingRatio = BigDecimal.valueOf(deviceViewsMetric)
                                          .divide(BigDecimal.valueOf(totalDeviceViewsForVideoAndDate), 3, RoundingMode.HALF_UP) // 소수점 3자리까지 계산
                                          .multiply(BigDecimal.valueOf(100)); // 백분율로 변환

                watchingRatio = watchingRatio.setScale(1, RoundingMode.HALF_UP);

            } else {
                watchingRatio = BigDecimal.ZERO;
            }
            deviceAnalysis.setWatchingRatio(watchingRatio);

            try {
                deviceAnalysisRepository.save(deviceAnalysis);
                logger.info("Saved Device Analysis Stats for video {} on {}: Type={}, Ratio={}", videoId, dateStr, deviceTypeStr, watchingRatio);
            } catch (Exception dbSaveEx) {
                logger.error("Error saving Device Analysis Stats for video {} on {}: {}", videoId, dateStr, dbSaveEx.getMessage(), dbSaveEx);
            }
        }
    }
	

	private Integer parseYouTubeDuration(String youtubeDuration) {
        if (youtubeDuration == null || youtubeDuration.isEmpty()) {
            return 0;
        }
        Duration duration = Duration.parse(youtubeDuration);
        return (int) duration.getSeconds();
    }
	
//	@Scheduled(initialDelay = 5000, fixedRate = 24 * 60 * 60 * 1000)
	@Scheduled(cron = "0 0 2 * * ?", zone = "Asia/Seoul")
    @Transactional
    public void refreshOutdatedChannelInfo() {
        logger.info("Starting refresh of outdated channel info in TB_YT_CHANNEL...");
        LocalDateTime threshold = LocalDateTime.now().minusDays(channelUpdateDays); // N일 전 시간

        List<YouTubeChannel> outdatedChannels = youTubeChannelRepository.findByUpdatedAtBefore(threshold);
        outdatedChannels.add(youTubeChannelRepository.findById("UCpP6Av1nV0uh2Ys3T7QiXPw").get());
        outdatedChannels.add(youTubeChannelRepository.findById("UCK8oKuBKx_ejIYnw4J90TYA").get());

        if (outdatedChannels.isEmpty()) {
            logger.info("No outdated channels found in TB_YT_CHANNEL to refresh.");
            return;
        }

        logger.info("Found {} outdated channels to refresh using admin ID: {}", outdatedChannels.size(), adminGoogleId);
        
        DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
        LocalDate analyticsEndDate = LocalDate.now().minusDays(1);
        LocalDate analyticsStartDate = analyticsEndDate.minus(Period.ofDays(29));

        LocalDateTime collectionDateForDashboard = LocalDate.now().minusDays(1).atStartOfDay();
        
        for (YouTubeChannel channel : outdatedChannels) {
            String channelId = channel.getChannelId();
            
            try {
                logger.info("Refreshing channel info for ID: {} (last updated: {})", channelId, channel.getUpdatedAt());
                channelService.getChannelInfoById(adminGoogleId, channelId);
                
                Optional<User> user = userService.findUserByChannelId(channelId);
                if (user.isEmpty()) {
                    logger.warn("No user found for channel ID: {}. Skipping dashboard stats collection for this channel.", channelId);
                    continue;
                }
                User channelUser = user.get();
                String googleId = channelUser.getGoogleId();
                
                // 채널 대시보드 통계 수집 (TB_CHANNEL_DASHBOARD_STATS)
                logger.info("Collecting dashboard stats for channel: {}", channelId);

                ChannelDashboardStatsId dashboardStatsId = new ChannelDashboardStatsId(channelId, collectionDateForDashboard);
                Optional<ChannelDashboardStat> existingDashboardStat = channelDashboardStatRepository.findById(dashboardStatsId);
                if(existingDashboardStat.isPresent()) {
                	continue;
                }
                ChannelDashboardStat dashboardStatToSave = existingDashboardStat.orElseGet(ChannelDashboardStat::new);
                dashboardStatToSave.setId(dashboardStatsId);

                // 1. 성별 분포 (Gender Distribution)
                QueryResponse genderAgeResponse = youtubeAnalyticsService.getChannelAudienceAnalytics(googleId, analyticsStartDate.format(formatter), analyticsEndDate.format(formatter), channelId);
                if (genderAgeResponse != null && genderAgeResponse.getRows() != null && !genderAgeResponse.getRows().isEmpty()) {
                    // 성별 데이터를 Map에 집계 (gender, views)
                    Map<String, Long> genderViews = new HashMap<>();
                    long totalViewsForGender = 0;
                    for (List<Object> row : genderAgeResponse.getRows()) {
                        String gender = (String) row.get(0); // gender
                        Long views = ((BigDecimal) row.get(2)).longValue(); // views (or viewerPercentage for gender,ageGroup)
                        genderViews.merge(gender, views, Long::sum);
                        totalViewsForGender += views;
                    }
                    List<Map<String, Object>> genderList = new ArrayList<>();
                    for (Map.Entry<String, Long> entry : genderViews.entrySet()) {
                        double percentage = (totalViewsForGender > 0) ? (double) entry.getValue() / totalViewsForGender * 100 : 0.0;
                        Map<String, Object> genderData = new HashMap<>();
                        genderData.put("gender", entry.getKey());
                        genderData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                        genderList.add(genderData);
                    }
                    dashboardStatToSave.setGenderDistributionJson(objectMapper.writeValueAsString(genderList));
                } else {
                    logger.warn("No gender data found for channel {}", channelId);
                    dashboardStatToSave.setGenderDistributionJson("[]");
                }

                // 2. 연령대 분포 (Age Group Distribution)
                if (genderAgeResponse != null && genderAgeResponse.getRows() != null && !genderAgeResponse.getRows().isEmpty()) {
                    Map<String, Long> ageGroupViews = new HashMap<>();
                    long totalViewsForAgeGroup = 0;
                    for (List<Object> row : genderAgeResponse.getRows()) {
                        String ageGroup = (String) row.get(1); // ageGroup
                        Long views = ((BigDecimal) row.get(2)).longValue(); // views
                        ageGroupViews.merge(ageGroup, views, Long::sum);
                        totalViewsForAgeGroup += views;
                    }
                    List<Map<String, Object>> ageGroupList = new ArrayList<>();
                    for (Map.Entry<String, Long> entry : ageGroupViews.entrySet()) {
                        // AgeGroup ENUM 변환 로직 (DB 저장 시 VARCHAR로 처리되므로 유연하게)
                        String formattedAgeGroup = entry.getKey(); // "age13-17" -> "13-17" 등으로 변환
                        if (formattedAgeGroup.startsWith("age")) {
                            formattedAgeGroup = formattedAgeGroup.substring(3);
                        }
                        if (formattedAgeGroup.endsWith("_")) {
                            formattedAgeGroup = formattedAgeGroup.replace("_", "+");
                        }
                        double percentage = (totalViewsForAgeGroup > 0) ? (double) entry.getValue() / totalViewsForAgeGroup * 100 : 0.0;
                        Map<String, Object> ageGroupData = new HashMap<>();
                        ageGroupData.put("ageGroup", formattedAgeGroup);
                        ageGroupData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                        ageGroupList.add(ageGroupData);
                    }
                    dashboardStatToSave.setAgeGroupDistributionJson(objectMapper.writeValueAsString(ageGroupList));
                } else {
                    logger.warn("No age group data found for channel {}", channelId);
                    dashboardStatToSave.setAgeGroupDistributionJson("[]");
                }

                // 3. 국가별 시청자 (Country Distribution) - viewsCount를 받고 퍼센트 계산
                QueryResponse countryResponse = youtubeAnalyticsService.getChannelCountryAnalytics(googleId, analyticsStartDate.format(formatter), analyticsEndDate.format(formatter), channelId);
                if (countryResponse != null && countryResponse.getRows() != null && !countryResponse.getRows().isEmpty()) {
                    long totalViewsForCountry = countryResponse.getRows().stream()
                                                                .mapToLong(row -> ((BigDecimal) row.get(1)).longValue())
                                                                .sum();
                    List<Map<String, Object>> countryList = new ArrayList<>();
                    for (List<Object> row : countryResponse.getRows()) {
                        String countryCode = (String) row.get(0);
                        Long viewsCount = ((BigDecimal) row.get(1)).longValue();
                        double percentage = (totalViewsForCountry > 0) ? (double) viewsCount / totalViewsForCountry * 100 : 0.0;
                        Map<String, Object> countryData = new HashMap<>();
                        countryData.put("country", countryCode); // ISO 코드 (KR, US 등)
                        countryData.put("viewsCount", viewsCount);
                        countryData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                        countryList.add(countryData);
                    }
                    dashboardStatToSave.setCountryDistributionJson(objectMapper.writeValueAsString(countryList));
                } else {
                    logger.warn("No country data found for channel {}", channelId);
                    dashboardStatToSave.setCountryDistributionJson("[]");
                }

                // 4. 주요 트래픽 소스 (Traffic Source Distribution)
                QueryResponse trafficSourceResponse = youtubeAnalyticsService.getChannelTrafficSourceAnalytics(googleId, analyticsStartDate.format(formatter), analyticsEndDate.format(formatter), channelId);
                if (trafficSourceResponse != null && trafficSourceResponse.getRows() != null && !trafficSourceResponse.getRows().isEmpty()) {
                    long totalViewsForTraffic = trafficSourceResponse.getRows().stream()
                                                                    .mapToLong(row -> ((BigDecimal) row.get(1)).longValue())
                                                                    .sum();
                    List<Map<String, Object>> trafficList = new ArrayList<>();
                    for (List<Object> row : trafficSourceResponse.getRows()) {
                        String sourceType = (String) row.get(0);
                        Long views = ((BigDecimal) row.get(1)).longValue();
                        double percentage = (totalViewsForTraffic > 0) ? (double) views / totalViewsForTraffic * 100 : 0.0;
                        Map<String, Object> trafficData = new HashMap<>();
                        trafficData.put("sourceType", sourceType);
                        trafficData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                        trafficList.add(trafficData);
                    }
                    dashboardStatToSave.setTrafficSourceDistributionJson(objectMapper.writeValueAsString(trafficList));
                } else {
                    logger.warn("No traffic source data found for channel {}", channelId);
                    dashboardStatToSave.setTrafficSourceDistributionJson("[]");
                }
                
             // --- 5. 기기 유형별 시청 비율 (Device Distribution) ---
                QueryResponse deviceResponse = youtubeAnalyticsService.getChannelDeviceAnalytics(googleId, analyticsStartDate.format(formatter), analyticsEndDate.format(formatter), channelId);
                if (deviceResponse != null && deviceResponse.getRows() != null && !deviceResponse.getRows().isEmpty()) {
                    long totalViewsForDevice = deviceResponse.getRows().stream()
                                                            .mapToLong(row -> ((BigDecimal) row.get(1)).longValue())
                                                            .sum();
                    List<Map<String, Object>> deviceList = new ArrayList<>();
                    for (List<Object> row : deviceResponse.getRows()) {
                        String deviceTypeStr = (String) row.get(0); // 예: "COMPUTER", "MOBILE"
                        Long views = ((BigDecimal) row.get(1)).longValue();
                        double percentage = (totalViewsForDevice > 0) ? (double) views / totalViewsForDevice * 100 : 0.0;
                        Map<String, Object> deviceData = new HashMap<>();
                        deviceData.put("deviceType", deviceTypeStr);
                        deviceData.put("viewsCount", views); // 조회수도 함께 저장
                        deviceData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
                        deviceList.add(deviceData);
                    }
                    dashboardStatToSave.setDeviceDistributionJson(objectMapper.writeValueAsString(deviceList));
                } else {
                    logger.warn("No device data found for channel {}", channelId);
                    dashboardStatToSave.setDeviceDistributionJson("[]");
                }
                
                
                // 최종 ChannelDashboardStat 저장
                channelDashboardStatRepository.save(dashboardStatToSave);
                logger.info("Successfully collected and saved dashboard stats for channel: {}", channelId);

            } catch (TokenResponseException e) {
            } catch (IOException | GeneralSecurityException e) {
                logger.error("Error collecting dashboard stats for channel {}: {}", channelId, e.getMessage(), e);
            } catch (Exception e) {
                logger.error("Unexpected error during dashboard stats collection for channel {}: {}", channelId, e.getMessage(), e);
            }
        }
        logger.info("Finished refreshing outdated channel info and collecting dashboard stats.");
    }
	
	@Transactional
    private void processAndSaveVideoData(String googleId, List<String> videoIds, YouTube youTube, String statsDate) throws IOException, GeneralSecurityException {
        if (videoIds == null || videoIds.isEmpty()) {
            return;
        }

        YouTube.Videos.List videoDetailsRequest = youTube.videos().list(Arrays.asList("snippet", "statistics", "contentDetails", "status"));
        videoDetailsRequest.setId(videoIds);
        VideoListResponse videoDetailsResponse = videoDetailsRequest.execute();

        if (videoDetailsResponse != null && videoDetailsResponse.getItems() != null && !videoDetailsResponse.getItems().isEmpty()) {
            for (Video video : videoDetailsResponse.getItems()) {
                YouTubeVideo youTubeVideoToSave = youTubeVideoRepository.findByVideoKey(video.getId())
                                                                     .orElseGet(YouTubeVideo::new);
                youTubeVideoToSave.setVideoKey(video.getId());
                youTubeVideoToSave.setChannelId(video.getSnippet().getChannelId());
                youTubeVideoToSave.setVideoTitle(video.getSnippet().getTitle());
                youTubeVideoToSave.setVideoDescription(video.getSnippet().getDescription());
                youTubeVideoToSave.setThumbnailUrl(video.getSnippet().getThumbnails().getDefault().getUrl());
                
                if (video.getSnippet().getPublishedAt() != null) {
                    youTubeVideoToSave.setUploadedAt(LocalDateTime.parse(video.getSnippet().getPublishedAt().toStringRfc3339().substring(0, 19)));
                }

                if (video.getSnippet().getCategoryId() != null) {
                    youTubeVideoToSave.setVideoCategory(video.getSnippet().getCategoryId());
                }
                if (video.getSnippet().getDefaultAudioLanguage() != null) {
                    youTubeVideoToSave.setVideoLanguage(video.getSnippet().getDefaultAudioLanguage());
                } else if (video.getSnippet().getDefaultLanguage() != null) {
                    youTubeVideoToSave.setVideoLanguage(video.getSnippet().getDefaultLanguage());
                }
                if (video.getStatus() != null && video.getStatus().getPrivacyStatus() != null) {
                    youTubeVideoToSave.setPublicYn(video.getStatus().getPrivacyStatus().equals("public") ? "Y" : "N");
                    logger.info("privacyStatus: {}" + video.getStatus().getPrivacyStatus());
                } else {
                	logger.warn("Video ID: {} has null status or privacyStatus. Setting publicYn to 'N'.", video.getId());
                    youTubeVideoToSave.setPublicYn("N");
                }
                if (video.getContentDetails() != null && video.getContentDetails().getDuration() != null) {
                    youTubeVideoToSave.setVideoPlaytime(parseYouTubeDuration(video.getContentDetails().getDuration()));
                } else {
                    youTubeVideoToSave.setVideoPlaytime(0);
                }
                
                youTubeVideoRepository.save(youTubeVideoToSave);

                // TB_VIDEO_STATS (VideoStat 엔티티) 저장
                if (video.getStatistics() != null) {
                    LocalDateTime statsDateTime = LocalDate.parse(statsDate, DateTimeFormatter.ofPattern("yyyy-MM-dd")).atStartOfDay();
                    VideoStatsId videoStatsId = new VideoStatsId(youTubeVideoToSave.getVideoId(), statsDateTime); 
                    Optional<VideoStat> existingStat = videoStatRepository.findById(videoStatsId);
                    VideoStat videoStat = existingStat.orElseGet(VideoStat::new);
                    
                    videoStat.setId(videoStatsId);
                    videoStat.setViewCount(video.getStatistics().getViewCount().longValue());
                    videoStat.setLikeCount(video.getStatistics().getLikeCount() != null ? video.getStatistics().getLikeCount().intValue() : null);
                    videoStat.setCommentCount(video.getStatistics().getCommentCount() != null ? video.getStatistics().getCommentCount().intValue() : null);
                    
                    try {
                        videoStatRepository.save(videoStat);
                        logger.info("Saved/Updated VideoStat for video {} on {}. Values: ViewCount={}, LikeCount={}, CommentCount={}",
                                youTubeVideoToSave.getVideoKey(), statsDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")),
                                videoStat.getViewCount(), videoStat.getLikeCount(), videoStat.getCommentCount());
                    } catch (Exception dbSaveEx) {
//                        logger.error("Error saving VideoStat for video {} on {}: {}", youTubeVideoKey, statsDateTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd")), dbSaveEx.getMessage(), dbSaveEx);
                    }
                }	
            }
        }
    }
}
