package com.cm.astb.service;

// 캐싱 관련 어노테이션 import
import org.springframework.cache.annotation.Cacheable;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

@Service
public class GeminiService {

    private final RestTemplate restTemplate;
    private final String apiUrl;
    private final String apiKey;
    private final ObjectMapper objectMapper;

    /**
     * GeminiService 생성자.
     * RestTemplate과 application.properties의 설정 값을 주입받습니다.
     * @param restTemplate HTTP 통신을 위한 도구
     * @param apiUrl Gemini API 요청 URL
     * @param apiKey Gemini API 인증 키
     */
    public GeminiService(RestTemplate restTemplate,
                         @Value("${gemini.api.url}") String apiUrl,
                         @Value("${gemini.api.key}") String apiKey,
                         ObjectMapper objectMapper) {
        this.restTemplate = restTemplate;
        this.apiUrl = apiUrl;
        this.apiKey = apiKey;
        this.objectMapper = objectMapper;
    }

    /**
     * 프롬프트를 받아서 Gemini API에 분석을 요청하고 응답을 문자열로 반환합니다.
     * @param prompt AI에게 보낼 질문(프롬프트)
     * @return Gemini API의 응답 결과 (JSON 형식의 문자열)
     */
    // 2. @Cacheable 어노테이션 추가
    @Cacheable(value = "geminiAnalysis", key = "#prompt")
    public String getAnalysisFromGemini(String prompt) {
        // 3. 캐싱 동작 확인을 위한 로그 추가
        System.out.println("--- 캐시 없음! Gemini API 직접 호출 ---");

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> textPart = new HashMap<>();
        textPart.put("text", prompt);

        Map<String, Object> content = new HashMap<>();
        content.put("parts", Collections.singletonList(textPart));

        Map<String, Object> requestBody = new HashMap<>();
        requestBody.put("contents", Collections.singletonList(content));

        HttpEntity<Map<String, Object>> requestEntity = new HttpEntity<>(requestBody, headers);

        String fullUrl = apiUrl + "?key=" + apiKey;

        try {
            // RestTemplate을 사용해 POST 요청을 보내고, 응답을 String으로 받음
            String rawJsonResponse = restTemplate.postForObject(fullUrl, requestEntity, String.class);

            // JSON 응답 파싱 및 실제 텍스트 추출
            JsonNode rootNode = objectMapper.readTree(rawJsonResponse);
            JsonNode candidatesNode = rootNode.path("candidates");

            if (candidatesNode.isArray() && candidatesNode.size() > 0) {
                JsonNode firstCandidate = candidatesNode.get(0);
                JsonNode contentNode = firstCandidate.path("content");
                JsonNode partsNode = contentNode.path("parts");

                if (partsNode.isArray() && partsNode.size() > 0) {
                    JsonNode firstPart = partsNode.get(0);
                    JsonNode textNode = firstPart.path("text");
                    if (textNode != null && textNode.isTextual()) {
                        return textNode.asText(); // 추출된 텍스트 반환
                    }
                }
            }

            // 예상치 못한 응답 형식일 경우 원본 JSON 또는 에러 메시지 반환
            return "Failed to parse AI response: " + rawJsonResponse;

        } catch (Exception e) {
            e.printStackTrace();
            return "Gemini API 호출 중 에러가 발생했습니다: " + e.getMessage();
        }
    }
}