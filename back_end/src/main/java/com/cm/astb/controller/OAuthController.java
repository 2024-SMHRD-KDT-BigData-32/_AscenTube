package com.cm.astb.controller;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.List;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import com.cm.astb.config.GoogleApiConfig;
import com.cm.astb.entity.User;
import com.cm.astb.security.JwtTokenProvider;
import com.cm.astb.service.DataCollectorService;
import com.cm.astb.service.OAuthService;
import com.cm.astb.service.UserService;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;

@RestController
@RequestMapping("/oauth")
public class OAuthController {
	private static final Logger logger = LoggerFactory.getLogger(OAuthController.class);
	
	private final OAuthService oAuthService;
	private final GoogleApiConfig googleApiConfig;
	private final NetHttpTransport httpTransport;
	private final GsonFactory jsonFactory;
	private final UserService userService;
	private final DataCollectorService dataCollectorService;
	private final JwtTokenProvider jwtTokenProvider;

	public OAuthController(OAuthService oAuthService, GoogleApiConfig googleApiConfig, NetHttpTransport httpTransport,
			GsonFactory jsonFactory, UserService userService, DataCollectorService dataCollectorService,
			JwtTokenProvider jwtTokenProvider) {
		super();
		this.oAuthService = oAuthService;
		this.googleApiConfig = googleApiConfig;
		this.httpTransport = httpTransport;
		this.jsonFactory = jsonFactory;
		this.userService = userService;
		this.dataCollectorService = dataCollectorService;
		this.jwtTokenProvider = jwtTokenProvider;
	}

	@GetMapping("/google/login")
	public RedirectView googleLoginAuthorize() throws IOException {
		Collection<String> allScopes = new ArrayList<>();
		allScopes.addAll(GoogleApiConfig.ANALYTICS_SCOPES);
		allScopes.addAll(GoogleApiConfig.USER_LOGIN_SCOPES);
		String authorizationUrl = oAuthService.getAuthorizationUrl(allScopes);
		return new RedirectView(authorizationUrl);
	}

