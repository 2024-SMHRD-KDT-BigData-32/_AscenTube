package com.cm.astb.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.dto.ChannelAudienceAgeGroupDto;
import com.cm.astb.dto.ChannelAudienceCountryDto;
import com.cm.astb.dto.ChannelAudienceGenderDto;
import com.cm.astb.dto.ChannelDashboardSummaryDto;
import com.cm.astb.dto.ChannelKeyMetricsDto;
import com.cm.astb.dto.ChannelTrafficSourceDto;
import com.cm.astb.entity.ChannelDashboardStat;
import com.cm.astb.entity.ChannelStat;
import com.cm.astb.entity.YouTubeVideo;
import com.cm.astb.repository.ChannelDashboardStatRepository;
import com.cm.astb.repository.ChannelStatRepository;
import com.cm.astb.repository.YouTubeVideoRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class ChannelAnalysisService {

	private static final Logger logger = LoggerFactory.getLogger(ChannelAnalysisService.class);

	private final ChannelDashboardStatRepository channelDashboardStatRepository;
	private final ChannelStatRepository channelStatRepository;
	private final YouTubeVideoRepository youTubeVideoRepository;
	private final ObjectMapper objectMapper;

	public ChannelAnalysisService(ChannelDashboardStatRepository channelDashboardStatRepository,
			ChannelStatRepository channelStatRepository, YouTubeVideoRepository youTubeVideoRepository,
			ObjectMapper objectMapper) {
		this.channelDashboardStatRepository = channelDashboardStatRepository;
		this.channelStatRepository = channelStatRepository;
		this.youTubeVideoRepository = youTubeVideoRepository;
		this.objectMapper = objectMapper;
	}

	/**
     * 특정 채널의 최신 대시보드 종합 통계 데이터를 조회합니다.
     * COLLECTION_DATE가 오늘 00:00:00인 레코드를 찾습니다.
     *
     * @param channelId 조회할 유튜브 채널 ID
     * @return 채널 대시보드 종합 통계 DTO
     */
    @Transactional(readOnly = true)
    public Optional<ChannelDashboardSummaryDto> getChannelDashboardSummary(String channelId) {
        logger.info("Attempting to get channel dashboard summary for channelId: {}", channelId);

        // 스케줄러가 오늘 00:00:00 기준으로 데이터를 저장하므로, 동일한 날짜로 조회.
        LocalDateTime collectionDate = LocalDate.now().minusDays(1).atStartOfDay();

        Optional<ChannelDashboardStat> dashboardStatOpt =
                channelDashboardStatRepository.findById_ChannelIdAndId_StatsDate(channelId, collectionDate);

        if (dashboardStatOpt.isEmpty()) {
            logger.warn("No dashboard summary data found for channelId: {} on collectionDate: {}. Returning empty.", channelId, collectionDate);
            return Optional.empty();
        }

        ChannelDashboardStat dashboardStat = dashboardStatOpt.get();
        ChannelDashboardSummaryDto.ChannelDashboardSummaryDtoBuilder dtoBuilder = ChannelDashboardSummaryDto.builder();

        try {
            // 성별 분포 역직렬화
            if (dashboardStat.getGenderDistributionJson() != null && !dashboardStat.getGenderDistributionJson().isEmpty()) {
                dtoBuilder.genderRatio(objectMapper.readValue(dashboardStat.getGenderDistributionJson(), new TypeReference<List<ChannelAudienceGenderDto>>() {}));
            } else {
                dtoBuilder.genderRatio(new ArrayList<>());
            }

            // 연령대 분포 역직렬화
            if (dashboardStat.getAgeGroupDistributionJson() != null && !dashboardStat.getAgeGroupDistributionJson().isEmpty()) {
                dtoBuilder.ageGroupDistribution(objectMapper.readValue(dashboardStat.getAgeGroupDistributionJson(), new TypeReference<List<ChannelAudienceAgeGroupDto>>() {}));
            } else {
                dtoBuilder.ageGroupDistribution(new ArrayList<>());
            }

            // 국가별 시청자 역직렬화
            if (dashboardStat.getCountryDistributionJson() != null && !dashboardStat.getCountryDistributionJson().isEmpty()) {
                dtoBuilder.countryViewers(objectMapper.readValue(dashboardStat.getCountryDistributionJson(), new TypeReference<List<ChannelAudienceCountryDto>>() {}));
            } else {
                dtoBuilder.countryViewers(new ArrayList<>());
            }

            // 트래픽 소스 역직렬화
            if (dashboardStat.getTrafficSourceDistributionJson() != null && !dashboardStat.getTrafficSourceDistributionJson().isEmpty()) {
                dtoBuilder.trafficSources(objectMapper.readValue(dashboardStat.getTrafficSourceDistributionJson(), new TypeReference<List<ChannelTrafficSourceDto>>() {}));
            } else {
                dtoBuilder.trafficSources(new ArrayList<>());
            }

            logger.info("Successfully retrieved and mapped dashboard summary for channelId: {}", channelId);
            return Optional.of(dtoBuilder.build());

        } catch (JsonProcessingException e) {
            logger.error("Error deserializing JSON for channelId {}: {}", channelId, e.getMessage(), e);
            return Optional.empty();
        }
    }
    
    /**
     * 특정 채널의 주요 지표 (총 구독자 수, 총 조회수, 평균 시청 지속 시간, 총 영상 수, 평균 업로드 주기)를 조회합니다.
     * 모든 누적 통계는 TB_CHANNEL_STATS에서 가장 최신 날짜의 값을 가져옵니다.
     *
     * @param channelId 조회할 유튜브 채널 ID
     * @return 채널 주요 지표 DTO
     */
    @Transactional(readOnly = true)
    public Optional<ChannelKeyMetricsDto> getChannelKeyMetrics(String channelId) {
        logger.info("Attempting to get key metrics for channelId: {}", channelId);

        Long totalSubscribers = 0L;
        Integer latestSubscriberGained = 0;
        Long totalViews = 0L;
        String averageWatchTime = "N/A";
        Long totalVideos = 0L; // TB_CHANNEL_STATS에서 가져옴

        // 스케줄러가 오늘 00:00:00 기준으로 저장하므로, 그 날짜의 ChannelStat을 조회합니다.
        LocalDateTime latestStatsDate = LocalDate.now().minusDays(3).atStartOfDay();
        Optional<ChannelStat> latestChannelStatOpt = channelStatRepository.findById_ChannelIdAndId_StatsDate(channelId, latestStatsDate);

        if (latestChannelStatOpt.isPresent()) {
            ChannelStat latestChannelStat = latestChannelStatOpt.get();
            totalSubscribers = latestChannelStat.getSubscriberCnt();
            latestSubscriberGained = latestChannelStat.getSubscriberGained();
            totalViews = latestChannelStat.getTotalViewsCnt();
            totalVideos = latestChannelStat.getVideosCnt();
        } else {
            logger.warn("No latest ChannelStat found for channel {}. Key metrics will be N/A or 0.", channelId);
        }
        
        LocalDate thirtyDaysAgo = LocalDate.now().minusDays(30);
        List<ChannelStat> recentChannelStats = channelStatRepository.findById_ChannelIdAndId_StatsDateBetween(
                channelId, thirtyDaysAgo.atStartOfDay(), LocalDate.now().minusDays(3).atStartOfDay()
            );

            double sumAvgViewDuration = 0;
            long countNonZeroAvgViewDuration = 0;

            for (ChannelStat stat : recentChannelStats) {
                if (stat.getAvgViewDuration() != null && stat.getAvgViewDuration() > 0) {
                    sumAvgViewDuration += stat.getAvgViewDuration();
                    countNonZeroAvgViewDuration++;
                }
            }

            if (countNonZeroAvgViewDuration > 0) {
                long averageSeconds = (long) (sumAvgViewDuration / countNonZeroAvgViewDuration);
                long minutes = averageSeconds / 60;
                long seconds = averageSeconds % 60;
                averageWatchTime = String.format("%d:%02d", minutes, seconds);
                logger.info("Calculated 30-day average watch time for channel {}: {}", channelId, averageWatchTime);
            } else {
                logger.warn("No non-zero average watch time data found in the last 30 days for channel {}. Average watch time will be N/A.", channelId);
                averageWatchTime = "N/A";
            }
        
        // 평균 영상 업로드 주기 계산
        String averageUploadInterval = "데이터 부족";
        LocalDate threeMonthsAgo = LocalDate.now().minusMonths(3);
        LocalDate videoUploadQueryEndDate = LocalDate.now().minusDays(1); // 스케줄러의 analyticsDataEndDate와 동일하게 맞춤

        List<YouTubeVideo> recentVideos = youTubeVideoRepository.findByChannelIdAndUploadedAtBetweenOrderByUploadedAtAsc(
            channelId, threeMonthsAgo.atStartOfDay(), videoUploadQueryEndDate.atStartOfDay().plusDays(1).minusNanos(1)
        );

        int numberOfVideosInPeriod = recentVideos.size();

        long totalDaysInPeriod = ChronoUnit.DAYS.between(threeMonthsAgo, videoUploadQueryEndDate) + 1; // <--- 이 부분을 수정합니다.
        if (numberOfVideosInPeriod > 0) {
            double avgIntervalDays = (double) totalDaysInPeriod / numberOfVideosInPeriod;
            averageUploadInterval = String.format("%.1f일", avgIntervalDays);;
        } else {
            logger.warn("Not enough recent videos (only {} videos) in the last 3 months for channel {} to calculate upload interval.", recentVideos.size(), channelId);
        }

        logger.info("Successfully retrieved key metrics for channelId: {}", channelId);
        return Optional.of(ChannelKeyMetricsDto.builder()
                .totalSubscribers(totalSubscribers)
                .latestSubscriberGained(latestSubscriberGained)
                .totalViews(totalViews)
                .averageWatchTime(averageWatchTime)
                .totalVideos(totalVideos)
                .averageUploadInterval(averageUploadInterval)
                .build());
    }
}
