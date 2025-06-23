package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class VideoCommentAnalysisSummaryDto {
    private String videoKey; // 영상 유튜브 ID
    private String videoTitle; // 영상 제목
    private Long totalComments; // 해당 영상의 총 댓글 수

    private List<CommentAnalysisDistributionDto> sentimentDistribution; // 감성 분석 결과 분포
    private List<CommentAnalysisDistributionDto> speechActDistribution; // 화행 분석 결과 분포

    private List<CommentDetailDto> topLikedComments;           // 해당 영상의 좋아요 상위 댓글 목록 (상위 N개)
    private List<CommentDetailDto> representativeCommentsBySentiment; // 해당 영상의 감성별 대표 댓글 목록
    private List<CommentDetailDto> representativeCommentsBySpeechAct; // 해당 영상의 화행별 대표 댓글 목록
    private List<CommentDetailDto> latestComments;             // 해당 영상의 최신 댓글 목록 (상위 N개)
}