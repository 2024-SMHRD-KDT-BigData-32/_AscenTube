package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChannelSearchResultDto {
	private String channelId;
	private String channelName;
	private String thumbnailUrl;
	private Long subscriberCount;
	private Long videoCount;
	private Long viewCount;
	private boolean isFavorited;
	private String channelMemo;
}