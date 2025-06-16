package com.cm.astb.controller;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cm.astb.service.YoutubeAnalyticsService;
import com.google.api.services.youtubeAnalytics.v2.model.QueryResponse;

@RestController
@RequestMapping("/api/youtube/analytics")
public class YoutubeAnalyticsController {

	private final YoutubeAnalyticsService youtubeAnalyticsService;

	public YoutubeAnalyticsController(YoutubeAnalyticsService youtubeAnalyticsService) {
		this.youtubeAnalyticsService = youtubeAnalyticsService;
	}

	/**
	 * 인증된 사용자의 채널 또는 지정된 채널의 기본 Analytics 데이터를 가져옵니다.
	 *
	 * @param startDate 시작 날짜 (YYYY-MM-DD)
	 * @param endDate   종료 날짜 (YYYY-MM-DD)
	 * @param channelId 채널 ID (선택 사항, 비워두면 "mine"으로 조회)
	 * @return 채널 Analytics 데이터
	 */

	@GetMapping("/basic-stats")
	public ResponseEntity<?> getBasicChannelStats(
			@RequestParam String userId,
			@RequestParam String startDate,
			@RequestParam String endDate,
			@RequestParam(required = false) String channelId) {
		try {
			QueryResponse result = youtubeAnalyticsService.getChannelBasicAnalytics(userId, startDate, endDate, channelId);

			Map<String, Map<String, Object>> responseData = youtubeAnalyticsService.parseAnalyticsResult(result);

			return ResponseEntity.ok(responseData);

		} catch (IOException e) { // IOException 명시적으로 잡음
	        e.printStackTrace();
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR) // 500
	                             .body("Error fetching analytics data: " + e.getMessage());
	    } catch (GeneralSecurityException e) { // GeneralSecurityException 명시적으로 잡음 (서비스에서 던질 수 있으므로)
	        e.printStackTrace();
	        return ResponseEntity.status(HttpStatus.UNAUTHORIZED) // 401 Unauthorized
	                             .body("Error fetching analytics data: " + e.getMessage());
	    } catch (Exception e) { // 그 외 예상치 못한 모든 예외
	        e.printStackTrace();
	        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
	                             .body("An unexpected error occurred: " + e.getMessage());
	    }
	}

	// 국가별 조회수 데이터를 가져옵니다.

	@GetMapping("/views-by-country")
	public ResponseEntity<?> getViewsByCountry(
			@RequestParam String userId,
			@RequestParam String startDate,
			@RequestParam String endDate,
			@RequestParam(required = false) String channelId) {
		try {
			QueryResponse result = youtubeAnalyticsService.getViewsByCountry(userId, startDate, endDate, channelId);
			Map<String, Map<String, Object>> responseData = youtubeAnalyticsService.parseAnalyticsResult(result);
			return ResponseEntity.ok(responseData);
		} catch (GeneralSecurityException | IOException e) {
			return ResponseEntity.status(500).body("Error fetching country-specific analytics: " + e.getMessage());
		}
	}

	/**
	 * 유입 경로 유형별 조회수 데이터를 가져옵니다. OAuth 인증이 필요합니다.
	 */
	@GetMapping("/traffic-source-type")
	public ResponseEntity<?> getTrafficSourceType(
			@RequestParam String userId,
			@RequestParam String startDate,
			@RequestParam String endDate,
			@RequestParam(required = false) String channelId) {
		try {
			QueryResponse result = youtubeAnalyticsService.getTrafficSourceType(userId, startDate, endDate, channelId);
			Map<String, Map<String, Object>> responseData = youtubeAnalyticsService.parseAnalyticsResult(result);
			return ResponseEntity.ok(responseData);
		} catch (GeneralSecurityException | IOException e) {
			return ResponseEntity.status(500).body("Error fetching traffic source analytics: " + e.getMessage());
		}
	}

}
