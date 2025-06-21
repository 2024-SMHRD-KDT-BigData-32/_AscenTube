package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class VideoLengthViewsDto {
    private String lengthSegment;
    private Long viewsCount;
    private Double percentage;
}