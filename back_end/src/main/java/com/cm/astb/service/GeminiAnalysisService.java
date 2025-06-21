package com.cm.astb.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.Video;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.security.GeneralSecurityException;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

   public GeminiAnalysisService(ChannelService channelService, GeminiService geminiService,
         ObjectMapper objectMapper) {
      this.channelService = channelService;
      this.geminiService = geminiService;
      this.objectMapper = objectMapper;
   }

   // =================================================================================
   // = 채널 분석 관련 메소드 (기존과 동일) =
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

		// Python 스크립트를 호출하여 스크립트 내용을 가져옵니다.
		String transcript = fetchTranscriptWithPython(videoId); 
		if (transcript.isEmpty()) {
			logger.warn("No suitable transcript found for video ID: {}. Analysis will proceed without script.", videoId);
		} else {
            logger.info("Successfully fetched transcript for video ID: {}. Transcript length: {} characters.", videoId, transcript.length());
        }

		// AI 프롬프트를 생성합니다.
		String prompt = createPromptForContentAnalysis(videoInfo, transcript);
		logger.info("Generated Prompt for Gemini (Content-Centric Video Analysis): \n{}", prompt);

		// Gemini AI에 분석을 요청하고 응답을 받습니다.
		String aiResponseRawString = geminiService.getAnalysisFromGemini(prompt);
		logger.info("Received AI Response Raw String: {}", aiResponseRawString);
		JsonNode aiAnalysisJsonNode = parseAiResponse(aiResponseRawString);

		// 프론트엔드로 보낼 응답 맵을 구성합니다.
		Map<String, Object> responseMap = new LinkedHashMap<>();
		responseMap.put("videoInfo", videoInfo);
		responseMap.put("aiAnalysis", aiAnalysisJsonNode);
		// [추가] 스크립트 원본 내용을 응답 맵에 추가합니다.
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

		// NOTE: 이 JSON 스키마는 프론트엔드의 aiAnalysisResults 렌더링 부분과 일치해야 합니다.
		// 현재 프론트엔드는 contentSummary, keyTakeaways, mainKeywords 필드를 예상하고 있습니다.
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
	
	// yt-dlp 대신 아래 메소드를 사용하여 Python 스크립트를 호출합니다.
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
}
