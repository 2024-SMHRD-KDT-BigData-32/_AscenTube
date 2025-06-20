package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class HourOfDayViewsDto {
    private Integer hour;
    private Long views;
}