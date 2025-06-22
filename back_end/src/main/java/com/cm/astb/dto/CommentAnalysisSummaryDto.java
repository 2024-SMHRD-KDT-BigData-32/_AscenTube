package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class CommentAnalysisSummaryDto {
    private Long totalComments;
    private List<CommentAnalysisDistributionDto> sentimentDistribution;
    private List<CommentAnalysisDistributionDto> speechActDistribution;

    private List<CommentDetailDto> latestComments;
    private List<CommentDetailDto> topLikedComments;
    private List<CommentDetailDto> representativeCommentsBySpeechAct;
}