package com.cm.astb.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.*;

// youtube-transcript-api 라이브러리 관련 import는 이제 완전히 제거되었습니다.

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
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

	// ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼ 공통 의존성 주입 ▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼▼

	private final ChannelService channelService;
	private final GeminiService geminiService;
	private final OAuthService oAuthService;
	private final ObjectMapper objectMapper;

	public GeminiAnalysisService(ChannelService channelService, GeminiService geminiService, OAuthService oAuthService,
			ObjectMapper objectMapper) {
		this.channelService = channelService;
		this.geminiService = geminiService;
		this.oAuthService = oAuthService;
		this.objectMapper = objectMapper;
	}

	// ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲ 공통 의존성 주입 ▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲▲

	// =================================================================================
	// = 채널 분석 관련 메소드 =
	// =================================================================================

	/**
	 * 지정된 채널의 공개 데이터를 종합하여 Gemini AI에게 분석을 요청합니다. (Public Method)
	 *
	 * @param userId         사용자 ID
	 * @param channelId      분석할 채널 ID
	 * @param myChannelTopic 벤치마킹을 위한 본인 채널의 주제
	 * @return Gemini AI의 분석 결과 (JSON 형식의 String)
	 * @throws GeneralSecurityException, IOException
	 */
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

	/**
	 * 채널 분석용 프롬프트를 생성하는 헬퍼 메소드. (Private Helper Method)
	 */
	private String createPromptForChannelAnalysis(ChannelListResponse channelInfoResponse, List<Video> latestVideos,
			List<Video> popularVideos, String myChannelTopic) {
		if (channelInfoResponse == null || channelInfoResponse.getItems() == null
				|| channelInfoResponse.getItems().isEmpty()) {
			return "분석할 채널 정보가 없습니다.";
		}

		Channel channel = channelInfoResponse.getItems().get(0);
		StringBuilder prompt = new StringBuilder();

		prompt.append("너는 최고의 유튜브 채널 데이터 분석 전문가야.\n");
		prompt.append("아래는 '").append(channel.getSnippet().getTitle())
				.append("' 채널의 공개된 데이터야. 이 데이터를 분석해서 조언을 해줘.\n\n");

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
		prompt.append("2. 내 채널의 주제는 '").append(myChannelTopic)
				.append("'이야. 이 채널의 성공 전략을 벤치마킹해서 내 채널에 적용할 수 있는 구체적인 액션 아이템 3가지를 제안해줘.\n");
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
	// = 영상 분석 관련 메소드 =
	// =================================================================================

	/**
	 * 지정된 유튜브 동영상의 정보와 스크립트를 바탕으로 Gemini AI에게 '콘텐츠 중심 분석'을 요청합니다. (Public Method)
	 */
	public Map<String, Object> analyzeVideoWithAi(String userId, String videoId, String transcript)
			throws GeneralSecurityException, IOException {

		logger.info("Starting Content-Centric AI analysis for video: {}", videoId);

		Credential credential = oAuthService.getCredential(userId);
		YouTube youTube = oAuthService.getYouTubeService(credential);
		YouTube.Videos.List videoRequest = youTube.videos()
				.list(Arrays.asList("snippet", "statistics", "contentDetails"));
		videoRequest.setId(Arrays.asList(videoId));
		VideoListResponse videoResponse = videoRequest.execute();

		if (videoResponse == null || videoResponse.getItems() == null || videoResponse.getItems().isEmpty()) {
			logger.warn("Video info not found for ID: {}", videoId);
			throw new IllegalArgumentException("동영상 정보를 찾을 수 없습니다: " + videoId);
		}
		Video videoInfo = videoResponse.getItems().get(0);
		logger.info("Successfully fetched video info for ID: {}", videoId);

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

		prompt.append(
				"당신은 미디어 콘텐츠를 객관적으로 분석하고, 그 구조와 핵심 메시지를 파악하는 전문 미디어 분석가입니다. 성공 여부에 대한 가치 판단 없이, 주어진 영상의 내용을 있는 그대로 분해하고 요약하는 임무를 수행합니다.\n\n");

		prompt.append("### 제공된 영상 데이터\n");
		prompt.append("- 제목: ").append(video.getSnippet().getTitle()).append("\n");
		prompt.append("- 설명: \"\"\"").append(video.getSnippet().getDescription()).append("\"\"\"\n");
		prompt.append("- 스크립트: \"\"\"").append(transcript).append("\"\"\"\n");
		prompt.append("- 채널명: ").append(video.getSnippet().getChannelTitle()).append("\n");
		prompt.append("- 게시일: ").append(video.getSnippet().getPublishedAt()).append("\n");
		if (video.getSnippet().getTags() != null && !video.getSnippet().getTags().isEmpty()) {
			prompt.append("- 태그: ").append(String.join(", ", video.getSnippet().getTags())).append("\n");
		}
		prompt.append("- 카테고리 ID: ").append(video.getSnippet().getCategoryId()).append("\n");

		if (video.getStatistics() != null) {
			prompt.append("- 조회수: ").append(video.getStatistics().getViewCount()).append("\n");
			prompt.append("- 좋아요 수: ")
					.append(video.getStatistics().getLikeCount() != null ? video.getStatistics().getLikeCount() : "N/A")
					.append("\n");
			prompt.append("- 댓글 수: ").append(
					video.getStatistics().getCommentCount() != null ? video.getStatistics().getCommentCount() : "N/A")
					.append("\n");
		}

		if (video.getContentDetails() != null && video.getContentDetails().getDuration() != null) {
			prompt.append("- 영상 길이: ").append(video.getContentDetails().getDuration()).append("\n\n");
		}

		prompt.append("--- \n\n");

		prompt.append("### 콘텐츠 중심 분석 요청\n");
		prompt.append("제공된 데이터를 바탕으로 다음 객관적인 분석을 수행해주세요. 답변은 반드시 아래 명시된 JSON 형식으로만 생성해야 하며, 다른 어떤 설명도 추가하지 마세요.\n\n");
		prompt.append("1.  **콘텐츠 프로필:** 영상의 핵심 주제, 주요 메시지, 그리고 타겟 시청자를 요약해주세요.\n");
		prompt.append("2.  **서사 구조:** 영상의 논리적 또는 이야기 구조를 설명해주세요. (예: 도입, 전개, 결론)\n");
		prompt.append("3.  **핵심 정보:** 시청자가 이 영상을 통해 얻게 될 가장 중요한 정보나 팁 3가지를 추출해주세요.\n");
		prompt.append("4.  **주요 키워드:** 영상 전반에 걸쳐 논의되는 주요 키워드와 컨셉을 식별해주세요.\n\n");

		prompt.append("```json\n");
		prompt.append("{\n");
		prompt.append("  \"contentProfile\": {\n");
		prompt.append("    \"coreSummary\": \"(영상의 핵심 주제와 메시지를 1~2 문장으로 요약)\",\n");
		prompt.append("    \"keyTheme\": \"(영상을 관통하는 주요 테마나 아이디어)\",\n");
		prompt.append("    \"assumedTargetAudience\": \"(이 콘텐츠가 어떤 시청자를 대상으로 하는지에 대한 객관적인 추정)\"\n");
		prompt.append("  },\n");
		prompt.append("  \"narrativeStructure\": {\n");
		prompt.append("    \"introduction\": \"(시청자의 관심과 문제를 어떻게 이끌어내는지에 대한 설명)\",\n");
		prompt.append("    \"development\": \"(본론에서 정보를 전달하거나 스토리를 발전시키는 방식)\",\n");
		prompt.append("    \"conclusion\": \"(영상의 핵심 메시지를 요약하거나 다음 행동을 유도하는 방식)\"\n");
		prompt.append("  },\n");
		prompt.append("  \"keyTakeaways\": [\n");
		prompt.append("    \"(시청자가 얻게 될 핵심 정보/팁 1)\",\n");
		prompt.append("    \"(시청자가 얻게 될 핵심 정보/팁 2)\",\n");
		prompt.append("    \"(시청자가 얻게 될 핵심 정보/팁 3)\"\n");
		prompt.append("  ],\n");
		prompt.append("  \"mainKeywords\": [\n");
		prompt.append("    \"(주요 키워드 1)\",\n");
		prompt.append("    \"(주요 키워드 2)\",\n");
		prompt.append("    \"(주요 키워드 3)\",\n");
		prompt.append("    \"(주요 키워드 4)\"\n");
		prompt.append("  ]\n");
		prompt.append("}\n");
		prompt.append("```\n");

		return prompt.toString();
	}

	// =================================================================================
	// = 공용 프라이빗 헬퍼 메소드 =
	// =================================================================================

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