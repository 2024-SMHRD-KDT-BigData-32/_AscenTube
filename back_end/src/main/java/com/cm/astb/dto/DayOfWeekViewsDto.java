package com.cm.astb.dto;

import java.time.DayOfWeek;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DayOfWeekViewsDto {
    private String dayOfWeekName;
    private DayOfWeek dayOfWeekEnum;
    private Long views;
}