package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChannelAudienceAgeGroupDto {
	private String ageGroup;
	private Double percentage;
}