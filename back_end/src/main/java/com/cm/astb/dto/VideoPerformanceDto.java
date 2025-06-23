package com.cm.astb.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VideoPerformanceDto {
	private String videoKey;
    private String videoTitle;
    private String thumbnailUrl;
    private Long viewCount;
    private Integer avgWatchTime;
    private Integer likeCount;
    private Integer commentCount;
    private Integer subscriberGained;
    private LocalDateTime uploadedAt;
    private Integer videoPlaytime;
}
