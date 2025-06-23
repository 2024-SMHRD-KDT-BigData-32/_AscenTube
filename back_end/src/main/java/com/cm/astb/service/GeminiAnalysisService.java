package com.cm.astb.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode; // 추가 임포트
import com.fasterxml.jackson.databind.node.ObjectNode; // 추가 임포트
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.Video;
import com.cm.astb.entity.Comment; // Comment 엔티티 임포트
import com.cm.astb.entity.YouTubeVideo;
import com.cm.astb.repository.CommentRepository; // CommentRepository 임포트
import com.cm.astb.repository.YouTubeVideoRepository; // YouTubeVideoRepository 임포트
import com.cm.astb.dto.CommentDetailDto; // CommentDetailDto 임포트

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.time.LocalDate; // LocalDate 임포트 추가
import java.time.LocalDateTime; // LocalDateTime 임포트 추가
import java.util.ArrayList; // ArrayList 임포트 추가
import java.util.Collections; // Collections 임포트 추가
import java.util.Comparator; // Comparator 임포트 추가
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional; // Optional 임포트 추가
import java.util.concurrent.TimeUnit;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

/**
 * AI 기반 분석 기능을 전담하는 서비스 클래스. 유튜브 공개 데이터 조회는 ChannelService에 위임하고, AI 호출은
 * GeminiService에 위임합니다.
 */
@Service
public class GeminiAnalysisService {

    private static final Logger logger = LoggerFactory.getLogger(GeminiAnalysisService.class);

    private final ChannelService channelService;
    private final GeminiService geminiService;
    private final ObjectMapper objectMapper;
    private final CommentRepository commentRepository; // 댓글 데이터 조회를 위해 추가
    private final YouTubeVideoRepository youTubeVideoRepository; // 비디오 정보 조회를 위해 추가

    public GeminiAnalysisService(ChannelService channelService, GeminiService geminiService,
                                 ObjectMapper objectMapper, CommentRepository commentRepository,
                                 YouTubeVideoRepository youTubeVideoRepository) { // 생성자 수정
        this.channelService = channelService;
        this.geminiService = geminiService;
        this.objectMapper = objectMapper;
        this.commentRepository = commentRepository; // 주입
        this.youTubeVideoRepository = youTubeVideoRepository; // 주입
    }

    // =================================================================================
    // = 채널 분석 관련 메소드 =
    // =================================================================================

    public String analyzeChannelWithAi(String userId, String channelId, String myChannelTopic)
            throws GeneralSecurityException, IOException {

        logger.info("Starting public data AI analysis for channel: {}", channelId);

        ChannelListResponse channelInfoResponse = channelService.getChannelInfoById(userId, channelId);
        List<Video> latestVideos = channelService.getLatestVideosFromChannel(userId, channelInfoResponse);
        List<Video> popularVideos = channelService.getPopularVideosFromChannel(userId,
                channelInfoResponse.getItems().get(0).getId());

        String prompt = createPromptForChannelAnalysis(channelInfoResponse, latestVideos, popularVideos,
                myChannelTopic);
        logger.info("Generated Prompt for Gemini (Channel Analysis): \n{}", prompt);

        String aiResponse = geminiService.getAnalysisFromGemini(prompt);
        logger.info("Received AI Response (Channel Analysis): {}", aiResponse);

        return aiResponse;
    }

