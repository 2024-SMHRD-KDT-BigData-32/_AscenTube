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
import java.util.Arrays;
import java.util.List;
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
import com.cm.astb.repository.ChannelStatRepository;
import com.cm.astb.repository.CommentRepository;
import com.cm.astb.repository.DeviceAnalysisRepository;
import com.cm.astb.repository.InflowRouteRepository;
import com.cm.astb.repository.InsightRepository;
import com.cm.astb.repository.VideoStatRepository;
import com.cm.astb.repository.YouTubeChannelRepository;
import com.cm.astb.repository.YouTubeVideoRepository;
import com.google.api.client.auth.oauth2.Credential;
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
    
    @Value("${youtube.data-collection.admin-user-id}")
    private String adminGoogleId;

    @Value("${youtube.data-collection.channel-update-days}")
    private int channelUpdateDays;
    
	public DataCollectorService(OAuthService oAuthService, UserService userService, ChannelService channelService,
			YoutubeAnalyticsService youtubeAnalyticsService, YouTubeChannelRepository youTubeChannelRepository,
			YouTubeVideoRepository youTubeVideoRepository, VideoStatRepository videoStatRepository,
			ChannelStatRepository channelStatRepository, AudienceStatRepository audienceStatRepository,
			InflowRouteRepository inflowRouteRepository, DeviceAnalysisRepository deviceAnalysisRepository,
			CommentRepository commentRepository, InsightRepository insightRepository) {
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
	}
    
	
	/**
	 * Store all of user's channel, once in a day.
	 * initialDelay = 10000ms (Scheduling starts in 10 seconds after application starting)
     * fixedRate = 24 * 60 * 60 * 1000ms (schedule again in 24hrs)
	 */
	@Scheduled(initialDelay = 10000, fixedRate = 24 * 60 * 60 * 1000)
	@Transactional
	public void collectDailyChannelAndVideoStats() {
		logger.info("Starting daily data collection for YouTube Analytics");
		
		List<User> users = userService.findAllUsers();
		
		if (users.isEmpty()) {
			logger.warn("No users found in DB. Skipping data collection.");
			return;
		}
		
		DateTimeFormatter formatter = DateTimeFormatter.ofPattern("yyyy-MM-dd");
		LocalDate endDate = LocalDate.now().minusDays(3);
        LocalDate startDate = endDate.minus(Period.ofDays(29));
		
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

                for (LocalDate currentDate = startDate; !currentDate.isAfter(endDate); currentDate = currentDate.plusDays(1)) {
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
					LocalDateTime now = LocalDateTime.now();
					
					collectAudienceStats(googleId, youTubeVideoKey, now.format(formatter), videoId, youTubeVideo.getUploadedAt().toLocalDate());
                    collectInflowRouteStats(googleId, youTubeVideoKey, now.format(formatter), videoId);
                    collectDeviceAnalysisStats(googleId, youTubeVideoKey, now.format(formatter), videoId);
				}
				 
				 logger.info("allChannelVideos : {}", allChannelVideos.toString());
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
		LocalDateTime endDate = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).minusDays(3).atStartOfDay();
		
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
	private void collectInflowRouteStats(String googleId, String youTubeVideoKey, String dateStr, Long videoId) throws GeneralSecurityException, IOException {
		logger.info("Collecting Inflow Route Stats for video: {} (YouTube ID: {}) on date: {}", videoId, youTubeVideoKey, dateStr);
		
		LocalDateTime startDate = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).minusDays(30).atStartOfDay();
		LocalDateTime endDate = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).minusDays(3).atStartOfDay();
		
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
	private void collectDeviceAnalysisStats(String googleId, String youTubeVideoKey, String dateStr, Long videoId) throws IOException, GeneralSecurityException {
        logger.info("Collecting Device Analysis Stats for video: {} (YouTube ID: {}) on date: {}", videoId, youTubeVideoKey, dateStr);
        
        LocalDateTime startDate = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).minusDays(30).atStartOfDay();
		LocalDateTime endDate = LocalDate.parse(dateStr, DateTimeFormatter.ofPattern("yyyy-MM-dd")).minusDays(3).atStartOfDay();
		
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
	@Scheduled(initialDelay = 10000, fixedRate = 24 * 60 * 60 * 1000)
    @Transactional
    public void refreshOutdatedChannelInfo() {
        logger.info("Starting refresh of outdated channel info in TB_YT_CHANNEL...");
        LocalDateTime threshold = LocalDateTime.now().minusDays(channelUpdateDays); // N일 전 시간

        List<YouTubeChannel> outdatedChannels = youTubeChannelRepository.findByUpdatedAtBefore(threshold);

        if (outdatedChannels.isEmpty()) {
            logger.info("No outdated channels found in TB_YT_CHANNEL to refresh.");
            return;
        }

        logger.info("Found {} outdated channels to refresh using admin ID: {}", outdatedChannels.size(), adminGoogleId);

        for (YouTubeChannel channel : outdatedChannels) {
            try {
                logger.info("Refreshing channel info for ID: {} (last updated: {})", channel.getChannelId(), channel.getUpdatedAt());
                channelService.getChannelInfoById(adminGoogleId, channel.getChannelId());
            } catch (IOException | GeneralSecurityException e) {
                logger.error("Error refreshing channel info for ID {}: {}", channel.getChannelId(), e.getMessage(), e);
            } catch (Exception e) {
                logger.error("Unexpected error refreshing channel info for ID {}: {}", channel.getChannelId(), e.getMessage(), e);
            }
        }
        logger.info("Finished refreshing outdated channel info.");
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
                if (video.getStatus() != null && video.getStatus().getPrivacyStatus() != null) {
                    youTubeVideoToSave.setPublicYn(video.getStatus().getPrivacyStatus().equals("public") ? "Y" : "N");
                } else {
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
                    videoStat.setLikeCount(video.getStatistics().getLikeCount() != null ? video.getStatistics().getLikeCount().intValue() : 0);
                    videoStat.setCommentCount(video.getStatistics().getCommentCount() != null ? video.getStatistics().getCommentCount().intValue() : 0);
                    
                    videoStatRepository.save(videoStat);
                }
            }
        }
    }
}
