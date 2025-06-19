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
import java.util.Comparator;
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
    private final ObjectMapper objectMapper;
    
    @Value("${youtube.data-collection.admin-user-id}")
    private String adminGoogleId;

    @Value("${youtube.data-collection.channel-update-days}")
    private int channelUpdateDays;
	
	public DataCollectorService(OAuthService oAuthService, UserService userService, ChannelService channelService,
			YoutubeAnalyticsService youtubeAnalyticsService, YouTubeChannelRepository youTubeChannelRepository,
			YouTubeVideoRepository youTubeVideoRepository, VideoStatRepository videoStatRepository,
			ChannelStatRepository channelStatRepository, AudienceStatRepository audienceStatRepository,
			InflowRouteRepository inflowRouteRepository, DeviceAnalysisRepository deviceAnalysisRepository,
			CommentRepository commentRepository, InsightRepository insightRepository,
			ChannelDashboardStatRepository channelDashboardStatRepository, ObjectMapper objectMapper) {
		this.oAuthService = oAuthService;
		this.userService = userService;
		this.channelService = channelService;
		this.youtubeAnalyticsService = youtubeAnalyticsService;
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
		this.objectMapper = objectMapper;
	}

	/**
	 * Store all of user's channel, once in a day.
	 * initialDelay = 10000ms (Scheduling starts in 10 seconds after application starting)
     * fixedRate = 24 * 60 * 60 * 1000ms (schedule again in 24hrs)
	 */
	@Scheduled(initialDelay = 5000, fixedRate = 24 * 60 * 60 * 1000)
	@Transactional
	public void collectDailyChannelAndVideoStats() {
		logger.info("Starting daily data collection for YouTube Analytics");
		
		List<User> users = userService.findAllUsers();
		
		if (users.isEmpty()) {
			logger.warn("No users found in DB. Skipping data collection.");
			return;
		}
		
		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
		LocalDate today = LocalDate.now();
		LocalDate analyticsDataEndDate = today.minusDays(1);
		
        for (User user : users) {
            String googleId = user.getGoogleId();
            String channelId = user.getMyChannelId();

            if (channelId == null || channelId.isEmpty()) {
                logger.warn("User {} has no linked YouTube channel ID. Skipping data collection for this user.", googleId);
                continue;
            }

            try {
                logger.info("Ensuring TB_YT_CHANNEL entry for channel: {}", channelId);
                ChannelListResponse currentChannelInfoResponse = channelService.getChannelInfoById(googleId, channelId);
                
                if (currentChannelInfoResponse == null || currentChannelInfoResponse.getItems() == null || currentChannelInfoResponse.getItems().isEmpty()) {
                    logger.warn("Could not retrieve current channel info from API/Cache for channel {}. Skipping daily stats collection for this channel.", channelId);
                    continue;
                }
                Channel currentChannel = currentChannelInfoResponse.getItems().get(0);

                for (LocalDate currentDate = today.minusDays(29); !currentDate.isAfter(analyticsDataEndDate); currentDate = currentDate.plusDays(1)) {
                    String dateStr = currentDate.format(formatter);
                    LocalDateTime statsDateTime = currentDate.atStartOfDay();

                    ChannelStatsId channelStatsId = new ChannelStatsId(channelId, statsDateTime);
                    Optional<ChannelStat> existingStat = channelStatRepository.findById(channelStatsId);

                    if (existingStat.isPresent()) {
                        logger.info("Channel stats already exist for channel {} on {}. Skipping API call for this date.", channelId, dateStr);
                        continue; 
                    }
                    
                    logger.info("Collecting daily channel stats for user: {}, channel: {} on date: {}", googleId, channelId, dateStr);
                    QueryResponse channelStatsResponse = youtubeAnalyticsService.getChannelBasicAnalytics(googleId, dateStr, dateStr, channelId);
                    
                    if (channelStatsResponse == null || channelStatsResponse.getRows() == null || channelStatsResponse.getRows().isEmpty()) {
                        logger.warn("No rows found in channelStatsResponse for channel {} on {}. Skipping saving for this date.", channelId, dateStr);
                        logger.debug("channelStatsResponse Full Content for {}: {}", dateStr, channelStatsResponse != null ? channelStatsResponse.toPrettyString() : "NULL");
                        continue;
                    }

                    List<List<Object>> rows = channelStatsResponse.getRows();
                    List<Object> row = rows.get(0);

                    Long views = ((BigDecimal) row.get(1)).longValue(); 
                    Long estimatedMinutesWatched = ((BigDecimal) row.get(2)).longValue();
                    Long subscribersGained = ((BigDecimal) row.get(3)).longValue();
                    Long averageViewDuration = ((BigDecimal) row.get(4)).longValue();

                    ChannelStat channelStat = new ChannelStat();
                    channelStat.setId(channelStatsId);
                    channelStat.setSubscriberGained(subscribersGained.intValue()); 
                    channelStat.setDailyViewsCnt(views);
                    channelStat.setEstimatedMinWatched(estimatedMinutesWatched);
                    channelStat.setAvgViewDuration(averageViewDuration);
                    
                    if (currentChannel.getStatistics() != null) {
                        channelStat.setSubscriberCnt(currentChannel.getStatistics().getSubscriberCount().longValue());
                        channelStat.setTotalViewsCnt(currentChannel.getStatistics().getViewCount().longValue());
                        channelStat.setVideosCnt(currentChannel.getStatistics().getVideoCount().longValue());

                    } else {
                        logger.warn("No statistics found for channel {} from Data API. Setting total counts to 0.", channelId);
                        channelStat.setSubscriberCnt(0L);
                        channelStat.setTotalViewsCnt(0L);
                        channelStat.setVideosCnt(0L);
                    }
                    
                    try {
                        channelStatRepository.save(channelStat);
                        logger.info("Saved daily channel stats for {}: SubscribersGained={}, DailyViews={}, EstimatedMinWatched={}, AvgViewDuration={}", dateStr, subscribersGained, views, estimatedMinutesWatched, averageViewDuration);
                    } catch (Exception dbSaveEx) {
                        logger.error("Error saving daily channel stats for {}: {}", dateStr, dbSaveEx.getMessage(), dbSaveEx);
                    }
                }
                
				logger.info("Collecting video metadata and stats for user: {}, channel: {}", googleId, channelId);

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

				YouTube youTube = oAuthService.getYouTubeService(credential);
				
				if (uploadsPlaylistId != null) {
					youTube = oAuthService.getYouTubeService(credential);
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
							List<String> videoIds = playlistResponse.getItems().stream()
									.map(item -> item.getContentDetails().getVideoId()).collect(Collectors.toList());
							processAndSaveVideoData(googleId, videoIds, youTube,
									LocalDate.now().minusDays(1).format(formatter));
						}
						nextPageToken = playlistResponse.getNextPageToken();
					} while (nextPageToken != null);
				} else {
					logger.warn("Uploads playlist ID not found for channel {}. Skipping video data collection.",
							channelId);
				}
				
				 logger.info("Collecting detailed Analytics stats (Audience, Inflow, Device) for user: {}, channel: {}", googleId, channelId);
				 List<YouTubeVideo> allChannelVideos = youTubeVideoRepository.findByChannelId(channelId);
				 for (YouTubeVideo youTubeVideo : allChannelVideos) {
					Long videoId = youTubeVideo.getVideoId();
					String youTubeVideoKey = youTubeVideo.getVideoKey();
					LocalDate videoUploadedDate = youTubeVideo.getUploadedAt().toLocalDate();
					
					if (videoUploadedDate.isAfter(analyticsDataEndDate)) {
	                    logger.info("Video {} uploaded date {} is after current analytics end date {}. Skipping detailed video stats collection.",
	                                youTubeVideoKey, videoUploadedDate, analyticsDataEndDate);
	                    continue;
	                }
					
					VideoStatsId videoStatsId = new VideoStatsId(videoId, analyticsDataEndDate.atStartOfDay());
					Optional<VideoStat> existingVideoStat = videoStatRepository.findById(videoStatsId);

					VideoStat videoStatToSave = existingVideoStat.orElseGet(() -> {
						VideoStat newStat = new VideoStat();
						newStat.setId(videoStatsId);
						return newStat;
					});
					
					try {
	                    YouTube.Videos.List videoDetailsRequest = youTube.videos().list(Arrays.asList("statistics"));
	                    videoDetailsRequest.setId(Collections.singletonList(youTubeVideoKey));
	                    VideoListResponse videoDetailsResponse = videoDetailsRequest.execute();

	                    if (videoDetailsResponse != null && videoDetailsResponse.getItems() != null && !videoDetailsResponse.getItems().isEmpty()) {
	                        Video video = videoDetailsResponse.getItems().get(0);
	                        if (video.getStatistics() != null) {
	                            videoStatToSave.setViewCount(video.getStatistics().getViewCount().longValue());
	                            videoStatToSave.setLikeCount(video.getStatistics().getLikeCount() != null ? video.getStatistics().getLikeCount().intValue() : 0);
	                            videoStatToSave.setCommentCount(video.getStatistics().getCommentCount() != null ? video.getStatistics().getCommentCount().intValue() : 0);
	                            logger.info("Retrieved Data API Stats for video {} (Current): ViewCount={}, LikeCount={}, CommentCount={}",
	                                        youTubeVideoKey, videoStatToSave.getViewCount(), videoStatToSave.getLikeCount(), videoStatToSave.getCommentCount());
	                        } else {
	                            logger.warn("No statistics found from Data API for video {}. Setting counts to 0.", youTubeVideoKey);
	                            videoStatToSave.setViewCount(0L);
	                            videoStatToSave.setLikeCount(0);
	                            videoStatToSave.setCommentCount(0);
	                        }
	                    } else {
	                        logger.warn("Video details not found from Data API for video {}. Skipping setting current stats.", youTubeVideoKey);
	                        if (!existingVideoStat.isPresent()) {
	                            videoStatToSave.setViewCount(0L);
	                            videoStatToSave.setLikeCount(0);
	                            videoStatToSave.setCommentCount(0);
	                        }
	                    }
	                } catch (IOException e) {
	                    logger.error("Error fetching current video statistics from Data API for video {}: {}", youTubeVideoKey, e.getMessage());
	                    if (!existingVideoStat.isPresent()) {
	                        videoStatToSave.setViewCount(0L);
	                        videoStatToSave.setLikeCount(0);
	                        videoStatToSave.setCommentCount(0);
	                    }
	                }
					
					try {
	                    String metricsForCumulative = "subscribersGained,averageViewDuration";
	                    QueryResponse videoAnalyticsCumulativeResponse = youtubeAnalyticsService.getVideoAnalyticsCumulativeMetrics(
	                            googleId, videoUploadedDate.format(formatter), analyticsDataEndDate.format(formatter), youTubeVideoKey, metricsForCumulative);

	                    if (videoAnalyticsCumulativeResponse != null && videoAnalyticsCumulativeResponse.getRows() != null && !videoAnalyticsCumulativeResponse.getRows().isEmpty()) {
	                        List<Object> analyticRow = videoAnalyticsCumulativeResponse.getRows().get(0);
	                        // Assuming order: subscribersGained, averageViewDuration
	                        Long cumulativeSubGained = ((BigDecimal) analyticRow.get(0)).longValue();
	                        Long cumulativeAvgDuration = ((BigDecimal) analyticRow.get(1)).longValue();

	                        videoStatToSave.setAvgWatchTime(cumulativeAvgDuration.intValue());
	                        videoStatToSave.setSubscriberGained(cumulativeSubGained.intValue());

	                        logger.info("Retrieved Cumulative Analytics for video {} (Up to {}): SubGained={}, AvgDuration={}",
	                                youTubeVideoKey, analyticsDataEndDate.format(formatter), cumulativeSubGained, cumulativeAvgDuration);

	                    } else {
	                        logger.warn("No cumulative analytics data found for video {} up to {}. Setting relevant stats to 0.", youTubeVideoKey, analyticsDataEndDate.format(formatter));
	                        videoStatToSave.setAvgWatchTime(0);
	                        videoStatToSave.setSubscriberGained(0);
	                    }
	                } catch (IOException | GeneralSecurityException e) {
	                    logger.error("Error fetching cumulative video analytics for video {} up to {}: {}", youTubeVideoKey, analyticsDataEndDate.format(formatter), e.getMessage());
	                    videoStatToSave.setAvgWatchTime(0);
	                    videoStatToSave.setSubscriberGained(0);
	                }

	                // 최종 VideoStat 객체 저장/업데이트
	                try {
	                    videoStatRepository.save(videoStatToSave);
	                    logger.info("Saved/Updated VideoStat for video {} on {}. Final values: ViewCount={}, LikeCount={}, CommentCount={}, AvgWatchTime={}, SubscriberGained={}",
	                            youTubeVideoKey, today.atStartOfDay().format(formatter), videoStatToSave.getViewCount(), videoStatToSave.getLikeCount(),
	                            videoStatToSave.getCommentCount(), videoStatToSave.getAvgWatchTime(), videoStatToSave.getSubscriberGained());
	                } catch (Exception dbSaveEx) {
	                    logger.error("Error saving/updating VideoStat for video {} on {}: {}", youTubeVideoKey, today.atStartOfDay().format(formatter), dbSaveEx.getMessage(), dbSaveEx);
	                }
					
					collectAudienceStats(googleId, youTubeVideoKey, today.format(formatter), videoId, youTubeVideo.getUploadedAt().toLocalDate());
                    collectInflowRouteStats(googleId, youTubeVideoKey, today.format(formatter), videoId, youTubeVideo.getUploadedAt().toLocalDate());
                    collectDeviceAnalysisStats(googleId, youTubeVideoKey, today.format(formatter), videoId, youTubeVideo.getUploadedAt().toLocalDate());
				}
				 
            } catch (IOException | GeneralSecurityException e) {
                logger.error("Error collecting data for user {}: {}", googleId, e.getMessage(), e);
            } catch (Exception e) {
                logger.error("Unexpected error during data collection for user {}: {}", googleId, e.getMessage(), e);
            }
        }
        logger.info("Daily data collection finished.");
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
	
