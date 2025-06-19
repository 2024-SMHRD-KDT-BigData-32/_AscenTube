package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChannelAudienceCountryDto {
	private String country;
	private Double percentage;
	private Long viewsCount;
}