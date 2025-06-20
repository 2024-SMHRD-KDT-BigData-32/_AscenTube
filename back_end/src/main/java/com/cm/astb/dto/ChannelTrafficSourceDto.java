package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChannelTrafficSourceDto {
	private String sourceType;
	private Double percentage;
}