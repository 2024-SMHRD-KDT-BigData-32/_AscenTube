package com.cm.astb.controller;

// [수정] GeminiAnalysisDto는 더 이상 사용하지 않으므로 import를 제거하거나 주석 처리합니다.
// import com.cm.astb.dto.GeminiAnalysisDto; 
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
    // =                             채널 분석 엔드포인트 (기존과 동일)                      =
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
    // =                      영상 분석 엔드포인트 (yt-dlp 방식으로 수정됨)                =
    // =================================================================================
    
    /**
     * [수정] 지정된 유튜브 동영상의 ID를 받아 백엔드에서 직접 스크립트를 추출하고 AI 분석을 수행합니다.
     *
     * @param videoId 분석할 동영상 ID (URL 경로에서 가져옴)
     * @return Map<String, Object> 유튜브 동영상 정보와 AI 분석 결과를 포함하는 JSON
     */
    @GetMapping("/youtube/video-analysis/{videoId}") // [수정] POST -> GET
    public ResponseEntity<?> getAiVideoAnalysis(
            @PathVariable String videoId) { // [수정] RequestBody와 userId 파라미터 제거

        try {
            // [수정] 서비스 호출 시 videoId만 전달
            Map<String, Object> aiVideoAnalysisResultMap = aiAnalysisService.analyzeVideoWithAi(videoId);

            return ResponseEntity.ok(aiVideoAnalysisResultMap);

        } catch (Exception e) {
            return handleException(e);
        }
    }

    // 공용 예외 처리 헬퍼 메소드
    private ResponseEntity<?> handleException(Exception e) {
        e.printStackTrace();
        if (e instanceof IllegalArgumentException) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                    .body(Map.of("error", "클라이언트 요청 오류: " + e.getMessage()));
        } else if (e instanceof GoogleJsonResponseException gje) {
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
        // [신규] yt-dlp 프로세스 대기 중 발생할 수 있는 InterruptedException 처리 추가
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