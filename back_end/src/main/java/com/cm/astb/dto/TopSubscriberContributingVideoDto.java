package com.cm.astb.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TopSubscriberContributingVideoDto {
	private String videoKey;
    private String videoTitle;
    private String thumbnailUrl;
    private Integer subscriberGained;
    private Long viewCount;
    private LocalDateTime uploadedAt;
}
