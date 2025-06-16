package com.cm.astb.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.google.api.client.auth.oauth2.Credential;
import com.google.api.services.youtubeAnalytics.v2.YouTubeAnalytics;
import com.google.api.services.youtubeAnalytics.v2.model.QueryResponse;

@Service
public class YoutubeAnalyticsService {
	private final OAuthService oAuthService;

	public YoutubeAnalyticsService(OAuthService oAuthService) {
		this.oAuthService = oAuthService;
	}

	private static final Logger logger = LoggerFactory.getLogger(YoutubeAnalyticsService.class);

	private static final List<String> KNOWN_METRICS = Arrays.asList("views", "estimatedMinutesWatched",
			"subscribersGained", "averageViewDuration", "likes", "comments", "adImpressions", "viewerPercentage");

	/**
	 * 지정된 채널의 기본 Analytics 데이터를 가져오기.
	 *
	 * @param startDate 시작 날짜 (YYYY-MM-DD)
	 * @param endDate   종료 날짜 (YYYY-MM-DD)
	 * @param channelId 채널 ID (비워두면 인증된 사용자의 채널)
	 * @return ResultTable 객체 (Analytics 데이터 포함)
	 * @throws IOException
	 * @throws GeneralSecurityException
	 */

	public QueryResponse getChannelBasicAnalytics(String userId, String startDate, String endDate, String channelId)
			throws IOException, GeneralSecurityException {
		Credential credential = oAuthService.getCredential(userId);
		if (credential == null || credential.getAccessToken() == null) {
			throw new GeneralSecurityException("OAuth 인증이 필요합니다. /oauth/google/authorize 로 인증을 시작하세요.");
		}
		// 인증된 YouTubeAnalytics 서비스 객체 생성
		YouTubeAnalytics analytics = oAuthService.getYouTubeAnalyticsService(credential);

		// Analytics API 쿼리 빌드
		YouTubeAnalytics.Reports.Query request = analytics.reports().query();

		request.setIds("channel==" + (channelId != null && !channelId.isEmpty() ? channelId : "mine"));
		request.setStartDate(startDate);
		request.setEndDate(endDate);
		request.setMetrics("views,estimatedMinutesWatched,subscribersGained,averageViewDuration");
		request.setDimensions("day");
		request.setSort("day");

		return request.execute();	
	}

	/**
	 * Analytics API 응답에서 특정 메트릭의 데이터를 보기 좋게 파싱합니다.
	 *
	 * @param queryResponse Analytics API 응답 QueryResponse
	 * @param metricName    파싱할 측정항목 이름 (예: "views", "estimatedMinutesWatched")
	 * @return 날짜별 메트릭 값의 맵
	 */
	public Map<String, Map<String, Object>> parseAnalyticsResult(QueryResponse queryResponse) {
		if (queryResponse == null || queryResponse.getRows() == null || queryResponse.getColumnHeaders() == null) {
			logger.warn("No data or invalid response for parsing: queryResponse is null or empty.");
			return Collections.emptyMap();
		}

		logger.info("Parsing analytics result for all metrics dynamically.");
		List<String> columnNames = queryResponse.getColumnHeaders().stream().map(header -> header.getName())
				.collect(Collectors.toList());
		logger.info("Column Headers: {}", String.join(", ", columnNames));
		logger.info("Rows count: {}", queryResponse.getRows() != null ? queryResponse.getRows().size() : 0);

		if (queryResponse.getRows() == null || queryResponse.getRows().isEmpty()) {
			logger.warn("API returned no rows for the given query. Check channel data availability or date range.");
			return Collections.emptyMap();
		}

		List<Integer> dimensionIndices = new java.util.ArrayList<>();
		Map<String, Integer> metricIndices = new java.util.HashMap<>();

		for (int i = 0; i < columnNames.size(); i++) {
			String columnName = columnNames.get(i);
			if (KNOWN_METRICS.contains(columnName)) {
				metricIndices.put(columnName, i);
			} else {
				dimensionIndices.add(i);
			}
		}

		if (dimensionIndices.isEmpty()) {
			logger.error(
					"No dimension columns found in headers: {}. A report must have at least one dimension for parsing.",
					columnNames);
			return Collections.emptyMap();
		}
		if (metricIndices.isEmpty()) {
			logger.error("No metric columns found in headers: {}. A report must have at least one metric for parsing.",
					columnNames);
			return Collections.emptyMap();
		}

		// 각 행을 파싱하여 결과를 만듭니다.
		return queryResponse.getRows().stream().collect(Collectors.toMap(row -> {
			// 모든 차원 값을 조합하여 맵의 키를 생성합니다.
			StringBuilder keyBuilder = new StringBuilder();
			for (int idx : dimensionIndices) {
				if (keyBuilder.length() > 0) {
					keyBuilder.append(" | "); // 여러 차원을 구분하는 새로운 구분자
				}
				keyBuilder.append(String.valueOf(row.get(idx)));
			}
			return keyBuilder.toString();
		}, row -> {
			// 해당 행의 모든 측정항목을 맵으로 담습니다.
			Map<String, Object> metricsMap = new java.util.HashMap<>();
			for (Map.Entry<String, Integer> entry : metricIndices.entrySet()) {
				metricsMap.put(entry.getKey(), row.get(entry.getValue()));
			}
			return metricsMap;
		}));
	}

	public QueryResponse getViewsByCountry(String userId, String startDate, String endDate, String channelId)
			throws IOException, GeneralSecurityException {
		Credential credential = oAuthService.getCredential(userId);
		if (credential == null || credential.getAccessToken() == null) {
			throw new GeneralSecurityException("OAuth 인증이 필요합니다.");
		}

		YouTubeAnalytics analytics = oAuthService.getYouTubeAnalyticsService(credential);

		YouTubeAnalytics.Reports.Query request = analytics.reports().query();
		request.setIds("channel==" + (channelId != null && !channelId.isEmpty() ? channelId : "mine"));
		request.setStartDate(startDate);
		request.setEndDate(endDate);
		request.setMetrics("views");
		request.setDimensions("country");
		request.setSort("-views");

		return request.execute();
	}

	/**
	 * 유입 경로 유형별 조회수 데이터를 가져옵니다.
	 *
	 * @param startDate 시작 날짜 (YYYY-MM-DD)
	 * @param endDate   종료 날짜 (YYYY-MM-DD)
	 * @param channelId 채널 ID
	 * @return QueryResponse 객체
	 * @throws IOException, GeneralSecurityException
	 */

	public QueryResponse getTrafficSourceType(String userId, String startDate, String endDate, String channelId)
			throws IOException, GeneralSecurityException {
		Credential credential = oAuthService.getCredential(userId);
		if (credential == null || credential.getAccessToken() == null) {
			throw new GeneralSecurityException("OAuth 인증이 필요합니다.");
		}
		YouTubeAnalytics analytics = oAuthService.getYouTubeAnalyticsService(credential);

		YouTubeAnalytics.Reports.Query request = analytics.reports().query();
		request.setIds("channel==" + (channelId != null && !channelId.isEmpty() ? channelId : "mine"));
		request.setStartDate(startDate);
		request.setEndDate(endDate);
		request.setMetrics("views,estimatedMinutesWatched,averageViewDuration");
		request.setDimensions("insightPlaybackLocationType"); // 유입 경로 유형별 측정기준 //
		request.setFilters("continent==019");
		request.setSort("-views"); //
		request.setMaxResults(10);

		return request.execute();
	}

}