    private String createPromptForChannelAnalysis(ChannelListResponse channelInfoResponse, List<Video> latestVideos,
            List<Video> popularVideos, String myChannelTopic) {
        if (channelInfoResponse == null || channelInfoResponse.getItems() == null
                || channelInfoResponse.getItems().isEmpty()) {
            return "분석할 채널 정보가 없습니다.";
        }
        Channel channel = channelInfoResponse.getItems().get(0);
        StringBuilder prompt = new StringBuilder();
        prompt.append("너는 최고의 유튜브 채널 데이터 분석 전문가야.\n");
        prompt.append("아래는 '").append(channel.getSnippet().getTitle()).append("' 채널의 공개된 데이터야. 이 데이터를 분석해서 조언을 해줘.\n\n");
        prompt.append("### 채널 기본 정보\n");
        prompt.append("- 구독자 수: ").append(channel.getStatistics().getSubscriberCount()).append("명\n");
        prompt.append("- 총 조회수: ").append(channel.getStatistics().getViewCount()).append("회\n");
        prompt.append("- 총 영상 수: ").append(channel.getStatistics().getVideoCount()).append("개\n");
        prompt.append("- 채널 설명: ").append(channel.getSnippet().getDescription()).append("\n\n");
        prompt.append("### 최신 업로드 영상 (최대 5개)\n");
        if (latestVideos != null && !latestVideos.isEmpty()) {
            latestVideos.forEach(video -> {
                prompt.append("- 제목: ").append(video.getSnippet().getTitle()).append("\n");
            });
        } else {
            prompt.append("- 최신 영상 정보가 없습니다.\n");
        }
        prompt.append("\n");
        prompt.append("### 인기 업로드 영상 (최대 5개)\n");
        if (popularVideos != null && !popularVideos.isEmpty()) {
            popularVideos.forEach(video -> {
                prompt.append("- 제목: ").append(video.getSnippet().getTitle()).append(" (조회수: ")
                        .append(video.getStatistics() != null ? video.getStatistics().getViewCount() : "N/A")
                        .append(")\n");
            });
        } else {
            prompt.append("- 인기 영상 정보가 없습니다.\n");
        }
        prompt.append("\n");
        prompt.append("--- \n\n");
        prompt.append("### 분석 요청 사항\n");
        prompt.append("1. 위 공개 데이터를 바탕으로, 이 채널의 콘텐츠 특징과 성공 전략을 추론해서 요약해줘.\n");
        prompt.append("2. 내 채널의 주제는 '").append(myChannelTopic).append("'이야. 이 채널의 성공 전략을 벤치마킹해서 내 채널에 적용할 수 있는 구체적인 액션 아이템 3가지를 제안해줘.\n");
        prompt.append("3. 답변은 반드시 아래와 같은 JSON 형식으로만 해줘. 다른 설명은 붙이지 마.\n\n");
        prompt.append("```json\n");
        prompt.append("{\n");
        prompt.append("  \"channelAnalysis\": {\n");
        prompt.append("    \"coreSummary\": \"(콘텐츠 전략 요약)\",\n");
        prompt.append("    \"successFactor\": \"(성공 요인 추론)\"\n");
        prompt.append("  },\n");
        prompt.append("  \"actionableStrategies\": [\n");
        prompt.append("    {\"strategy\": \"(전략 1)\", \"description\": \"(전략 1 상세 설명)\"},\n");
        prompt.append("    {\"strategy\": \"(전략 2)\", \"description\": \"(전략 2 상세 설명)\"},\n");
        prompt.append("    {\"strategy\": \"(전략 3)\", \"description\": \"(전략 3 상세 설명)\"}\n");
        prompt.append("  ]\n");
        prompt.append("}\n");
        prompt.append("```\n");
        return prompt.toString();
    }

    // =================================================================================
    // = 영상 분석 관련 메소드 (Python 스크립트 방식으로 수정됨) =
    // =================================================================================

    public Map<String, Object> analyzeVideoWithAi(String videoId)
            throws GeneralSecurityException, IOException, InterruptedException {

        logger.info("Starting Content-Centric AI analysis for video: {}", videoId);
            
        Video videoInfo = channelService.getVideoInfo(videoId);

        if (videoInfo == null) {
            logger.warn("Video info not found for ID: {}", videoId);
            throw new IllegalArgumentException("동영상 정보를 찾을 수 없습니다: " + videoId);
        }
        logger.info("Successfully fetched video info for ID: {}", videoId);

        String transcript = fetchTranscriptWithPython(videoId);
        if (transcript.isEmpty()) {
            logger.warn("No suitable transcript found for video ID: {}. Analysis will proceed without script.", videoId);
        } else {
            logger.info("Successfully fetched transcript for video ID: {}. Transcript length: {} characters.", videoId, transcript.length());
        }

        String prompt = createPromptForContentAnalysis(videoInfo, transcript);
        logger.info("Generated Prompt for Gemini (Content-Centric Video Analysis): \n{}", prompt);

        String aiResponseRawString = geminiService.getAnalysisFromGemini(prompt);
        logger.info("Received AI Response Raw String: {}", aiResponseRawString);
        JsonNode aiAnalysisJsonNode = parseAiResponse(aiResponseRawString);

        Map<String, Object> responseMap = new LinkedHashMap<>();
        responseMap.put("videoInfo", videoInfo);
        responseMap.put("aiAnalysis", aiAnalysisJsonNode);
        responseMap.put("fullTranscript", transcript);

        return responseMap;
    }