//	@Scheduled(cron = "0 0 1 * * ?") 
//	@Scheduled(initialDelay = 5000, fixedRate = 24 * 60 * 60 * 1000)
    @Transactional
    public void refreshOutdatedChannelInfo() {
        logger.info("Starting refresh of outdated channel info in TB_YT_CHANNEL...");
        LocalDateTime threshold = LocalDateTime.now().minusDays(channelUpdateDays); // N일 전 시간

        List<YouTubeChannel> outdatedChannels = youTubeChannelRepository.findByUpdatedAtBefore(threshold);
        outdatedChannels.add(youTubeChannelRepository.findById("UCpP6Av1nV0uh2Ys3T7QiXPw").get());

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

                // 5. 주요 시청 시간대 (Watch Time Segment)
//                QueryResponse watchTimeResponse = youtubeAnalyticsService.getChannelWatchTimeAnalytics(googleId, analyticsStartDate.format(formatter), analyticsEndDate.format(formatter), channelId);
//                if (watchTimeResponse != null && watchTimeResponse.getRows() != null && !watchTimeResponse.getRows().isEmpty()) {
//                    // 시간대별 그룹화 로직 (이미지 참고: 오전(10-12), 저녁(18-20), 밤(20-22), 기타)
//                    Map<String, Long> segmentedViews = new HashMap<>();
//                    segmentedViews.put("Morning (10-12)", 0L);
//                    segmentedViews.put("Evening (18-20)", 0L);
//                    segmentedViews.put("Night (20-22)", 0L);
//                    segmentedViews.put("Other Time", 0L); // 기타 시간대
//
//                    long totalViewsForWatchTime = watchTimeResponse.getRows().stream()
//                                                                    .mapToLong(row -> ((BigDecimal) row.get(1)).longValue())
//                                                                    .sum();
//
//                    for (List<Object> row : watchTimeResponse.getRows()) {
//                        Integer hour = ((BigDecimal) row.get(0)).intValue(); // hour (0-23)
//                        Long views = ((BigDecimal) row.get(1)).longValue();
//
//                        if (hour >= 10 && hour < 12) {
//                            segmentedViews.merge("Morning (10-12)", views, Long::sum);
//                        } else if (hour >= 18 && hour < 20) {
//                            segmentedViews.merge("Evening (18-20)", views, Long::sum);
//                        } else if (hour >= 20 && hour < 22) {
//                            segmentedViews.merge("Night (20-22)", views, Long::sum);
//                        } else {
//                            segmentedViews.merge("Other Time", views, Long::sum);
//                        }
//                    }
//
//                    List<Map<String, Object>> watchTimeList = new ArrayList<>();
//                    for (Map.Entry<String, Long> entry : segmentedViews.entrySet()) {
//                        double percentage = (totalViewsForWatchTime > 0) ? (double) entry.getValue() / totalViewsForWatchTime * 100 : 0.0;
//                        Map<String, Object> timeData = new HashMap<>();
//                        timeData.put("segment", entry.getKey());
//                        timeData.put("percentage", BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue());
//                        watchTimeList.add(timeData);
//                    }
//                    // 이미지 순서에 맞춰 정렬 (선택 사항)
//                    watchTimeList.sort(Comparator.comparing(m -> {
//                        String segment = (String) m.get("segment");
//                        switch (segment) {
//                            case "Morning (10-12)": return 1;
//                            case "Evening (18-20)": return 2;
//                            case "Night (20-22)": return 3;
//                            case "Other Time": return 4;
//                            default: return 5;
//                        }
//                    }));
//                    dashboardStatToSave.setWatchTimeSegmentJson(objectMapper.writeValueAsString(watchTimeList));
//                } else {
//                    logger.warn("No watch time data found for channel {}", channelId);
//                    dashboardStatToSave.setWatchTimeSegmentJson("[]");
//                }

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

        YouTube.Videos.List videoDetailsRequest = youTube.videos().list(Arrays.asList("snippet", "statistics", "contentDetails"));
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
//                logger.info("privacyStatus: {}" + video.getStatus().getPrivacyStatus());
                if (video.getStatus() != null && video.getStatus().getPrivacyStatus() != null) {
                    youTubeVideoToSave.setPublicYn(video.getStatus().getPrivacyStatus().equals("public") ? "Y" : "N");
                } else {
                    youTubeVideoToSave.setPublicYn(null);
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
                    videoStat.setLikeCount(video.getStatistics().getLikeCount() != null ? video.getStatistics().getLikeCount().intValue() : 0);
                    videoStat.setCommentCount(video.getStatistics().getCommentCount() != null ? video.getStatistics().getCommentCount().intValue() : 0);
                    
//                    videoStatRepository.save(videoStat);
                }	
            }
        }
    }
}
