package com.cm.astb.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.dto.TopAverageWatchTimeVideoDto;
import com.cm.astb.dto.TopSubscriberContributingVideoDto;
import com.cm.astb.dto.VideoPerformanceDto;
import com.cm.astb.entity.VideoStat;
import com.cm.astb.entity.YouTubeVideo;
import com.cm.astb.repository.VideoStatRepository;
import com.cm.astb.repository.YouTubeVideoRepository;

@Service
public class VideoAnalysisService {
	
    private static final Logger logger = LoggerFactory.getLogger(VideoAnalysisService.class); // 로거 인스턴스 생성
	
	private final YouTubeVideoRepository youTubeVideoRepository;
    private final VideoStatRepository videoStatRepository;
    
	public VideoAnalysisService(YouTubeVideoRepository youTubeVideoRepository,
			VideoStatRepository videoStatRepository) {
		this.youTubeVideoRepository = youTubeVideoRepository;
		this.videoStatRepository = videoStatRepository;
	}
	
	/**
     * 특정 채널의 최신 업로드 영상 성과를 조회합니다.
     * TB_VIDEO_STATS의 STATS_DATE는 스케줄링 시점의 날짜 (today.atStartOfDay())를 기준으로 저장된
     * 최신 종합 통계 스냅샷을 가져옵니다.
     *
     * @param channelId 조회할 유튜브 채널 ID (TB_YT_CHANNEL의 CNL_ID)
     * @return 최신 영상의 성과 정보 리스트
     */
	@Transactional(readOnly = true)
    public List<VideoPerformanceDto> getLatestUploadedVideoPerformance(String channelId, int limit) {
        logger.info("Attempting to get latest uploaded video performance for channelId: {}", channelId);

        List<YouTubeVideo> videos = youTubeVideoRepository.findByChannelIdOrderByUploadedAtDesc(channelId);
        logger.info("Found {} YouTube videos for channelId: {}", videos.size(), channelId);
        if (videos.isEmpty()) {
            logger.warn("No YouTube videos found for channelId: {}. Returning empty list.", channelId);
            return List.of();
        }

        LocalDateTime latestStatsDate = LocalDate.now().minusDays(1).atStartOfDay();
        logger.info("Attempting to retrieve VideoStat data for statsDate: {}", latestStatsDate);


        List<VideoPerformanceDto> performanceList = videos.stream()
        		.filter(video -> "Y".equals(video.getPublicYn()))
                .map(video -> {
                    Optional<VideoStat> latestStatOpt = videoStatRepository.findById_VideoIdAndId_StatsDate(video.getVideoId().intValue(), latestStatsDate);

                    if (latestStatOpt.isPresent()) {
                        VideoStat stat = latestStatOpt.get();
                        logger.debug("Found VideoStat for videoKey: {}, videoId: {} on {}. ViewCount: {}, SubGained: {}",
                                video.getVideoKey(), video.getVideoId(), latestStatsDate, stat.getViewCount(), stat.getSubscriberGained());
                        return VideoPerformanceDto.builder()
                                .videoKey(video.getVideoKey())
                                .videoTitle(video.getVideoTitle())
                                .thumbnailUrl(video.getThumbnailUrl())
                                .viewCount(stat.getViewCount())
                                .avgWatchTime(stat.getAvgWatchTime())
                                .likeCount(stat.getLikeCount())
                                .commentCount(stat.getCommentCount())
                                .subscriberGained(stat.getSubscriberGained())
                                .uploadedAt(video.getUploadedAt())
                                .build();
                    } else {
                        logger.warn("No VideoStat found for videoKey: {}, videoId: {} on statsDate: {}. Skipping this video.",
                                video.getVideoKey(), video.getVideoId(), latestStatsDate);
                        return null; // 통계 데이터가 없으면 null 반환
                    }
                })
                .filter(java.util.Objects::nonNull) // null 값 제거 (통계 데이터가 없는 비디오)
                .limit(limit)
                .collect(Collectors.toList());

        logger.info("Finished collecting latest video performance. Total DTOs created: {}", performanceList.size());
        if (performanceList.isEmpty()) {
             logger.warn("No VideoPerformanceDto objects were created after filtering. Check DataCollectorService for stat saving.");
        }
        return performanceList;
    }
	
