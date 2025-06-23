package com.cm.astb.controller;

import com.cm.astb.service.GeminiAnalysisService;
import com.google.api.client.googleapis.json.GoogleJsonResponseException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Map;

/**
 * AI 기반 분석 기능과 관련된 API 엔드포인트를 제공하는 컨트롤러.
 */
@RestController
@RequestMapping("/api/ai")
public class GeminiAnalysisController {

    private final GeminiAnalysisService aiAnalysisService;

    public GeminiAnalysisController(GeminiAnalysisService aiAnalysisService) {
        this.aiAnalysisService = aiAnalysisService;
    }

    // =================================================================================
    // = 채널 분석 엔드포인트 =
    // =================================================================================
    
    @GetMapping("/youtube/channel-analysis")
    public ResponseEntity<?> getAiChannelAnalysis(
            @RequestParam String userId,
            @RequestParam String channelId,
            @RequestParam String myChannelTopic) {
        try {
            String aiResultJson = aiAnalysisService.analyzeChannelWithAi(userId, channelId, myChannelTopic);
            final HttpHeaders httpHeaders = new HttpHeaders();
            httpHeaders.setContentType(MediaType.APPLICATION_JSON);
            return new ResponseEntity<>(aiResultJson, httpHeaders, HttpStatus.OK);
        } catch (Exception e) {
            return handleException(e);
        }
    }


    // =================================================================================
    // = 영상 분석 엔드포인트 =
    // =================================================================================
    
    /**
     * 지정된 유튜브 동영상의 ID를 받아 백엔드에서 직접 스크립트를 추출하고 AI 분석을 수행합니다.
     *
     * @param videoId 분석할 동영상 ID (URL 경로에서 가져옴)
     * @return Map<String, Object> 유튜브 동영상 정보와 AI 분석 결과를 포함하는 JSON
     */
    @GetMapping("/youtube/video-analysis/{videoId}")
    public ResponseEntity<?> getAiVideoAnalysis(
            @PathVariable String videoId) {

        try {
            Map<String, Object> aiVideoAnalysisResultMap = aiAnalysisService.analyzeVideoWithAi(videoId);
            return ResponseEntity.ok(aiVideoAnalysisResultMap);

        } catch (Exception e) {
            return handleException(e);
        }
    }

    // =================================================================================
    // ✨✨✨ 채널 댓글 AI 분석 엔드포인트 추가 ✨✨✨
    // =================================================================================

    /**
     * [신규] 특정 채널의 댓글을 AI로 분석하여 대표 댓글 및 종합 피드백을 제공합니다.
     * @param channelId 분석할 채널 ID
     * @param period 분석 기간 ('quarter', 'month' 등)
     * @return AI가 분석한 댓글 결과 (대표 댓글 리스트, 종합 피드백 문자열)
     */
    @GetMapping("/youtube/comment-analysis-ai")
    public ResponseEntity<?> getAiCommentAnalysisForChannel(
            @RequestParam String channelId,
            @RequestParam(required = false, defaultValue = "quarter") String period) { // 기간은 선택적으로
        try {
            Map<String, Object> aiCommentAnalysisResult = aiAnalysisService.analyzeChannelCommentsWithAi(channelId, period);
            return ResponseEntity.ok(aiCommentAnalysisResult);
        } catch (Exception e) {
            return handleException(e);
        }
    }

    // 공용 예외 처리 헬퍼 메소드
    private ResponseEntity<?> handleException(Exception e) {
        e.printStackTrace(); // 개발 중에는 스택 트레이스 출력
        if (e instanceof IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "클라이언트 요청 오류: " + e.getMessage()));
        } else if (e instanceof GoogleJsonResponseException gje) {
            // YouTube API 할당량 초과 에러 처리
            if (gje.getStatusCode() == HttpStatus.FORBIDDEN.value() && gje.getDetails() != null &&
                gje.getDetails().getErrors() != null && !gje.getDetails().getErrors().isEmpty() &&
                "quotaExceeded".equals(gje.getDetails().getErrors().get(0).getReason())) {
                return ResponseEntity.status(HttpStatus.FORBIDDEN)
                        .body(Map.of("error", "YouTube API 할당량을 초과했습니다. 잠시 후 다시 시도해주세요."));
            }
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "YouTube API 호출 중 오류 발생: " + gje.getMessage()));
        } else if (e instanceof IOException || e instanceof GeneralSecurityException) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "AI 분석 중 백엔드 오류 발생: " + e.getMessage()));
        } else if (e instanceof InterruptedException) {
             Thread.currentThread().interrupt(); // 스레드 인터럽트 상태를 다시 설정
             return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "스크립트 분석 프로세스 처리 중 예기치 않은 중단이 발생했습니다."));
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "AI 분석 중 예상치 못한 오류 발생: " + e.getMessage()));
        }
    }
}