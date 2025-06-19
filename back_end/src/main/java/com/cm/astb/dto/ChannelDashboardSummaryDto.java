package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ChannelDashboardSummaryDto {
	private List<ChannelAudienceGenderDto> genderRatio;
	private List<ChannelAudienceAgeGroupDto> ageGroupDistribution;
	private List<ChannelAudienceCountryDto> countryViewers;
	private List<ChannelTrafficSourceDto> trafficSources;
}