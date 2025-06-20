package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DeviceTypeViewsDto {
    private String deviceType;
    private Long viewsCount;
    private Double percentage;
}