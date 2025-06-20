package com.cm.astb.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.TextStyle;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

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
import com.cm.astb.dto.DayOfWeekViewsDto;
import com.cm.astb.dto.DeviceTypeViewsDto;
import com.cm.astb.dto.HourOfDayViewsDto;
import com.cm.astb.dto.VideoLengthViewsDto;
import com.cm.astb.entity.ChannelDashboardStat;
import com.cm.astb.entity.ChannelStat;
import com.cm.astb.entity.VideoStat;
import com.cm.astb.entity.YouTubeVideo;
import com.cm.astb.repository.ChannelDashboardStatRepository;
import com.cm.astb.repository.ChannelStatRepository;
import com.cm.astb.repository.VideoStatRepository;
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
	private final VideoStatRepository videoStatRepository;
	private final ObjectMapper objectMapper;

	public ChannelAnalysisService(ChannelDashboardStatRepository channelDashboardStatRepository,
			ChannelStatRepository channelStatRepository, YouTubeVideoRepository youTubeVideoRepository,
			VideoStatRepository videoStatRepository, ObjectMapper objectMapper) {
		super();
		this.channelDashboardStatRepository = channelDashboardStatRepository;
		this.channelStatRepository = channelStatRepository;
		this.youTubeVideoRepository = youTubeVideoRepository;
		this.videoStatRepository = videoStatRepository;
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
            
            // 기기 유형별 분포 역직렬화 <--- 이 부분 추가
            if (dashboardStat.getDeviceDistributionJson() != null && !dashboardStat.getDeviceDistributionJson().isEmpty()) {
                dtoBuilder.deviceDistribution(objectMapper.readValue(dashboardStat.getDeviceDistributionJson(), new TypeReference<List<DeviceTypeViewsDto>>() {}));
            } else {
                dtoBuilder.deviceDistribution(new ArrayList<>());
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

        if (numberOfVideosInPeriod >= 2) {
            LocalDateTime firstUploadDate = recentVideos.get(0).getUploadedAt();
            LocalDateTime lastUploadDate = recentVideos.get(numberOfVideosInPeriod - 1).getUploadedAt();

            // 첫 업로드일부터 마지막 업로드일까지의 기간 일수 (+1은 시작일과 종료일 포함)
            long totalDaysActivePeriod = ChronoUnit.DAYS.between(firstUploadDate.toLocalDate(), lastUploadDate.toLocalDate()) + 1;

            double avgIntervalDays = (double) totalDaysActivePeriod / numberOfVideosInPeriod;

            averageUploadInterval = String.format("%.1f일", avgIntervalDays);
        } else if (numberOfVideosInPeriod == 1) { // 영상이 1개일 경우 주기는 계산 불가
            averageUploadInterval = "영상 1개";
        } else { // 영상이 0개일 경우
            averageUploadInterval = "영상 없음";
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
    
    /**
     * 특정 채널의 영상을 업로드한 요일별 총 조회수를 DB에서 집계하여 조회합니다.
     * 각 영상의 '업로드 요일'과 해당 영상의 '가장 최신 누적 조회수'를 연결합니다.
     * @param channelId 조회할 유튜브 채널 ID
     * @param period    조회 기간 (해당 기간에 업로드된 영상만 고려)
     * @return 요일별 총 조회수 리스트
     */
    @Transactional(readOnly = true)
    public List<DayOfWeekViewsDto> getChannelViewsByDayOfWeekFromDB(String channelId, String period) {
        logger.info("Attempting to get views by day of week from DB for channelId: {} with period: {}", channelId, period);

        // 조회 기간 설정: 특정 기간 내 업로드된 영상만 고려
        LocalDate periodEndDate = LocalDate.now().minusDays(1); // 어제 날짜
        LocalDate periodStartDate = getStartDateFromPeriod(periodEndDate, period);

        // 1. 해당 채널의 모든 비디오 메타데이터를 가져옵니다 (지정된 기간 내 업로드된 영상만).
        List<YouTubeVideo> videosInPeriod = youTubeVideoRepository.findByChannelIdAndUploadedAtBetweenOrderByUploadedAtAsc(
            channelId, periodStartDate.atStartOfDay(), periodEndDate.atStartOfDay().plusDays(1).minusNanos(1)
        );

        if (videosInPeriod.isEmpty()) {
            logger.warn("No videos uploaded in the specified period ({} to {}) for channelId: {}. Cannot calculate views by day of week.", periodStartDate, periodEndDate, channelId);
            return Collections.emptyList();
        }

        // 2. 각 영상의 '업로드 요일'과 '최신 누적 조회수'를 연결하여 집계합니다.
        // 스케줄러가 오늘 00:00:00에 최신 데이터를 저장하므로, 이 날짜를 기준으로 VideoStat을 조회합니다.
		LocalDateTime latestStatsDate = LocalDate.now().minusDays(1).atStartOfDay();

		Map<Long, VideoStat> latestVideoStatsMap = videoStatRepository
				.findByIdVideoIdInAndIdStatsDate(
						videosInPeriod.stream().map(YouTubeVideo::getVideoId).collect(Collectors.toList()),
						latestStatsDate)
				.stream().collect(Collectors.toMap(stat -> stat.getId().getVideoId(), Function.identity()));

		Map<DayOfWeek, Long> viewsByDayOfWeek = videosInPeriod.stream().map(video -> {
			// Map에서 조회하여 쿼리 횟수 감소
			VideoStat stat = latestVideoStatsMap.get(video.getVideoId());
			if (stat != null && stat.getViewCount() != null) { // null 체크
				return new Object[] { video.getUploadedAt().getDayOfWeek(), stat.getViewCount() };
			} else {
				logger.warn("No VideoStat found in map for videoKey: {}, videoId: {} on statsDate: {}. Skipping.",
						video.getVideoKey(), video.getVideoId(), latestStatsDate);
				return null;
			}
		}).filter(java.util.Objects::nonNull) // VideoStat이 없는 영상은 제외
				.collect(Collectors.groupingBy(arr -> (DayOfWeek) arr[0], // 업로드 요일 기준으로 그룹화
						Collectors.summingLong(arr -> (Long) arr[1]) // 해당 요일의 총 조회수 합산
				));

		List<DayOfWeekViewsDto> result = viewsByDayOfWeek.entrySet().stream()
                .map(entry -> DayOfWeekViewsDto.builder()
                        .dayOfWeekName(entry.getKey().getDisplayName(TextStyle.FULL, Locale.getDefault())) // 한글 요일 이름
                        .dayOfWeekEnum(entry.getKey())
                        .views(entry.getValue())
                        .build())
                .sorted(Comparator.comparing(DayOfWeekViewsDto::getDayOfWeekEnum)) // <--- DayOfWeek Enum 필드로 정렬
                .collect(Collectors.toList());

        // 7개 요일 모두 포함되도록 보정 (데이터가 없는 요일도 0으로 표시)
//        for (DayOfWeek day : DayOfWeek.values()) {
//            if (!viewsByDayOfWeek.containsKey(day)) {
//                result.add(DayOfWeekViewsDto.builder()
//                                .dayOfWeekName(day.getDisplayName(TextStyle.FULL, Locale.getDefault()))
//                                .dayOfWeekEnum(day) // DayOfWeek Enum 객체 할당
//                                .views(0L)
//                                .build());
//            }
//        }
        result.sort(Comparator.comparing(DayOfWeekViewsDto::getDayOfWeekEnum));

        logger.info("Retrieved {} data points for views by day of week from DB for channelId: {} and period: {}", result.size(), channelId, period);
        return result;
    }
    
    /**
     * 특정 채널의 영상을 업로드한 시간대별 총 조회수를 DB에서 집계하여 조회합니다.
     * 각 영상의 '업로드 시간대'와 해당 영상의 '가장 최신 누적 조회수'를 연결합니다.
     *
     * @param channelId 조회할 유튜브 채널 ID
     * @param period    조회 기간 (해당 기간에 업로드된 영상만 고려)
     * @return 시간대별 총 조회수 리스트
     */
    @Transactional(readOnly = true)
    public List<HourOfDayViewsDto> getChannelViewsByHourFromDB(String channelId, String period) {
        logger.info("Attempting to get views by hour from DB for channelId: {} with period: {}", channelId, period);

        LocalDate periodEndDate = LocalDate.now().minusDays(1); // 어제 날짜
        LocalDate periodStartDate = getStartDateFromPeriod(periodEndDate, period);

        // 1. 해당 채널의 모든 비디오 메타데이터를 가져옵니다 (지정된 기간 내 업로드된 영상만).
        List<YouTubeVideo> videosInPeriod = youTubeVideoRepository.findByChannelIdAndUploadedAtBetweenOrderByUploadedAtAsc(
            channelId, periodStartDate.atStartOfDay(), periodEndDate.atStartOfDay().plusDays(1).minusNanos(1)
        );

        if (videosInPeriod.isEmpty()) {
            logger.warn("No videos uploaded in the specified period ({} to {}) for channelId: {}. Cannot calculate views by hour.", periodStartDate, periodEndDate, channelId);
            return Collections.emptyList();
        }

        // 2. 각 영상의 '업로드 시간대'와 '최신 누적 조회수'를 연결하여 집계합니다.
        LocalDateTime latestStatsDate = LocalDate.now().minusDays(1).atStartOfDay(); // VideoStat의 최신 통계 날짜 기준

        Map<Integer, Long> viewsByHour = videosInPeriod.stream()
                .map(video -> {
                    // 각 영상에 대한 가장 최신 VideoStat 레코드 하나만 조회합니다.
                    Optional<VideoStat> latestStatOpt = videoStatRepository.findById_VideoIdAndId_StatsDate(
                        video.getVideoId().intValue(), latestStatsDate
                    );
                    if (latestStatOpt.isPresent()) {
                        VideoStat stat = latestStatOpt.get();
                        // 해당 영상의 업로드 시간(시)과 최신 누적 조회수를 반환합니다.
                        return new Object[]{video.getUploadedAt().getHour(), stat.getViewCount()};
                    } else {
                        logger.warn("No latest VideoStat found for videoKey: {}, videoId: {} on statsDate: {}. Skipping for hour analysis.",
                                video.getVideoKey(), video.getVideoId(), latestStatsDate);
                        return null;
                    }
                })
                .filter(java.util.Objects::nonNull) // VideoStat이 없는 영상은 제외
                .collect(Collectors.groupingBy(
                    arr -> (Integer) arr[0], // 업로드 시간대 기준으로 그룹화
                    Collectors.summingLong(arr -> (Long) arr[1]) // 해당 시간대의 총 조회수 합산
                ));

        List<HourOfDayViewsDto> result = viewsByHour.entrySet().stream()
                .map(entry -> HourOfDayViewsDto.builder()
                        .hour(entry.getKey())
                        .views(entry.getValue())
                        .build())
                .sorted(Comparator.comparing(HourOfDayViewsDto::getHour)) // 시간 순서대로 정렬 (0시부터 23시)
                .collect(Collectors.toList());

        // 0시부터 23시까지 모든 시간대가 포함되도록 보정 (데이터가 없는 시간대도 0으로 표시)
//        for (int i = 0; i < 24; i++) {
//            if (!viewsByHour.containsKey(i)) {
//                result.add(HourOfDayViewsDto.builder().hour(i).views(0L).build());
//            }
//        }
        result.sort(Comparator.comparing(HourOfDayViewsDto::getHour)); // 최종 정렬

        logger.info("Retrieved {} data points for views by hour from DB for channelId: {} and period: {}", result.size(), channelId, period);
        return result;
    }
    
    /**
     * 특정 채널의 영상 길이별 총 조회수 데이터를 DB에서 집계하여 조회합니다.
     * 지정된 기간 내 업로드된 영상만 고려하며, 각 영상의 '최신 누적 조회수'를 사용합니다.
     * 백분율은 채널의 '총 조회수'(가장 최신 데이터) 대비 계산합니다.
     *
     * @param channelId 조회할 유튜브 채널 ID
     * @param period    조회 기간 ("month", "quarter", "6month", "year") - 해당 기간 내 업로드된 영상만 대상
     * @return 영상 길이별 조회수 리스트
     */
    @Transactional(readOnly = true)
    public List<VideoLengthViewsDto> getViewsByVideoLength(String channelId, String period) {
        logger.info("Attempting to get views by video length from DB for channelId: {} with period: {}", channelId, period);

        // 1. 조회 기간 설정: 해당 기간 내 업로드된 영상만 고려
        LocalDate periodEndDate = LocalDate.now().minusDays(1); // 어제 날짜
        LocalDate periodStartDate = getStartDateFromPeriod(periodEndDate, period);

        // 2. 해당 기간 내 업로드된 모든 비디오 메타데이터 가져오기
        List<YouTubeVideo> videosInPeriod = youTubeVideoRepository.findByChannelIdAndUploadedAtBetweenOrderByUploadedAtAsc(
            channelId, periodStartDate.atStartOfDay(), periodEndDate.atStartOfDay().plusDays(1).minusNanos(1)
        );

        if (videosInPeriod.isEmpty()) {
            logger.warn("No videos uploaded in the specified period ({} to {}) for channelId: {}. Returning empty list for video length analysis.", periodStartDate, periodEndDate, channelId);
            return initializeVideoLengthSegments(0L, 0.0); // 영상이 없을 때 초기화된 세그먼트 반환
        }

        // 3. 각 영상의 최신 누적 조회수 가져오기 (N+1 쿼리 방지를 위해 Map으로 미리 로드)
        // 스케줄러가 (오늘 - 3일) 00:00:00에 저장한다고 되어 있지만, API 조회는 (오늘 - 1일) 시점까지 가능하다고 되어 있으니
        // 최신 VideoStat 날짜를 오늘 00:00:00으로 맞추는 것이 가장 좋습니다.
        // DataCollectorService의 VideoStat 저장 로직을 다시 보면 latestStatsDate는 LocalDate.now().atStartOfDay()로 되어있었습니다.
        LocalDateTime latestVideoStatsDate = LocalDate.now().minusDays(1).atStartOfDay(); 
        Map<Long, VideoStat> latestVideoStatsMap = videoStatRepository.findByIdVideoIdInAndIdStatsDate(
            videosInPeriod.stream().map(YouTubeVideo::getVideoId).collect(Collectors.toList()),
            latestVideoStatsDate
        ).stream().collect(Collectors.toMap(stat -> stat.getId().getVideoId(), Function.identity()));

        // 4. 영상 길이별 조회수 집계 및 '해당 기간 내 영상들의 총 조회수 합계' 계산
        Map<String, Long> segmentViews = new LinkedHashMap<>();
        // 세그먼트 초기화 (순서 유지를 위해 미리 추가)
        segmentViews.put("0-1분", 0L);
        segmentViews.put("1-2분", 0L);
        segmentViews.put("2-3분", 0L);
        segmentViews.put("3-5분", 0L);
        segmentViews.put("5-10분", 0L);
        segmentViews.put("10-20분", 0L);
        segmentViews.put("20분 이상", 0L);

        long totalViewsForPeriodVideos = 0L; // <--- 이 변수를 추가하여 합산합니다.

        for (YouTubeVideo video : videosInPeriod) {
            VideoStat stat = latestVideoStatsMap.get(video.getVideoId());
            if (stat != null && stat.getViewCount() != null) {
                long views = stat.getViewCount();
                int playtimeSeconds = Optional.ofNullable(video.getVideoPlaytime()).orElse(0);

                String segment = getVideoLengthSegment(playtimeSeconds);
                segmentViews.merge(segment, views, Long::sum);
                totalViewsForPeriodVideos += views; // <--- 각 영상의 조회수를 여기에 합산합니다.
            } else {
                logger.warn("No latest VideoStat found in map for videoKey: {}, videoId: {} on statsDate: {}. Skipping for video length analysis.",
                        video.getVideoKey(), video.getVideoId(), latestVideoStatsDate);
            }
        }

        // 5. '해당 기간 내 영상들의 총 조회수 합계'가 0인지 확인 (백분율 계산 분모)
        if (totalViewsForPeriodVideos == 0L) {
            logger.warn("Total views for videos uploaded in the specified period is 0 for channelId: {}. Cannot calculate percentages for video length views.", channelId);
            return initializeVideoLengthSegments(0L, 0.0);
        }
        
        final long totalViewsForPeriodVideosFinal = totalViewsForPeriodVideos;
        // 6. DTO로 변환 및 백분율 계산 (totalViewsForPeriodVideos를 분모로 사용)
        List<VideoLengthViewsDto> result = segmentViews.entrySet().stream()
                .map(entry -> {
                    double percentage = (totalViewsForPeriodVideosFinal > 0) ?
                            (double) entry.getValue() / totalViewsForPeriodVideosFinal * 100 : 0.0; // <--- 분모 변경
                    return VideoLengthViewsDto.builder()
                            .lengthSegment(entry.getKey())
                            .viewsCount(entry.getValue())
                            .percentage(BigDecimal.valueOf(percentage).setScale(2, RoundingMode.HALF_UP).doubleValue())
                            .build();
                })
                .collect(Collectors.toList());

        logger.info("Retrieved {} data points for views by video length from DB for channelId: {} and period: {}. Total views for period videos: {}", result.size(), channelId, period, totalViewsForPeriodVideos);
        return result;
    }

    private String getVideoLengthSegment(int seconds) {
        if (seconds < 60) {
            return "0-1분";
        } else if (seconds < 120) {
            return "1-2분";
        } else if (seconds < 180) {
            return "2-3분";
        } else if (seconds < 300) {
            return "3-5분";
        } else if (seconds < 600) {
            return "5-10분";
        } else if (seconds < 1200) {
            return "10-20분";
        } else {
            return "20분 이상";
        }
    }
    
    private LocalDate getStartDateFromPeriod(LocalDate endDate, String period) {
        switch (period.toLowerCase()) {
            case "quarter":
                return endDate.minusMonths(3);
            case "6month":
                return endDate.minusMonths(6);
            case "year":
                return endDate.minusYears(1);
            case "month":
            default:
                return endDate.minusDays(30);
        }
    }
    
    private List<VideoLengthViewsDto> initializeVideoLengthSegments(Long viewsCount, Double percentage) {
        return Arrays.asList(
                VideoLengthViewsDto.builder().lengthSegment("0-1분").viewsCount(viewsCount).percentage(percentage).build(),
                VideoLengthViewsDto.builder().lengthSegment("1-2분").viewsCount(viewsCount).percentage(percentage).build(),
                VideoLengthViewsDto.builder().lengthSegment("2-3분").viewsCount(viewsCount).percentage(percentage).build(),
                VideoLengthViewsDto.builder().lengthSegment("3-5분").viewsCount(viewsCount).percentage(percentage).build(),
                VideoLengthViewsDto.builder().lengthSegment("5-10분").viewsCount(viewsCount).percentage(percentage).build(),
                VideoLengthViewsDto.builder().lengthSegment("10-20분").viewsCount(viewsCount).percentage(percentage).build(),
                VideoLengthViewsDto.builder().lengthSegment("20분 이상").viewsCount(viewsCount).percentage(percentage).build()
        );
    }
}