    private String createPromptForContentAnalysis(Video video, String transcript) {
        StringBuilder prompt = new StringBuilder();

        prompt.append(
                "당신은 주어진 텍스트의 핵심 내용을 사실에 기반하여 간결하게 요약하는 '텍스트 요약 전문 AI'입니다. " +
                "추측이나 예상을 배제하고, 제공된 '스크립트' 내용만을 바탕으로 답변을 생성하세요.\n\n");

        prompt.append("### 원본 데이터\n");
        prompt.append("- 제목: ").append(video.getSnippet().getTitle()).append("\n");
        if (transcript != null && !transcript.isEmpty()) {
            prompt.append("- 스크립트: \"\"\"").append(transcript).append("\"\"\"\n\n");
        } else {
            prompt.append("- 스크립트: (사용 가능한 스크립트 없음)\n\n");
            prompt.append("스크립트가 없으므로, 제목과 영상 설명만으로 분석합니다.\n");
            prompt.append("- 설명: \"\"\"").append(video.getSnippet().getDescription()).append("\"\"\"\n\n");
        }

        prompt.append("--- \n\n");

        prompt.append("### 분석 요청\n");
        prompt.append("제공된 '스크립트' 내용을 바탕으로 다음 항목들을 채워주세요. 각 항목은 반드시 스크립트에 언급된 내용만을 기반으로 사실적으로 작성해야 합니다. 답변은 반드시 아래 명시된 JSON 형식으로만 생성해야 합니다.\n\n");

        prompt.append("```json\n");
        prompt.append("{\n");
        prompt.append("  \"contentSummary\": {\n");
        prompt.append("    \"mainTopic\": \"(스크립트의 핵심 주제)\",\n");
        prompt.append("    \"summaryPoints\": [\n");
        prompt.append("      \"(스크립트의 첫 번째 핵심 내용 요약)\",\n");
        prompt.append("      \"(스크립트의 두 번째 핵심 내용 요약)\",\n");
        prompt.append("      \"(스크립트의 세 번째 핵심 내용 요약)\"\n");
        prompt.append("    ]\n");
        prompt.append("  },\n");
        prompt.append("  \"keyTakeaways\": [\n");
        prompt.append("    \"(시청자가 얻게 될 사실 정보 또는 주장 1)\",\n");
        prompt.append("    \"(시청자가 얻게 될 사실 정보 또는 주장 2)\",\n");
        prompt.append("    \"(시청자가 얻게 될 사실 정보 또는 주장 3)\"\n");
        prompt.append("  ],\n");
        prompt.append("  \"mainKeywords\": [\n");
        prompt.append("    \"(스크립트에서 가장 많이 언급되는 주요 키워드 1)\",\n");
        prompt.append("    \"(주요 키워드 2)\",\n");
        prompt.append("    \"(주요 키워드 3)\",\n");
        prompt.append("    \"(주요 키워드 4)\"\n");
        prompt.append("  ]\n");
        prompt.append("}\n");
        prompt.append("```\n");

        return prompt.toString();
    }
    
