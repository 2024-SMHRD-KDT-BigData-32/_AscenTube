package com.cm.astb.dto;

import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChannelDashboardSummaryDto {
	private List<ChannelAudienceGenderDto> genderRatio;
	private List<ChannelAudienceAgeGroupDto> ageGroupDistribution;
	private List<ChannelAudienceCountryDto> countryViewers;
	private List<ChannelTrafficSourceDto> trafficSources;
	 private List<DeviceTypeViewsDto> deviceDistribution;
}