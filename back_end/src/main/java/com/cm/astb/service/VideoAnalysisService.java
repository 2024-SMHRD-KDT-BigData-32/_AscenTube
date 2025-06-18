package com.cm.astb.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
}
