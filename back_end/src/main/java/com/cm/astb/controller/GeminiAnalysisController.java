package com.cm.astb.controller;

import com.cm.astb.dto.GeminiAnalysisDto; // 1. 새로 만든 DTO를 import 합니다.
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
    // =                            채널 분석 엔드포인트                             =
    // =================================================================================
    
    @GetMapping("/youtube/channel-analysis")
    public ResponseEntity<?> getAiChannelAnalysis(
            @RequestParam String userId,
            @RequestParam String channelId,
            @RequestParam String myChannelTopic) {
        try {
            String aiResultJson = aiAnalysisService.analyzeChannelWithAi(userId, channelId, myChannelTopic);
            final HttpHeaders httpHeaders = new HttpHeaders();
            httpHeaders.setContentType(MediaType.APPLICATION_JSON_UTF8);
            return new ResponseEntity<>(aiResultJson, httpHeaders, HttpStatus.OK);
        } catch (Exception e) {
            return handleException(e);
        }
    }


    // =================================================================================
    // =                            영상 분석 엔드포인트                             =
    // =================================================================================
    
    /**
     * [수정됨] 지정된 유튜브 동영상의 스크립트 등을 바탕으로 '콘텐츠 중심 분석'을 요청합니다.
     *
     * @param videoId 분석할 동영상 ID (URL 경로에서 가져옴)
     * @param requestDto 요청 본문 (userId와 transcript 포함 DTO)
     * @return Map<String, Object> 유튜브 동영상 정보와 AI 분석 결과를 포함하는 JSON
     */
    @PostMapping("/youtube/video-analysis/{videoId}")
    public ResponseEntity<?> getAiVideoAnalysis(
            @PathVariable String videoId,
            @RequestBody GeminiAnalysisDto requestDto) { // [수정] Map 대신 GeminiAnalysisDto로 받음

        try {
            // [수정] DTO의 Getter 메소드를 사용하여 안전하게 값을 가져옴
            Map<String, Object> aiVideoAnalysisResultMap = aiAnalysisService.analyzeVideoWithAi(
                    requestDto.getUserId(),
                    videoId,
                    requestDto.getTranscript()
            );

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
        } else {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                                 .body(Map.of("error", "AI 분석 중 예상치 못한 오류 발생: " + e.getMessage()));
        }
    }
}