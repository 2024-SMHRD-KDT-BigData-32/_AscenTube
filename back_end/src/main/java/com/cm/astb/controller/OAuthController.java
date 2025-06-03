package com.cm.astb.controller;

import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.Map;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.view.RedirectView;

import com.cm.astb.config.GoogleApiConfig;
import com.cm.astb.entity.User;
import com.cm.astb.security.JwtTokenProvider;
import com.cm.astb.service.OAuthService;
import com.cm.astb.service.UserService;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTube;

@CrossOrigin(origins = "http://localhost:3000")
@RestController
@RequestMapping("/oauth")
public class OAuthController {

    private final YoutubeAnalyticsController youtubeAnalyticsController;
	
	private final OAuthService oAuthService;
	private final GoogleApiConfig googleApiConfig;
	private final NetHttpTransport httpTransport;
	private final GsonFactory jsonFactory;
	private final UserService userService;
	private final JwtTokenProvider jwtTokenProvider;
	
	public OAuthController(OAuthService oAuthService, GoogleApiConfig googleApiConfig,
			NetHttpTransport httpTransport, GsonFactory jsonFactory, 
			YoutubeAnalyticsController youtubeAnalyticsController, UserService userService,
			JwtTokenProvider jwtTokenProvider) {
		this.oAuthService = oAuthService;
		this.googleApiConfig = googleApiConfig;
		this.httpTransport = httpTransport;
		this.jsonFactory = jsonFactory;
		this.youtubeAnalyticsController = youtubeAnalyticsController;
		this.userService = userService;
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
	public RedirectView oauth2Callback(@RequestParam String code) {
		
		String googleId = null;
		String email = null;
		String nickname = null;
		String profileImg = null;
		
		try {
			GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(httpTransport, jsonFactory)
					.setAudience(Collections.singletonList(googleApiConfig.getClientId()))
					.build();
			
			Map<String, Object> googleTokenResponse = oAuthService.exchangeCodeForTokens(code);
			Credential credential = (Credential) googleTokenResponse.get("credential"); 
			String idTokenStr = (String) googleTokenResponse.get("idToken");
			
			GoogleIdToken idToken = verifier.verify(idTokenStr);
			
			if (idToken != null) {
				GoogleIdToken.Payload payload = idToken.getPayload();	// payload(사용자 정보)
				
				googleId = payload.getSubject();	// Google 사용자 고유 식별 ID
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
			
			
			User user = userService.findOrCreateUser(googleId, email, nickname, profileImg);
			
			String jwtToken = jwtTokenProvider.generateToken(user);
			
			String redirectUrl = String.format("%s?jwtToken=%s&userName=%s&userEmail=%s&userThumbnailUrl=%s",
					googleApiConfig.getFrontendRedirectUrl(),
					URLEncoder.encode(jwtToken, StandardCharsets.UTF_8),
					URLEncoder.encode(user.getNickname() != null ? user.getNickname() : "", StandardCharsets.UTF_8),
					URLEncoder.encode(user.getEmail() != null ? user.getEmail() : "", StandardCharsets.UTF_8),
					URLEncoder.encode(user.getProfileImg() != null ? user.getProfileImg() : "", StandardCharsets.UTF_8));
			
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

