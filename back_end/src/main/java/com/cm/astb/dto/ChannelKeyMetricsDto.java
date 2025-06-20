package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChannelKeyMetricsDto {
    private Long totalSubscribers;
    private Integer latestSubscriberGained;
    private Long totalViews;
    private String averageWatchTime;
    private Long totalVideos;
    private String averageUploadInterval;
}