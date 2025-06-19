package com.cm.astb.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
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
import com.cm.astb.dto.ChannelTrafficSourceDto;
import com.cm.astb.entity.ChannelDashboardStat;
import com.cm.astb.repository.ChannelDashboardStatRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

@Service
public class ChannelAnalysisService {

	private static final Logger logger = LoggerFactory.getLogger(ChannelAnalysisService.class);

	private final ChannelDashboardStatRepository channelDashboardStatRepository;
	private final ObjectMapper objectMapper;
	
	public ChannelAnalysisService(ChannelDashboardStatRepository channelDashboardStatRepository,
			ObjectMapper objectMapper) {
		this.channelDashboardStatRepository = channelDashboardStatRepository;
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
}
