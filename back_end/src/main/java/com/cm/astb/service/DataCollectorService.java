package com.cm.astb.service;

import java.math.BigInteger;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.entity.ChannelStat;
import com.cm.astb.entity.ChannelStatsId;
import com.cm.astb.entity.User;
import com.cm.astb.repository.AudienceStatRepository;
import com.cm.astb.repository.ChannelStatRepository;
import com.cm.astb.repository.CommentRepository;
import com.cm.astb.repository.DeviceAnalysisRepository;
import com.cm.astb.repository.InflowRouteRepository;
import com.cm.astb.repository.InsightRepository;
import com.cm.astb.repository.VideoStatRepository;
import com.cm.astb.repository.YouTubeChannelRepository;
import com.cm.astb.repository.YouTubeVideoRepository;
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
		String today = LocalDate.now().format(formatter);
		String yesterday = LocalDate.now().minusDays(1).format(formatter);	// Store yesterday data because of stability of data.
		
		for (User user : users) {
			String googleId = user.getGoogleId();
			String channelId = user.getMyChannelId();

			if (channelId == null || channelId.isEmpty()) {
				logger.warn("User {} has no linked YouTube channel ID. Skipping data collection for this user.",
						googleId);
				continue;
			}

			try {
				logger.info("Collecting daily channel stats for user: {}, channel: {}", googleId, channelId);
				
				QueryResponse channelStatsResponse = youtubeAnalyticsService.getChannelBasicAnalytics(googleId,
						yesterday, yesterday, channelId);
				
				if (channelStatsResponse != null && channelStatsResponse.getRows() != null
						&& !channelStatsResponse.getRows().isEmpty()) {
					List<List<Object>> rows = channelStatsResponse.getRows();

					for (List<Object> row : rows) {
						String dateStr = (String) row.get(0); // (yyyy-MM-dd)
						Long views = ((BigInteger) row.get(1)).longValue();
						Long estimatedMinutesWatched = ((BigInteger) row.get(2)).longValue();
						Long subscribersGained = ((BigInteger) row.get(3)).longValue();
						Double averageViewDuration = (Double) row.get(4);
						
						LocalDateTime statsDateTime = LocalDate.parse(dateStr, formatter).atStartOfDay();
						
						ChannelStatsId channelStatsId = new ChannelStatsId(channelId, statsDateTime);
						Optional<ChannelStat> existingStat = channelStatRepository.findById(channelStatsId);
						ChannelStat channelStat = existingStat.orElseGet(ChannelStat::new);
						
						channelStat.setId(channelStatsId);
						channelStat.setDailyViewsCnt(views);
						channelStat.setSubscriberGained(subscribersGained.intValue());
						channelStat.setEstimatedMinWatched(estimatedMinutesWatched);
						channelStat.setAvgViewDuration(averageViewDuration.longValue());
						
						channelStatRepository.save(channelStat);
                        logger.info("Saved daily channel stats for {}: SubscribersGained={}, DailyViews={}, EstimatedMinWatched={}, AvgViewDuration={}", dateStr, subscribersGained, views, estimatedMinutesWatched, averageViewDuration);
                        
					}

				}
				// TODO : videos_cnt는 Analytics API에서 일별로 얻기 어렵기 때문에 추후에 추가.
				
			} catch (Exception e) {

			}
		}
	}
    
}
