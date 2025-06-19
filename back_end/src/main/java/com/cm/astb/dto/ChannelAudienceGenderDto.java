package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChannelAudienceGenderDto {
	private String gender;
	private Double percentage;
}
