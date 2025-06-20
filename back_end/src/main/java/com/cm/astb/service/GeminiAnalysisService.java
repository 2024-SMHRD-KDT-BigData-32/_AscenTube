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
	// = 영상 분석 관련 메소드 (yt-dlp 방식으로 수정됨) =
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

		String transcript = fetchTranscriptWithYtDlp(videoId);
		if (transcript.isEmpty()) {
			logger.warn("No suitable transcript found for video ID: {}. Analysis will proceed without script.", videoId);
		}

		String prompt = createPromptForContentAnalysis(videoInfo, transcript);
		logger.info("Generated Prompt for Gemini (Content-Centric Video Analysis): \n{}", prompt);

		String aiResponseRawString = geminiService.getAnalysisFromGemini(prompt);
		logger.info("Received AI Response Raw String: {}", aiResponseRawString);
		JsonNode aiAnalysisJsonNode = parseAiResponse(aiResponseRawString);

		Map<String, Object> responseMap = new LinkedHashMap<>();
		responseMap.put("videoInfo", videoInfo);
		responseMap.put("aiAnalysis", aiAnalysisJsonNode);

		return responseMap;
	}
	
	/**
	 * 영상 분석용('콘텐츠 중심 분석') 프롬프트를 한국어로 생성하는 헬퍼 메소드. (Private Helper Method)
	 */
	private String createPromptForContentAnalysis(Video video, String transcript) {
		StringBuilder prompt = new StringBuilder();

		// [수정] AI의 역할과 임무를 더 구체적으로 지시합니다.
		prompt.append("당신은 미디어 콘텐츠를 객관적으로 분석하고, 그 구조와 핵심 메시지를 파악하는 전문 미디어 분석가입니다. "
				+ "당신의 가장 중요한 임무는 아래에 제공된 '스크립트'의 내용을 깊이 있게 분석하여 영상의 실제 내용을 파악하는 것입니다. "
				+ "제목과 설명은 보조적인 정보로만 활용하세요.\n\n");

		prompt.append("### 제공된 영상 데이터\n");
		prompt.append("- 제목: ").append(video.getSnippet().getTitle()).append("\n");
		prompt.append("- 설명: \"\"\"").append(video.getSnippet().getDescription()).append("\"\"\"\n");

		if (transcript != null && !transcript.isEmpty()) {
			prompt.append("- 스크립트: \"\"\"").append(transcript).append("\"\"\"\n\n");
		} else {
			prompt.append("- 스크립트: (사용 가능한 스크립트 없음)\n\n");
		}

		// [수정] 다른 메타데이터 제공 부분을 제거하거나 주석 처리하여 AI가 스크립트에 더 집중하게 할 수도 있습니다.
		// (이 부분은 선택사항입니다. 우선은 그대로 두고 테스트해보세요.)
		/*
		 * prompt.append("- 채널명: ").append(video.getSnippet().getChannelTitle()).append(
		 * "\n");
		 * prompt.append("- 게시일: ").append(video.getSnippet().getPublishedAt()).append(
		 * "\n"); if (video.getSnippet().getTags() != null &&
		 * !video.getSnippet().getTags().isEmpty()) {
		 * prompt.append("- 태그: ").append(String.join(", ",
		 * video.getSnippet().getTags())).append("\n"); } ...
		 */

		prompt.append("--- \n\n");

		// [수정] 분석 요청 사항을 더 명확하게 변경합니다.
		prompt.append("### 콘텐츠 중심 분석 요청\n");
		prompt.append(
				"반드시 위 '스크립트' 내용을 기반으로 다음 객관적인 분석을 수행해주세요. 스크립트 내용이 없다면, 제목과 설명을 바탕으로 추론해주세요. 답변은 반드시 아래 명시된 JSON 형식으로만 생성해야 하며, 다른 어떤 설명도 추가하지 마세요.\n\n");
		prompt.append("1.  **콘텐츠 프로필:** 영상의 핵심 주제, 주요 메시지, 그리고 타겟 시청자를 요약해주세요.\n");
		prompt.append("2.  **서사 구조:** 영상의 논리적 또는 이야기 구조를 설명해주세요. (예: 도입, 전개, 결론)\n");
		prompt.append("3.  **핵심 정보:** 시청자가 이 영상을 통해 얻게 될 가장 중요한 정보나 팁 3가지를 추출해주세요.\n");
		prompt.append("4.  **주요 키워드:** 영상 전반에 걸쳐 논의되는 주요 키워드와 컨셉을 식별해주세요.\n\n");

		prompt.append("```json\n");
		prompt.append("{\n");
		prompt.append("  \"contentProfile\": {\n");
		prompt.append("    \"coreSummary\": \"(스크립트 기반의 핵심 주제와 메시지를 1~2 문장으로 요약)\",\n");
		prompt.append("    \"keyTheme\": \"(스크립트를 관통하는 주요 테마나 아이디어)\",\n");
		prompt.append("    \"assumedTargetAudience\": \"(스크립트의 내용과 어조를 바탕으로 추정한 타겟 시청자)\"\n");
		prompt.append("  },\n");
		prompt.append("  \"narrativeStructure\": {\n");
		prompt.append("    \"introduction\": \"(스크립트의 도입부에서 시청자의 관심과 문제를 어떻게 이끌어내는지에 대한 설명)\",\n");
		prompt.append("    \"development\": \"(스크립트의 본론에서 정보를 전달하거나 스토리를 발전시키는 방식)\",\n");
		prompt.append("    \"conclusion\": \"(스크립트의 결론부에서 핵심 메시지를 요약하거나 다음 행동을 유도하는 방식)\"\n");
		prompt.append("  },\n");
		prompt.append("  \"keyTakeaways\": [\n");
		prompt.append("    \"(스크립트에서 얻을 수 있는 핵심 정보/팁 1)\",\n");
		prompt.append("    \"(스크립트에서 얻을 수 있는 핵심 정보/팁 2)\",\n");
		prompt.append("    \"(스크립트에서 얻을 수 있는 핵심 정보/팁 3)\"\n");
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
	// =================================================================================
	// = 신규 헬퍼 메소드 (yt-dlp) =
	// =================================================================================
	
	/**
	 * [신규] yt-dlp를 사용하여 스크립트를 가져오는 헬퍼 메소드.
	 */
	private String fetchTranscriptWithYtDlp(String videoId) throws IOException, InterruptedException {
	    logger.info("Fetching captions for video ID using yt-dlp: {}", videoId);
	    
	    // [수정] 하드코딩된 절대 경로 대신, 프로젝트 기준 상대 경로를 동적으로 생성합니다.
	    String projectPath = System.getProperty("user.dir");
	    String separator = System.getProperty("file.separator");
	    String ytDlpPath = projectPath + separator + "tools" + separator + "yt-dlp.exe";

	    // 생성된 경로를 로그로 확인해봅니다.
	    logger.info("Relative path to yt-dlp: {}", ytDlpPath);


	    ProcessBuilder processBuilder = new ProcessBuilder(
	            ytDlpPath, // 수정된 경로 변수 사용
	            "--write-auto-sub",
	            "--sub-lang", "ko,en",
	            "--skip-download",
	            "-o", "-",
	            "https://www.youtube.com/watch?v=" + videoId
	    );
	    Process process = processBuilder.start();

	    String transcript;
	    try (BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream(), "UTF-8"))) {
	        transcript = reader.lines().collect(Collectors.joining("\n"));
	    }

	    String errorOutput;
	    try (BufferedReader errorReader = new BufferedReader(new InputStreamReader(process.getErrorStream(), "UTF-8"))) {
	        errorOutput = errorReader.lines().collect(Collectors.joining("\n"));
	    }

	    int exitCode = process.waitFor();
	    
	    if (exitCode != 0 || (transcript.isEmpty() && !errorOutput.isEmpty())) {
	        logger.error("yt-dlp process exited with code: {}. Error Output: {}", exitCode, errorOutput);
	    }
	    
	    return cleanVtt(transcript);
	}

	/**
	 * [신규] VTT 형식의 자막에서 타임스탬프 등을 제거하고 순수 텍스트만 추출합니다.
	 */
	private String cleanVtt(String vttContent) {
		if (vttContent == null || vttContent.isEmpty()) {
			return "";
		}
		StringBuilder cleanedText = new StringBuilder();
		Map<String, Boolean> linesMap = new LinkedHashMap<>();

		String[] lines = vttContent.split("\\r?\\n");
		for (String line : lines) {
			if (!line.trim().isEmpty() && !line.contains("-->") && !line.trim().equals("WEBVTT") && !line.matches("^\\d+$")) {
				linesMap.put(line.trim(), true);
			}
		}
		
		for (String key : linesMap.keySet()) {
			cleanedText.append(key).append(" ");
		}
		return cleanedText.toString().trim();
	}

	/**
	 * Gemini AI의 응답(JSON 문자열)에서 마크다운 코드 블록을 제거하고 파싱합니다.
	 */
	private JsonNode parseAiResponse(String rawResponse) throws IOException {
		String cleanJsonString = rawResponse;
		int jsonStartIndex = cleanJsonString.indexOf("```json");
		int jsonEndIndex = cleanJsonString.lastIndexOf("```");
		if (jsonStartIndex != -1 && jsonEndIndex != -1 && jsonStartIndex < jsonEndIndex) {
			cleanJsonString = cleanJsonString.substring(jsonStartIndex + "```json".length(), jsonEndIndex).trim();
		} else {
			logger.warn("AI response did not contain expected markdown JSON block. Attempting to parse raw string.");
		}
		try {
			return objectMapper.readTree(cleanJsonString);
		} catch (Exception e) {
			logger.error("Failed to parse AI response JSON string: {}", cleanJsonString, e);
			throw new IOException("AI 분석 결과 파싱 실패: " + e.getMessage(), e);
		}
	}
}