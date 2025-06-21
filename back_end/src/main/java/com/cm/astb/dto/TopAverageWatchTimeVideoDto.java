package com.cm.astb.dto;

import java.time.LocalDateTime;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TopAverageWatchTimeVideoDto {
    private String videoKey;
    private String videoTitle;
    private String thumbnailUrl;
    private Integer avgWatchTime;
    private Long viewCount;
    private LocalDateTime uploadedAt;
    private Integer videoDuration;
    private Integer videoPlaytime;
}
