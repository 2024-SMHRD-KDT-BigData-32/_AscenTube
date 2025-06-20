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
import com.google.api.services.youtube.model.ChannelListResponse;
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
		YouTubeAnalytics analytics = oAuthService.getYouTubeAnalyticsService(credential);

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

	public QueryResponse getAudienceStats(String userId, String startDate, String endDate, String youTubeVideoKey) throws GeneralSecurityException, IOException {
		Credential credential = oAuthService.getCredential(userId);
		if (credential == null || credential.getAccessToken() == null) {
			throw new GeneralSecurityException("OAuth 인증이 필요합니다.");
		}
		YouTubeAnalytics analytics = oAuthService.getYouTubeAnalyticsService(credential);

		YouTubeAnalytics.Reports.Query request = analytics.reports().query();
        request.setIds("channel==" + getChannelIdForAnalytics(userId, null)); // 채널 ID는 인증된 사용자 채널 또는 특정 채널
        request.setStartDate(startDate);
        request.setEndDate(endDate);
        request.setMetrics("viewerPercentage"); // 시청 비율
        request.setDimensions("gender,ageGroup"); // 성별, 연령대
        request.setFilters("video==" + youTubeVideoKey); // 특정 비디오 필터링 (필수)
        request.setSort("-viewerPercentage"); // 시청 비율 높은 순

        QueryResponse response = request.execute();
        logger.debug("YouTube Analytics API Audience Stats Response for video {}: {}", youTubeVideoKey, response.toPrettyString());
        return response;
	}
	
	public QueryResponse getInflowRouteStats(String userId, String startDate, String endDate, String youTubeVideoKey) throws GeneralSecurityException, IOException {
		Credential credential = oAuthService.getCredential(userId);
        if (credential == null || credential.getAccessToken() == null) {
            throw new GeneralSecurityException("OAuth 인증이 필요합니다.");
        }
        YouTubeAnalytics analytics = oAuthService.getYouTubeAnalyticsService(credential);
        
        YouTubeAnalytics.Reports.Query request = analytics.reports().query();
        request.setIds("channel==" + getChannelIdForAnalytics(userId, null));
        request.setStartDate(startDate);
        request.setEndDate(endDate);
        request.setMetrics("views");
        request.setDimensions("insightTrafficSourceType");
        request.setFilters("video==" + youTubeVideoKey);
        request.setSort("-views");
        
        QueryResponse response = request.execute();
        logger.debug("YouTube Analytics API Inflow Route Stats Response for video {}: {}", youTubeVideoKey, response.toPrettyString());
        return response;
	}
	
	public QueryResponse getDeviceAnalysisStats(String userId, String startDate, String endDate,
			String youTubeVideoKey) throws IOException, GeneralSecurityException {
		Credential credential = oAuthService.getCredential(userId);
        if (credential == null || credential.getAccessToken() == null) {
            throw new GeneralSecurityException("OAuth 인증이 필요합니다.");
        }
        YouTubeAnalytics analytics = oAuthService.getYouTubeAnalyticsService(credential);
        
        YouTubeAnalytics.Reports.Query request = analytics.reports().query();
        request.setIds("channel==" + getChannelIdForAnalytics(userId, null));
        request.setStartDate(startDate);
        request.setEndDate(endDate);
        request.setMetrics("views");
        request.setDimensions("deviceType");
        request.setFilters("video==" + youTubeVideoKey);
        request.setSort("-views");
        
        QueryResponse response = request.execute();
        logger.debug("YouTube Analytics API Device Analysis Stats Response for video {}: {}", youTubeVideoKey, response.toPrettyString());
        return response;
	}
	
	public QueryResponse getVideoSubscriberGains(String googleId, String startDate, String endDate, String videoId)
			throws IOException, GeneralSecurityException {
		logger.info("Fetching subscriber gains for videoId: {}, from {} to {}", videoId, startDate, endDate);

		Credential credential = oAuthService.getCredential(googleId);
		if (credential == null) {
			logger.error("Credential is null for user {}", googleId);
			throw new GeneralSecurityException("Credential not found or invalid for user: " + googleId);
		}

		YouTubeAnalytics youtubeAnalytics = oAuthService.getYouTubeAnalyticsService(credential);

		// YouTube Analytics API 쿼리 빌드
		YouTubeAnalytics.Reports.Query query = youtubeAnalytics.reports().query()
				.setIds("channel==mine")
				.setStartDate(startDate).
				setEndDate(endDate).
				setMetrics("subscribersGained")
				.setDimensions("video")
				.setFilters("video==" + videoId);

		QueryResponse response = query.execute();
		logger.debug("YouTube Analytics Response (Video Subscriber Gains for {}): {}", videoId,
				response.toPrettyString());
		return response;
	}
	
	private String getChannelIdForAnalytics(String userId, String channelId) throws IOException, GeneralSecurityException {
		if (channelId != null && !channelId.isEmpty()) {
            return channelId;
        }
		
		ChannelListResponse myChannelResponse = oAuthService.getYouTubeService(oAuthService.getCredential(userId))
                .channels().list(Arrays.asList("id"))
                .setMine(true)
                .execute();
		if (myChannelResponse != null && myChannelResponse.getItems() != null && !myChannelResponse.getItems().isEmpty()) {
            return myChannelResponse.getItems().get(0).getId();
        }
		throw new GeneralSecurityException("Authenticated user has no YouTube channel or could not retrieve channel ID.");
	}

	public QueryResponse getVideoAnalyticsCumulativeMetrics(String googleId, String startDate, String endDate, String videoId, String metrics) throws IOException, GeneralSecurityException {
	    logger.info("Fetching cumulative analytics (metrics: {}) for videoId: {}, from {} to {}", metrics, videoId, startDate, endDate);

	    Credential credential = oAuthService.getCredential(googleId);
	    if (credential == null) {
	        logger.error("Credential is null for user {}", googleId);
	        throw new GeneralSecurityException("Credential not found or invalid for user: " + googleId);
	    }

	    YouTubeAnalytics youtubeAnalytics = oAuthService.getYouTubeAnalyticsService(credential);

	    YouTubeAnalytics.Reports.Query query = youtubeAnalytics.reports()
	        .query()
	        .setIds("channel==MINE")
	        .setStartDate(startDate)
	        .setEndDate(endDate)
	        .setMetrics(metrics)
	        .setFilters("video==" + videoId);

	    QueryResponse response = query.execute();
	    logger.debug("YouTube Analytics Response (Cumulative Video Metrics for {}): {}", videoId, response.toPrettyString());
	    return response;
	}
	
	
	// 채널 전체의 성별 및 연령대 데이터를 가져오는 메서드
	public QueryResponse getChannelAudienceAnalytics(String googleId, String startDate, String endDate, String channelId) throws IOException, GeneralSecurityException {
	    logger.info("Fetching channel audience analytics (gender, ageGroup) for channel: {}, from {} to {}", channelId, startDate, endDate);
	    Credential credential = oAuthService.getCredential(googleId);
	    if (credential == null) {
	        logger.error("Credential is null for user {}", googleId);
	        throw new GeneralSecurityException("Credential not found or invalid for user: " + googleId);
	    }
	    YouTubeAnalytics youtubeAnalytics = oAuthService.getYouTubeAnalyticsService(credential);
	    // metrics는 viewerPercentage (성별/연령대별 시청 비율)
	    // dimensions는 gender,ageGroup
	    YouTubeAnalytics.Reports.Query query = youtubeAnalytics.reports()
	        .query()
	        .setIds("channel==" + channelId)
	        .setStartDate(startDate)
	        .setEndDate(endDate)
	        .setMetrics("viewerPercentage")
	        .setDimensions("gender,ageGroup"); // 성별과 연령대 디멘션
	    QueryResponse response = query.execute();
	    logger.debug("YouTube Analytics Response (Channel Audience for {}): {}", channelId, response.toPrettyString());
	    return response;
	}

	// 채널 전체의 국가별 데이터를 가져오는 메서드
	public QueryResponse getChannelCountryAnalytics(String googleId, String startDate, String endDate, String channelId) throws IOException, GeneralSecurityException {
	    logger.info("Fetching channel country analytics for channel: {}, from {} to {}", channelId, startDate, endDate);
	    Credential credential = oAuthService.getCredential(googleId);
	    if (credential == null) {
	        logger.error("Credential is null for user {}", googleId);
	        throw new GeneralSecurityException("Credential not found or invalid for user: " + googleId);
	    }
	    YouTubeAnalytics youtubeAnalytics = oAuthService.getYouTubeAnalyticsService(credential);
	    // metrics는 views (국가별 조회수)
	    // dimensions는 country
	    YouTubeAnalytics.Reports.Query query = youtubeAnalytics.reports()
	        .query()
	        .setIds("channel==" + channelId)
	        .setStartDate(startDate)
	        .setEndDate(endDate)
	        .setMetrics("views")
	        .setDimensions("country"); // 국가 디멘션
	    QueryResponse response = query.execute();
	    logger.debug("YouTube Analytics Response (Channel Country for {}): {}", channelId, response.toPrettyString());
	    return response;
	}

	// 채널 전체의 트래픽 소스 데이터를 가져오는 메서드
	public QueryResponse getChannelTrafficSourceAnalytics(String googleId, String startDate, String endDate, String channelId) throws IOException, GeneralSecurityException {
	    logger.info("Fetching channel traffic source analytics for channel: {}, from {} to {}", channelId, startDate, endDate);
	    Credential credential = oAuthService.getCredential(googleId);
	    if (credential == null) {
	        logger.error("Credential is null for user {}", googleId);
	        throw new GeneralSecurityException("Credential not found or invalid for user: " + googleId);
	    }
	    YouTubeAnalytics youtubeAnalytics = oAuthService.getYouTubeAnalyticsService(credential);
	    // metrics는 views (트래픽 소스별 조회수)
	    // dimensions는 trafficSourceType
	    YouTubeAnalytics.Reports.Query query = youtubeAnalytics.reports()
	        .query()
	        .setIds("channel==" + channelId)
	        .setStartDate(startDate)
	        .setEndDate(endDate)
	        .setMetrics("views")
	        .setDimensions("insightTrafficSourceType"); // 트래픽 소스 타입 디멘션
	    QueryResponse response = query.execute();
	    logger.debug("YouTube Analytics Response (Channel Traffic Source for {}): {}", channelId, response.toPrettyString());
	    return response;
	}

	// 채널 전체의 시청 시간대 데이터를 가져오는 메서드 (hour 디멘션 사용)
	public QueryResponse getChannelWatchTimeAnalytics(String googleId, String startDate, String endDate, String channelId) throws IOException, GeneralSecurityException {
	    logger.info("Fetching channel watch time analytics (by hour) for channel: {}, from {} to {}", channelId, startDate, endDate);
	    Credential credential = oAuthService.getCredential(googleId);
	    if (credential == null) {
	        logger.error("Credential is null for user {}", googleId);
	        throw new GeneralSecurityException("Credential not found or invalid for user: " + googleId);
	    }
	    YouTubeAnalytics youtubeAnalytics = oAuthService.getYouTubeAnalyticsService(credential);
	    YouTubeAnalytics.Reports.Query query = youtubeAnalytics.reports()
	        .query()
	        .setIds("channel==" + channelId)
	        .setStartDate(startDate)
	        .setEndDate(endDate)
	        .setMetrics("views") // 시청 시간대별 조회수 (가장 일반적인 지표)
	        .setDimensions("hour"); // 시간 디멘션 (0-23)
	    QueryResponse response = query.execute();
	    logger.debug("YouTube Analytics Response (Channel Watch Time by Hour for {}): {}", channelId, response.toPrettyString());
	    return response;
	}
	
	// 채널 전체의 기기 유형별 데이터를 가져오는 메서드
	public QueryResponse getChannelDeviceAnalytics(String googleId, String startDate, String endDate, String channelId) throws IOException, GeneralSecurityException {
	    logger.info("Fetching channel device analytics for channel: {}, from {} to {}", channelId, startDate, endDate);
	    Credential credential = oAuthService.getCredential(googleId);
	    if (credential == null) {
	        logger.error("Credential is null for user {}", googleId);
	        throw new GeneralSecurityException("Credential not found or invalid for user: " + googleId);
	    }
	    YouTubeAnalytics youtubeAnalytics = oAuthService.getYouTubeAnalyticsService(credential);
	    YouTubeAnalytics.Reports.Query query = youtubeAnalytics.reports()
	        .query()
	        .setIds("channel==" + channelId)
	        .setStartDate(startDate)
	        .setEndDate(endDate)
	        .setMetrics("views")
	        .setDimensions("deviceType"); // 기기 유형 디멘션
	    QueryResponse response = query.execute();
	    logger.debug("YouTube Analytics Response (Channel Device Analytics for {}): {}", channelId, response.toPrettyString());
	    return response;
	}
}