	/**
     * 특정 채널에서 구독자 증가 기여가 높은 영상들을 조회합니다.
     * DB 쿼리 단계에서 정렬 및 제한을 적용하여 효율성을 높입니다.
     *
     * @param channelId 조회할 유튜브 채널 ID
     * @param limit     가져올 영상의 최대 개수
     * @return 구독자 증가 기여도 높은 영상 리스트
     */
    @Transactional(readOnly = true)
    public List<TopSubscriberContributingVideoDto> getTopSubscriberContributingVideos(String channelId, int limit) {
        logger.info("Attempting to get {} top subscriber contributing videos for channelId: {}", limit, channelId);

        List<YouTubeVideo> videos = youTubeVideoRepository.findByChannelId(channelId);
        logger.info("Found {} YouTube videos for channelId: {}. Now filtering by VideoStat presence and sorting.", videos.size(), channelId);
        if (videos.isEmpty()) {
            logger.warn("No YouTube videos found for channelId: {}. Returning empty list.", channelId);
            return List.of();
        }

        // 2. 통계 데이터를 가져올 기준 날짜를 설정합니다.
        LocalDateTime latestStatsDate = LocalDate.now().minusDays(1).atStartOfDay();
        logger.info("Attempting to retrieve VideoStat data for statsDate: {}", latestStatsDate);

        // 3. 각 비디오에 대해 최신 통계를 찾아 DTO로 매핑하고, 필터링, 정렬, 제한을 적용합니다.
        List<TopSubscriberContributingVideoDto> topVideos = videos.stream()
        		.filter(video -> "Y".equals(video.getPublicYn()))
                .map(video -> {
                    Optional<VideoStat> latestStatOpt = videoStatRepository.findById_VideoIdAndId_StatsDate(video.getVideoId().intValue(), latestStatsDate);
                    
                    if (latestStatOpt.isPresent()) {
                         VideoStat stat = latestStatOpt.get();
                         logger.debug("Found VideoStat for top contributing video: videoKey={}, subscriberGained={}, viewCount={}",
                                video.getVideoKey(), stat.getSubscriberGained(), stat.getViewCount());
                         return TopSubscriberContributingVideoDto.builder()
                                .videoKey(video.getVideoKey())
                                .videoTitle(video.getVideoTitle())
                                .thumbnailUrl(video.getThumbnailUrl())
                                .subscriberGained(stat.getSubscriberGained())
                                .viewCount(stat.getViewCount())
                                .uploadedAt(video.getUploadedAt())
                                .build();
                    } else {
                        logger.warn("No VideoStat found for videoKey: {}, videoId: {} on statsDate: {}. Skipping this video for top contribution analysis.",
                                video.getVideoKey(), video.getVideoId(), latestStatsDate);
                        return null; // 통계 데이터가 없으면 null 반환
                    }
                })
                .filter(java.util.Objects::nonNull) // null 값 (VideoStat 없는 비디오) 제거
                .filter(dto -> dto.getSubscriberGained() != null && dto.getSubscriberGained() > 0)
                .sorted(Comparator.comparing(TopSubscriberContributingVideoDto::getSubscriberGained, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .collect(Collectors.toList());

        logger.info("Finished collecting top subscriber contributing videos. Total DTOs created: {}", topVideos.size());
        if (topVideos.isEmpty()) {
             logger.warn("No TopSubscriberContributingVideoDto objects were created after filtering. Please ensure DataCollectorService has successfully saved VideoStat for channel {} on {}.", channelId, latestStatsDate);
        }
        return topVideos;
    }
    
    /**
     * 특정 채널에서 평균 시청 지속 시간이 높은 영상들을 조회합니다.
     * 모든 비디오 메타데이터를 가져온 후, 최신 통계가 있는 영상들 중 평균 시청 지속 시간으로 정렬하여 반환합니다.
     *
     * @param channelId 조회할 유튜브 채널 ID
     * @param limit     가져올 영상의 최대 개수
     * @return 평균 시청 지속 시간 높은 영상 리스트
     */
    @Transactional(readOnly = true)
    public List<TopAverageWatchTimeVideoDto> getTopAverageWatchTimeVideos(String channelId, int limit) {
        logger.info("Attempting to get {} top average watch time videos for channelId: {}", limit, channelId);

        List<YouTubeVideo> videos = youTubeVideoRepository.findByChannelId(channelId);
        logger.info("Found {} YouTube videos for channelId: {}. Now filtering by VideoStat presence and sorting.", videos.size(), channelId);
        if (videos.isEmpty()) {
            logger.warn("No YouTube videos found for channelId: {}. Returning empty list.", channelId);
            return List.of();
        }

        LocalDateTime latestStatsDate = LocalDate.now().minusDays(1).atStartOfDay();
        logger.info("Attempting to retrieve VideoStat data for statsDate: {}", latestStatsDate);

        List<TopAverageWatchTimeVideoDto> topVideos = videos.stream()
                .map(video -> {
                    Optional<VideoStat> latestStatOpt = videoStatRepository.findById_VideoIdAndId_StatsDate(video.getVideoId().intValue(), latestStatsDate);

                    if (latestStatOpt.isPresent()) {
                         VideoStat stat = latestStatOpt.get();
                         logger.debug("Found VideoStat for top average watch time video: videoKey={}, avgWatchTime={}, viewCount={}",
                                video.getVideoKey(), stat.getAvgWatchTime(), stat.getViewCount());
                         return TopAverageWatchTimeVideoDto.builder()
                                .videoKey(video.getVideoKey())
                                .videoTitle(video.getVideoTitle())
                                .thumbnailUrl(video.getThumbnailUrl())
                                .avgWatchTime(stat.getAvgWatchTime())
                                .viewCount(stat.getViewCount())
                                .uploadedAt(video.getUploadedAt())
                                .videoPlaytime(video.getVideoPlaytime())
                                .build();
                    } else {
                        logger.warn("No VideoStat found for videoKey: {}, videoId: {} on statsDate: {}. Skipping this video for top average watch time analysis.",
                                video.getVideoKey(), video.getVideoId(), latestStatsDate);
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull) // null 값 (VideoStat 없는 비디오) 제거
                .sorted(Comparator.comparing(TopAverageWatchTimeVideoDto::getAvgWatchTime, Comparator.nullsLast(Comparator.reverseOrder())))
                .limit(limit)
                .collect(Collectors.toList());

        logger.info("Finished collecting top average watch time videos. Total DTOs created: {}", topVideos.size());
        if (topVideos.isEmpty()) {
             logger.warn("No TopAverageWatchTimeVideoDto objects were created after filtering. Please ensure DataCollectorService has successfully saved VideoStat for channel {} on {}.", channelId, latestStatsDate);
        }
        return topVideos;
    }
}