    private String fetchTranscriptWithPython(String videoId) throws IOException, InterruptedException {
        logger.info("Python 스크립트를 사용하여 비디오 ID의 캡션 가져오기 시작: {}", videoId);
        
        String projectPath = System.getProperty("user.dir"); // 현재 프로젝트의 루트 경로를 가져옵니다.
        String separator = System.getProperty("file.separator"); // 운영체제에 맞는 파일 구분자(/ 또는 \\)를 가져옵니다.
        
        // 스크린샷에서 확인된 파일 이름 'Youtube_Transcript_Api.py'를 반영합니다.
        String scriptFileName = "Youtube_Transcript_Api.py";
        String scriptPath = projectPath + separator + "tools" + separator + scriptFileName;

        logger.info("파이썬 스크립트 경로: {}", scriptPath);

        // ProcessBuilder를 사용하여 외부 파이썬 스크립트를 실행합니다.
        ProcessBuilder processBuilder = new ProcessBuilder(
                "python",     // 파이썬 실행 명령어
                scriptPath,   // 실행할 파이썬 스크립트 파일의 전체 경로
                videoId       // 파이썬 스크립트에 전달할 인자 (유튜브 영상 ID)
        );
        
        // 자식 프로세스(파이썬 스크립트)의 표준 에러(stderr)와 표준 출력(stdout)을
        // 부모 프로세스(Java 애플리케이션)의 표준 출력으로 합쳐서 읽을 수 있게 합니다.
        // 이를 통해 파이썬 스크립트의 에러 메시지도 Java에서 읽을 수 있습니다.
        processBuilder.redirectErrorStream(true);
        Process process = processBuilder.start(); // 파이썬 스크립트 실행

        // 파이썬 스크립트의 표준 출력을 읽어옵니다 (이것이 바로 자막 내용입니다).
        String transcript;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "UTF-8"))) {
            // 스크립트에서 출력된 모든 라인을 읽어서 하나의 문자열로 합칩니다.
            transcript = reader.lines().collect(Collectors.joining("\n"));
        }

        // 파이썬 스크립트 프로세스가 완료될 때까지 기다립니다.
        // 최대 대기 시간을 설정하여 무한정 기다리는 것을 방지할 수 있습니다.
        boolean finished = process.waitFor(60, TimeUnit.SECONDS); // 60초 대기
        
        if (!finished) {
            process.destroy(); // 시간 초과 시 프로세스 강제 종료
            logger.error("파이썬 스크립트 실행 시간 초과: {}", videoId);
            return ""; // 또는 예외 처리: throw new IOException("Python script execution timed out");
        }
        
        // 파이썬 스크립트의 종료 코드를 확인하여 성공 여부를 판단할 수도 있습니다.
        int exitCode = process.exitValue();
        if (exitCode != 0) {
            logger.error("파이썬 스크립트가 오류와 함께 종료되었습니다. 종료 코드: {}", exitCode);
            // 에러 스트림을 통해 파이썬 스크립트의 상세 에러 메시지를 로그할 수 있습니다.
            // (processBuilder.redirectErrorStream(true) 설정 시)
        }

        logger.info("파이썬 스크립트 실행 완료 (비디오 ID: {}). 종료 코드: {}", videoId, exitCode);
        
        // 이 방식은 VTT 파싱이 필요 없으므로 cleanVtt 호출을 하지 않습니다.
        // 파이썬에서 합쳐서 넘겨준 스크립트 문자열의 앞뒤 공백을 제거하여 반환합니다.
        return transcript.trim();
    }

    /**
     * AI 응답 문자열에서 JSON 블록을 추출하고 파싱합니다.
     * AI 응답이 '```json' 과 '```'으로 감싸져 있을 것으로 예상합니다.
     * @param rawResponse AI 원본 응답 문자열
     * @return 파싱된 JsonNode 객체
     * @throws IOException JSON 파싱 중 오류 발생 시
     */
    private JsonNode parseAiResponse(String rawResponse) throws IOException {
        String cleanJsonString = rawResponse;
        
        // '```json' 과 '```' 사이에 있는 JSON 블록을 정규식을 사용하여 추출합니다.
        // Pattern.DOTALL 플래그는 '.'이 개행 문자도 포함하도록 합니다.
        Pattern pattern = Pattern.compile("```json\\s*([\\s\\S]*?)\\s*```");
        Matcher matcher = pattern.matcher(rawResponse);

        if (matcher.find()) {
            cleanJsonString = matcher.group(1).trim(); // 첫 번째 그룹(JSON 내용)을 추출하고 공백 제거
            logger.debug("Extracted JSON string from AI response:\n{}", cleanJsonString);
        } else {
            logger.warn("AI response did not contain expected markdown JSON block. Attempting to parse raw string.");
            // 마크다운 블록이 없으면, 전체 응답을 JSON으로 파싱 시도 (가장 최후의 수단)
            cleanJsonString = rawResponse.trim();
        }

        try {
            // ObjectMapper를 사용하여 JSON 문자열을 JsonNode로 파싱합니다.
            return objectMapper.readTree(cleanJsonString);
        } catch (Exception e) {
            logger.error("AI 분석 결과 JSON 파싱 실패! 원본 응답: [{}], 파싱 시도 문자열: [{}]", rawResponse, cleanJsonString, e);
            throw new IOException("AI 분석 결과 파싱 실패: " + e.getMessage() + ". 파싱 시도 문자열: " + cleanJsonString, e);
        }
    }
 // ... (Part 1의 마지막 부분에서 이어서)

    // =================================================================================
    // ✨✨✨ 댓글 AI 분석 관련 메소드 추가 ✨✨✨
    // =================================================================================

    /**
     * 채널의 댓글 데이터를 Gemini AI로 분석하여 대표 댓글과 종합 피드백을 생성합니다.
     * @param channelId 분석할 채널 ID
     * @param period 분석 기간 (예: "quarter")
     * @return AI 분석 결과 (대표 댓글 리스트, 종합 피드백)
     * @throws IOException Gemini 통신 또는 JSON 파싱 오류 시
     */
    public Map<String, Object> analyzeChannelCommentsWithAi(String channelId, String period) throws IOException {
        logger.info("Starting AI-based comment analysis for channel: {} with period: {}", channelId, period);

        LocalDate endDate = LocalDate.now();
        LocalDate startDate = getStartDateFromPeriod(endDate, period);

        // 해당 기간의 모든 비디오 ID 조회
        List<Long> videoIds = youTubeVideoRepository.findByChannelId(channelId).stream()
                .map(YouTubeVideo::getVideoId)
                .collect(Collectors.toList());

        if (videoIds.isEmpty()) {
            logger.warn("No videos found for channelId: {}. Cannot perform AI comment analysis.", channelId);
            return Map.of(
                "aiRepresentativeComments", Collections.emptyList(),
                "aiOverallFeedback", "채널에 동영상이 없어 댓글 AI 분석을 수행할 수 없습니다."
            );
        }

        // 해당 기간의 모든 댓글을 가져와 AI 분석용 샘플을 만듭니다.
        // 너무 많은 댓글은 AI 토큰 제한을 초과할 수 있으므로, 최신 댓글 일부를 사용합니다.
        List<Comment> allCommentsInPeriod = commentRepository.findByVideoIdInAndCommentWriteAtBetweenAndIsDeleted(
            videoIds, startDate.atStartOfDay(), endDate.atStartOfDay().plusDays(1).minusNanos(1), "N"
        );

        if (allCommentsInPeriod.isEmpty()) {
            logger.warn("No comments found for channelId: {} within period {}. Cannot perform AI comment analysis.", channelId, period);
            return Map.of(
                "aiRepresentativeComments", Collections.emptyList(),
                "aiOverallFeedback", "해당 기간에 댓글이 충분하지 않아 AI 분석을 수행할 수 없습니다."
            );
        }

        // AI 분석을 위한 댓글 샘플링 (예: 최신 댓글 50개)
        List<Comment> commentsForAi = allCommentsInPeriod.stream()
            .sorted(Comparator.comparing(Comment::getCommentWriteAt, Comparator.reverseOrder())) // 최신순 정렬
            .limit(50) // 50개로 제한
            .collect(Collectors.toList());
        
        logger.info("Sending {} comments to Gemini for analysis for channel: {}", commentsForAi.size(), channelId);

        String prompt = createPromptForCommentAnalysis(channelId, commentsForAi);
        logger.debug("Generated Prompt for Gemini (Comment Analysis): \n{}", prompt);

        String aiResponseRawString = geminiService.getAnalysisFromGemini(prompt);
        logger.info("Received AI Response (Comment Analysis): {}", aiResponseRawString);

        // AI 응답 파싱
        JsonNode aiAnalysisJsonNode = parseAiResponse(aiResponseRawString);

        List<CommentDetailDto> aiRepresentativeComments = new ArrayList<>();
        String aiOverallFeedback = "AI 분석 결과가 없습니다.";

        if (aiAnalysisJsonNode.has("representativeComments") && aiAnalysisJsonNode.get("representativeComments").isArray()) {
            ArrayNode commentsNode = (ArrayNode) aiAnalysisJsonNode.get("representativeComments");
            for (JsonNode node : commentsNode) {
                if (node.isObject()) {
                    CommentDetailDto dto = CommentDetailDto.builder()
                        .commentContent(node.has("text") ? node.get("text").asText() : null)
                        .sentimentType(node.has("sentiment") ? node.get("sentiment").asText().toUpperCase() : null)
                        .speechAct(node.has("type") ? node.get("type").asText().toUpperCase() : null)
                        // videoKey, videoTitle, commentId 등은 AI가 생성하기 어려우므로 null 또는 기본값
                        .build();
                    aiRepresentativeComments.add(dto);
                }
            }
        }

        if (aiAnalysisJsonNode.has("overallFeedback") && aiAnalysisJsonNode.get("overallFeedback").isTextual()) {
            aiOverallFeedback = aiAnalysisJsonNode.get("overallFeedback").asText();
        }

        return Map.of(
            "aiRepresentativeComments", aiRepresentativeComments,
            "aiOverallFeedback", aiOverallFeedback
        );
    }

    /**
     * Gemini AI에 전달할 댓글 분석 프롬프트를 생성합니다.
     * @param channelId 채널 ID
     * @param comments 분석할 댓글 리스트
     * @return 생성된 프롬프트 문자열
     */
    private String createPromptForCommentAnalysis(String channelId, List<Comment> comments) {
        StringBuilder prompt = new StringBuilder();
        prompt.append("당신은 유튜브 채널 댓글 분석 전문 AI입니다. 주어진 댓글들을 분석하여 채널 운영에 도움이 되는 통찰을 제공해주세요.\n\n");
        prompt.append("### 분석 대상 댓글 목록 (총 ").append(comments.size()).append("개)\n");
        prompt.append("---START_COMMENTS---\n");
        comments.forEach(comment -> {
            prompt.append("- ").append(comment.getCommentContent()).append("\n");
        });
        prompt.append("---END_COMMENTS---\n\n");
        prompt.append("--- \n\n");
        prompt.append("### 분석 요청 사항\n");
        prompt.append("1. 위 댓글 목록에서 채널의 전반적인 분위기와 시청자들의 주요 관심사를 나타내는 **가장 대표적인 댓글 3~4개**를 선정해줘. 각 댓글에 대해 원문과 함께 해당 댓글의 감성(긍정/중립/부정)과 화행(칭찬/비판/정보제공/질문/감정표현/요청/기타 중 하나)을 추론해서 제공해줘.\n");
        prompt.append("2. 위 댓글들을 종합적으로 분석하여 채널의 시청자들이 채널에 대해 어떤 의견을 가지고 있는지, 채널의 강점과 개선점은 무엇인지에 대한 **종합적인 피드백과 조언**을 2~3 문단으로 요약해줘.\n");
        prompt.append("3. 답변은 반드시 아래와 같은 JSON 형식으로만 해줘. 다른 설명이나 추가 문구는 일절 붙이지 마.\n\n");
        prompt.append("```json\n");
        prompt.append("{\n");
        prompt.append("  \"representativeComments\": [\n");
        prompt.append("    {\n");
        prompt.append("      \"text\": \"(대표 댓글 내용 1)\",\n");
        prompt.append("      \"sentiment\": \"(POSITIVE/NEUTRAL/NEGATIVE 중 하나)\",\n");
        prompt.append("      \"type\": \"(PRAISE/CRITICISM/INFO/QUESTION/EMOTION/REQUEST/ETC 중 하나)\"\n");
        prompt.append("    },\n");
        prompt.append("    {\n");
        prompt.append("      \"text\": \"(대표 댓글 내용 2)\",\n");
        prompt.append("      \"sentiment\": \"(POSITIVE/NEUTRAL/NEGATIVE 중 하나)\",\n");
        prompt.append("      \"type\": \"(PRAISE/CRITICISM/INFO/QUESTION/EMOTION/REQUEST/ETC 중 하나)\"\n");
        prompt.append("    }\n");
        // ... (3-4개 댓글에 대한 스키마)
        prompt.append("  ],\n");
        prompt.append("  \"overallFeedback\": \"(채널의 전반적인 댓글 분위기와 개선점에 대한 종합 피드백)\"\n");
        prompt.append("}\n");
        prompt.append("```\n");
        return prompt.toString();
    }

    // =================================================================================
    // = 헬퍼 메소드 (기간 계산, 비율 계산, CommentDetailDto 매핑) =
    // =================================================================================
    // 이 헬퍼 메소드들은 기존 CommentAnalysisService에 있었던 유용한 기능들을 여기에 옮긴 것입니다.
    // 만약 해당 기능들이 CommentAnalysisService에 여전히 필요하다면 양쪽에 유지하거나,
    // 필요에 따라 별도의 유틸리티 클래스로 분리하는 것을 고려할 수 있습니다.

    private LocalDate getStartDateFromPeriod(LocalDate endDate, String period) {
        switch (period.toLowerCase()) {
            case "quarter":
                return endDate.minusMonths(3);
            case "6month":
                return endDate.minusMonths(6);
            case "year":
            case "yearly": // 'yearly' 옵션 추가 (혹시 필요할까봐)
                return endDate.minusYears(1);
            case "month":
            case "monthly": // 'monthly' 옵션 추가
                return endDate.minusMonths(1);
            case "weekly": // 'weekly' 옵션 추가
                return endDate.minusWeeks(1);
            case "daily": // 'daily' 옵션 추가
                return endDate.minusDays(1);
            default:
                // 기본값은 'month'로 설정
                return endDate.minusMonths(1);
        }
    }

    // calculatePercentage는 현재 GeminiAnalysisService에서 직접 사용되지는 않지만,
    // 다른 곳에서 필요할 경우를 대비하여 유지하거나 제거할 수 있습니다.
    /*
    private Double calculatePercentage(Long count, Long total) {
        if (total == null || total == 0) {
            return 0.0;
        }
        return BigDecimal.valueOf(count)
                             .divide(BigDecimal.valueOf(total), 4, RoundingMode.HALF_UP)
                             .multiply(BigDecimal.valueOf(100))
                             .setScale(2, RoundingMode.HALF_UP)
                             .doubleValue();
    }
    */

    /**
     * Comment 엔티티를 CommentDetailDto로 매핑합니다.
     * 댓글 내용, 작성자, 좋아요 수 등 상세 정보를 포함합니다.
     * 이 메서드는 CommentDetailDto에 videoKey와 videoTitle을 추가하기 위해 YouTubeVideo 엔티티 조회에 의존합니다.
     * (N+1 쿼리 발생 가능성 있으므로 주의. 필요시 batch fetch 또는 join fetch 사용 고려)
     *
     * @param comment 매핑할 Comment 엔티티
     * @return CommentDetailDto
     */
    private CommentDetailDto mapCommentToDetailDto(Comment comment) {
        String videoKey = null;
        String videoTitle = null;
        // YouTubeVideoRepository.findById는 PK(Long)를 받으므로, comment.getVideoId()가 Long 타입이어야 함.
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
                .sentimentType(comment.getSentimentType() != null ? comment.getSentimentType().getDbValue() : null)
                .speechAct(comment.getSpeechAct() != null ? comment.getSpeechAct().getDbValue() : null)
                .build();
    }
}