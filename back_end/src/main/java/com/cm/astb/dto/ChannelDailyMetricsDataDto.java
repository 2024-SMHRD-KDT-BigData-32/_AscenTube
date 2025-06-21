package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class ChannelDailyMetricsDataDto {
    private LocalDate date;
    private Long dailyViews;
    private Long estimatedMinutesWatched;
    private Long averageViewDuration;
    private Integer subscribersGained;
}