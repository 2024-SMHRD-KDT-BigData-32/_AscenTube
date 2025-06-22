package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class CommentAnalysisDistributionDto {
    private String type;
    private Long count;
    private Double percentage;
}