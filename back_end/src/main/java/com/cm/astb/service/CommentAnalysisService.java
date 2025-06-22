package com.cm.astb.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.dto.CommentAnalysisDistributionDto;
import com.cm.astb.dto.CommentAnalysisSummaryDto;
import com.cm.astb.dto.CommentDetailDto;
import com.cm.astb.entity.Comment; // Comment 엔티티 임포트
import com.cm.astb.entity.SentimentType; // SentimentType 임포트
import com.cm.astb.entity.SpeechActType; // SpeechActType 임포트
import com.cm.astb.entity.YouTubeVideo; // YouTubeVideo 엔티티 임포트
import com.cm.astb.repository.CommentRepository; // CommentRepository 임포트
import com.cm.astb.repository.YouTubeVideoRepository; // YouTubeVideoRepository 임포트

@Service
public class CommentAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(CommentAnalysisService.class);

    private final CommentRepository commentRepository;
    private final YouTubeVideoRepository youTubeVideoRepository;

    public CommentAnalysisService(CommentRepository commentRepository, YouTubeVideoRepository youTubeVideoRepository) {
        this.commentRepository = commentRepository;
        this.youTubeVideoRepository = youTubeVideoRepository;
    }

    /**
     * 특정 채널의 댓글 감성 분석 결과 분포를 계산합니다.
     * (내부 호출용)
     * @param allCommentsInPeriod 해당 기간의 모든 댓글 리스트
     * @return 감성 분석 분포 리스트
     */
    private List<CommentAnalysisDistributionDto> calculateSentimentDistribution(List<Comment> allCommentsInPeriod) {
        if (allCommentsInPeriod.isEmpty()) {
            return Collections.emptyList();
        }

        Map<SentimentType, Long> sentimentCounts = allCommentsInPeriod.stream()
                .filter(comment -> comment.getSentimentType() != null) // null 값 필터링
                .collect(Collectors.groupingBy(
                    Comment::getSentimentType,
                    Collectors.counting()
                ));

        long totalComments = allCommentsInPeriod.size();

        return sentimentCounts.entrySet().stream()
                .map(entry -> CommentAnalysisDistributionDto.builder()
                        .type(entry.getKey().getDbValue()) // Enum 값을 DB 문자열로 변환
                        .count(entry.getValue())
                        .percentage(calculatePercentage(entry.getValue(), totalComments))
                        .build())
                .sorted(Comparator.comparing(CommentAnalysisDistributionDto::getCount, Comparator.reverseOrder()))
                .collect(Collectors.toList());
    }

    /**
     * 특정 채널의 댓글 화행 분석 결과 분포를 계산합니다.
     * (내부 호출용)
     * @param allCommentsInPeriod 해당 기간의 모든 댓글 리스트
     * @return 화행 분석 분포 리스트
     */
    private List<CommentAnalysisDistributionDto> calculateSpeechActDistribution(List<Comment> allCommentsInPeriod) {
        if (allCommentsInPeriod.isEmpty()) {
            return Collections.emptyList();
        }

        Map<SpeechActType, Long> speechActCounts = allCommentsInPeriod.stream()
                .filter(comment -> comment.getSpeechAct() != null) // null 값 필터링
                .collect(Collectors.groupingBy(
                    Comment::getSpeechAct,
                    Collectors.counting()
                ));

        long totalComments = allCommentsInPeriod.size();

        return speechActCounts.entrySet().stream()
                .map(entry -> CommentAnalysisDistributionDto.builder()
                        .type((String)entry.getKey().getDbValue()) // Enum 값을 DB 문자열로 변환
                        .count(entry.getValue())
                        .percentage(calculatePercentage(entry.getValue(), totalComments))
                        .build())
                .sorted(Comparator.comparing(CommentAnalysisDistributionDto::getCount, Comparator.reverseOrder()))
                .collect(Collectors.toList());
    }

    /**
     * 특정 채널의 가장 최신 댓글 목록을 조회합니다.
     * @param videoIds 댓글을 조회할 비디오 ID 목록
     * @param startDate 조회 기간 시작일시
     * @param endDate 조회 기간 종료일시
     * @param limit 가져올 댓글의 최대 개수
     * @return 최신 댓글 목록
     */
    @Transactional(readOnly = true)
    private List<CommentDetailDto> getLatestComments(
            List<Long> videoIds, LocalDateTime startDate, LocalDateTime endDate, int limit) {

        // isDeleted = 'N' 인 댓글만 조회하도록 가정 (댓글 상세 정보는 삭제되지 않은 것만)
        List<Comment> comments = commentRepository.findByVideoIdInAndCommentWriteAtBetweenAndIsDeleted(
            videoIds, startDate, endDate.plusDays(1).minusNanos(1), "N"
        );

        return comments.stream()
                .sorted(Comparator.comparing(comment -> comment.getCommentWriteAt(), Comparator.reverseOrder())) // <--- 이 부분을 수정합니다.
                .limit(limit)
                .map(this::mapCommentToDetailDto) // 헬퍼 메서드 사용
                .collect(Collectors.toList());
    }

    /**
     * 특정 채널의 좋아요 수가 가장 높은 댓글 목록을 조회합니다.
     * @param videoIds 댓글을 조회할 비디오 ID 목록
     * @param startDate 조회 기간 시작일시
     * @param endDate 조회 기간 종료일시
     * @param limit 가져올 댓글의 최대 개수
     * @return 인기 댓글 목록
     */
    @Transactional(readOnly = true)
    private List<CommentDetailDto> getTopLikedComments(
            List<Long> videoIds, LocalDateTime startDate, LocalDateTime endDate, int limit) {

        // isDeleted = 'N' 인 댓글만 조회하도록 가정
        List<Comment> comments = commentRepository.findByVideoIdInAndCommentWriteAtBetweenAndIsDeleted(
            videoIds, startDate, endDate.plusDays(1).minusNanos(1), "N"
        );

        return comments.stream()
                .filter(comment -> comment.getCommentLikeCount() != null) // 좋아요 수가 null인 댓글 제외
                .sorted(Comparator.comparing(Comment::getCommentLikeCount, Comparator.reverseOrder())) // 좋아요 수 내림차순 정렬
                .limit(limit)
                .map(this::mapCommentToDetailDto)
                .collect(Collectors.toList());
    }

    /**
     * 특정 채널의 각 화행별로 좋아요 수가 가장 높은 대표 댓글을 조회합니다.
     *
     * @param videoIds 댓글을 조회할 비디오 ID 목록
     * @param startDate 조회 기간 시작일시
     * @param endDate 조회 기간 종료일시
     * @return 화행별 대표 댓글 목록
     */
    @Transactional(readOnly = true)
    private List<CommentDetailDto> getRepresentativeCommentsBySpeechAct(
            List<Long> videoIds, LocalDateTime startDate, LocalDateTime endDate) {

        // isDeleted = 'N' 인 댓글만 조회하도록 가정
        List<Comment> comments = commentRepository.findByVideoIdInAndCommentWriteAtBetweenAndIsDeleted(
            videoIds, startDate, endDate.plusDays(1).minusNanos(1), "N"
        );

        if (comments.isEmpty()) {
            return Collections.emptyList();
        }

        // 화행별로 그룹화하고, 각 그룹에서 좋아요 수가 가장 높은 댓글을 찾습니다.
        Map<SpeechActType, Optional<Comment>> topCommentBySpeechAct = comments.stream()
                .filter(comment -> comment.getSpeechAct() != null) // 화행 타입이 null인 댓글 제외
                .collect(Collectors.groupingBy(
                    Comment::getSpeechAct,
                    Collectors.maxBy(Comparator.comparing(Comment::getCommentLikeCount, Comparator.nullsLast(Integer::compare)))
                ));

        List<CommentDetailDto> result = topCommentBySpeechAct.entrySet().stream()
                .filter(entry -> entry.getValue().isPresent()) // Optional이 비어있지 않은 경우만 필터링
                .map(entry -> this.mapCommentToDetailDto(entry.getValue().get())) // 헬퍼 메서드 사용
                .sorted(Comparator.comparing(CommentDetailDto::getSpeechAct, Comparator.nullsLast(String::compareTo))) // 화행 타입별로 정렬 (문자열 비교)
                .collect(Collectors.toList());

        return result;
    }


    /**
     * 특정 채널의 댓글 분석 요약 정보 (총 댓글 수, 감성/화행 분포, 최신/인기 댓글 등)를 조회합니다.
     *
     * @param channelId 조회할 채널 ID
     * @param period    조회 기간 ("month", "quarter", "6month", "year")
     * @return 댓글 분석 요약 DTO
     */
    @Transactional(readOnly = true)
    public CommentAnalysisSummaryDto getCommentAnalysisSummary(String channelId, String period) {
        logger.info("Attempting to get comment analysis summary for channelId: {} with period: {}", channelId, period);

        LocalDate endDate = LocalDate.now(); // 오늘까지 포함 (댓글은 비교적 실시간으로 수집될 수 있으므로)
        LocalDate startDate = getStartDateFromPeriod(endDate, period);

        // 채널의 모든 비디오 ID를 가져옵니다.
        List<YouTubeVideo> channelVideos = youTubeVideoRepository.findByChannelId(channelId);
        if (channelVideos.isEmpty()) {
            logger.warn("No videos found for channelId: {}. Cannot perform comment analysis.", channelId);
            return CommentAnalysisSummaryDto.builder()
                        .totalComments(0L)
                        .sentimentDistribution(Collections.emptyList())
                        .speechActDistribution(Collections.emptyList())
                        .latestComments(Collections.emptyList())
                        .topLikedComments(Collections.emptyList())
                        .representativeCommentsBySpeechAct(Collections.emptyList())
                        .build();
        }
        List<Long> videoIds = channelVideos.stream()
                                          .map(YouTubeVideo::getVideoId)
                                          .collect(Collectors.toList());

        // 총 댓글 수와 분포 계산을 위한 원본 댓글 리스트 조회 (한 번만 조회)
        List<Comment> allCommentsInPeriod = commentRepository.findByVideoIdInAndCommentWriteAtBetweenAndIsDeleted(
            videoIds, startDate.atStartOfDay(), endDate.atStartOfDay().plusDays(1).minusNanos(1), "N" // 삭제되지 않은 댓글만
        );
        long totalComments = allCommentsInPeriod.size();


        // 각 분포 메서드 호출 (allCommentsInPeriod 재활용)
        List<CommentAnalysisDistributionDto> sentimentDist = calculateSentimentDistribution(allCommentsInPeriod);
        List<CommentAnalysisDistributionDto> speechActDist = calculateSpeechActDistribution(allCommentsInPeriod);

        // 최신 댓글, 인기 댓글, 화행별 대표 댓글 목록 조회 (limit 설정)
        int defaultCommentLimit = 5; // 화면에 보여줄 댓글 개수
        List<CommentDetailDto> latestComments = getLatestComments(videoIds, startDate.atStartOfDay(), endDate.atStartOfDay().plusDays(1).minusNanos(1), defaultCommentLimit);
        List<CommentDetailDto> topLikedComments = getTopLikedComments(videoIds, startDate.atStartOfDay(), endDate.atStartOfDay().plusDays(1).minusNanos(1), defaultCommentLimit);
        List<CommentDetailDto> representativeComments = getRepresentativeCommentsBySpeechAct(videoIds, startDate.atStartOfDay(), endDate.atStartOfDay().plusDays(1).minusNanos(1));


        return CommentAnalysisSummaryDto.builder()
                .totalComments(totalComments)
                .sentimentDistribution(sentimentDist)
                .speechActDistribution(speechActDist)
                .latestComments(latestComments)
                .topLikedComments(topLikedComments)
                .representativeCommentsBySpeechAct(representativeComments)
                .build();
    }


    // --- 헬퍼 메서드 ---
    private LocalDate getStartDateFromPeriod(LocalDate endDate, String period) {
        switch (period.toLowerCase()) {
            case "quarter":
                return endDate.minusMonths(3);
            case "6month":
                return endDate.minusMonths(6);
            case "year":
                return endDate.minusYears(1);
            case "month":
            default:
                return endDate.minusDays(30);
        }
    }

    private Double calculatePercentage(Long count, Long total) {
        if (total == null || total == 0) {
            return 0.0;
        }
        return BigDecimal.valueOf(count)
                         .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP) // 소수점 4자리까지 계산
                         .multiply(BigDecimal.valueOf(100))
                         .setScale(2, RoundingMode.HALF_UP) // 소수점 2자리로 반올림
                         .doubleValue();
    }

    /**
     * Comment 엔티티를 CommentDetailDto로 매핑합니다.
     * 댓글 내용, 작성자, 좋아요 수 등 상세 정보를 포함합니다.
     * 이 메서드는 CommentDetailDto에 videoKey와 videoTitle을 추가하기 위해 YouTubeVideo 엔티티 조회에 의존합니다.
     * (N+1 쿼리 발생 가능성 있으므로 주의)
     *
     * @param comment 매핑할 Comment 엔티티
     * @return CommentDetailDto
     */
    private CommentDetailDto mapCommentToDetailDto(Comment comment) {
        String videoKey = null;
        String videoTitle = null;
        // YouTubeVideoRepository.findById는 PK(Long)를 받으므로, comment.getVideoId()가 Long 타입이어야 함.
        // 현재 Comment POJO에 videoId가 Long으로 정의되어 있으므로 문제 없음.
        Optional<YouTubeVideo> videoOpt = youTubeVideoRepository.findById(comment.getVideoId());
        if(videoOpt.isPresent()){
            YouTubeVideo video = videoOpt.get();
            videoKey = video.getVideoKey();
            videoTitle = video.getVideoTitle();
        } else {
            logger.warn("YouTubeVideo not found for videoId: {}", comment.getVideoId());
        }

        return CommentDetailDto.builder()
                .commentId(comment.getCommentId())
                .videoKey(videoKey)
                .videoTitle(videoTitle)
                .commentContent(comment.getCommentContent())
                .commentWriterName(comment.getCommentWriterName())
                .commentLikeCount(comment.getCommentLikeCount())
                .commentWriteAt(comment.getCommentWriteAt())
                .sentimentType(comment.getSentimentType() != null ? comment.getSentimentType().getDbValue() : null) // Enum to String
                .speechAct(comment.getSpeechAct() != null ? comment.getSpeechAct().getDbValue() : null) // Enum to String
                .build();
    }
}