	@GetMapping("/oauth2callback")
	public RedirectView oauth2Callback(
			@RequestParam(required = false) String code,
			@RequestParam(required = false) String error,
			@RequestParam(required = false) String state) {
		
		if (error != null) {
			logger.warn("Google OAuth2 callback received an error: {} (State: {})", error, state);
			String errorRedirectUrl = String.format("%s?error=%s", googleApiConfig.getFrontendRedirectUrl(),
					URLEncoder.encode("login_canceled_or_failed", StandardCharsets.UTF_8));
			return new RedirectView(errorRedirectUrl);
		}

		// code가 null인 경우 (error가 없는데 code도 없으면 비정상적인 접근)
		if (code == null) {
			logger.error("Google OAuth2 callback received without 'code' or 'error' parameter. Malformed request.");
			String errorRedirectUrl = String.format("%s?error=%s", googleApiConfig.getFrontendRedirectUrl(),
					URLEncoder.encode("malformed_callback_request", StandardCharsets.UTF_8));
			return new RedirectView(errorRedirectUrl);
		}
		
		String googleId = null;
		String email = null;
		String nickname = null;
		String profileImg = null;
		String channelName = null;
		String channelId = null;

		try {
			Map<String, Object> googleTokenResponse = oAuthService.exchangeCodeForTokens(code);
			Credential credential = (Credential) googleTokenResponse.get("credential");
			GoogleIdToken idToken = (GoogleIdToken) googleTokenResponse.get("idToken");
			User user = (User) googleTokenResponse.get("user");
            boolean isNewUser = (boolean) googleTokenResponse.get("isNewUser");
			
			if (idToken != null) {
				GoogleIdToken.Payload payload = idToken.getPayload();	// payload(사용자 정보)

				googleId = payload.getSubject();
				System.out.println("Google ID: " + googleId);
				email = payload.getEmail();
				nickname = (String) payload.get("name");
				profileImg = (String) payload.get("picture");
			} else {
				System.out.println("Invalid ID Token.");
				throw new IllegalArgumentException("Invalid ID Token received from Google callback.");
			}

			if (googleId == null || email == null) {
				throw new IllegalStateException("Critical user information (Google ID or Email) is missing after ID Token parsing");
			}
			
			YouTube youTube = new YouTube.Builder(httpTransport, jsonFactory, credential)
					.build();
			ChannelListResponse channelListResponse = youTube.channels().list(Arrays.asList("snippet"))
					.setMine(true)
					.execute();
			
			List<Channel> channels = channelListResponse.getItems();
			if (channels != null && !channels.isEmpty()) {
				channelName = channels.get(0).getSnippet().getTitle();
				channelId = channels.get(0).getId();
				userService.updateUserChannelId(googleId, channelId);
			} else {
				System.out.println("No YouTube Channel found for this user");
			}
			
			if (isNewUser && channelId != null && !channelId.isEmpty()) {
                logger.info("User {} is a new user with channel {}. Triggering immediate data collection.", googleId, channelId);
                dataCollectorService.collectDataForSingleUser(googleId);
            } else if (!isNewUser) {
                logger.info("User {} is an existing user. Skipping immediate data collection (handled by daily scheduler).", googleId);
            } else {
                logger.warn("New user {} found but no channel ID available. Skipping immediate data collection.", googleId);
            }

			String jwtToken = jwtTokenProvider.generateToken(user);

			String redirectUrl = String.format("%s?jwtToken=%s&userGoogleId=%s&userName=%s&userEmail=%s&userThumbnailUrl=%s&userChannelName=%s&userChannelId=%s",
					googleApiConfig.getFrontendRedirectUrl(),
					URLEncoder.encode(jwtToken, StandardCharsets.UTF_8),
					URLEncoder.encode(user.getGoogleId() != null ? user.getGoogleId() : "", StandardCharsets.UTF_8),
					URLEncoder.encode(user.getNickname() != null ? user.getNickname() : "", StandardCharsets.UTF_8),
					URLEncoder.encode(user.getEmail() != null ? user.getEmail() : "", StandardCharsets.UTF_8),
					URLEncoder.encode(user.getProfileImg() != null ? user.getProfileImg() : "", StandardCharsets.UTF_8),
					URLEncoder.encode(channelName != null ? channelName : "", StandardCharsets.UTF_8),
					URLEncoder.encode(channelId != null ? channelId : "", StandardCharsets.UTF_8)
					);
			return new RedirectView(redirectUrl);

		} catch (IOException | GeneralSecurityException | IllegalArgumentException e) {
			e.printStackTrace();
			System.err.println(e.getMessage());
			String errorRedirectUrl = String.format("%s?error=%s", googleApiConfig.getFrontendRedirectUrl(),
					URLEncoder.encode("login_failed", StandardCharsets.UTF_8));
			return new RedirectView(errorRedirectUrl);
		} catch (Exception e) {
			e.printStackTrace();
			System.err.println(e.getMessage());
			String errorRedirectUrl = String.format("%s?error=%s", googleApiConfig.getFrontendRedirectUrl(),
					URLEncoder.encode("login_failed", StandardCharsets.UTF_8));
			return new RedirectView(errorRedirectUrl);

		}
	}
	
	@GetMapping("/google/analytics/authorize")
	public RedirectView googleAnalyticsAuthorize() throws IOException {
		String authorizationUrl = oAuthService.getAuthorizationUrl(GoogleApiConfig.ANALYTICS_SCOPES);
		return new RedirectView(authorizationUrl);	// return "redirect:/" + authorizationUrl와 같은 맥락.
	}
	@GetMapping("/status")
	public ResponseEntity<String> getOAuthStatus(@RequestParam String userId) {
		try {
			Credential credential = oAuthService.getCredential(userId);
			if(credential != null && credential.getAccessToken() != null) {
				return ResponseEntity.ok("OAuth Credential이 유효합니다. Access Token: " + credential.getAccessToken().substring(0, 10) + "...");
			} else {
				return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("OAuth Credential이 없거나 유효하지 않습니다. /oauth/google/authorize 로 인증을 시작하세요.");
			}
		} catch (IOException e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body("OAuth 상태 확인 중 오류가 발생했습니다: " + e.getMessage());
		}
	}
}

