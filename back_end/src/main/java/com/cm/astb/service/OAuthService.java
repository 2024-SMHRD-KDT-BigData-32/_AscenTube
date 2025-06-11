package com.cm.astb.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import com.cm.astb.config.GoogleApiConfig;
import com.cm.astb.entity.User;
import com.cm.astb.security.GoogleCredentialDataStoreFactory;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtubeAnalytics.v2.YouTubeAnalytics;

import jakarta.transaction.Transactional;

@Service
public class OAuthService {

	private static final Logger logger = LoggerFactory.getLogger(OAuthService.class);
	
	private final GoogleApiConfig googleApiConfig;
	private final NetHttpTransport httpTransport;
	private final GsonFactory jsonFactory;
//	private final FileDataStoreFactory dataStoreFactory;
	private final GoogleCredentialDataStoreFactory googleCredentialDataStoreFactory;
	private final UserService userService;
	
	public OAuthService(GoogleApiConfig googleApiConfig, NetHttpTransport httpTransport, 
			GsonFactory jsonFactory, GoogleCredentialDataStoreFactory googleCredentialDataStoreFactory,
			UserService userService) {
		this.googleApiConfig = googleApiConfig;
		this.httpTransport = httpTransport;
		this.jsonFactory = jsonFactory;
		this.googleCredentialDataStoreFactory = googleCredentialDataStoreFactory;
//		this.dataStoreFactory = dataStoreFactory;
		this.userService = userService;
	}

	private GoogleAuthorizationCodeFlow buildFlow(Collection<String> scopes) throws IOException {
		return new GoogleAuthorizationCodeFlow.Builder(
				httpTransport, 
				jsonFactory, 
				googleApiConfig.googleClientSecrets(),
				scopes)
				.setDataStoreFactory(googleCredentialDataStoreFactory)
				.setAccessType("offline")
				.setApprovalPrompt("force")
				.build();
	}
	
	public String getAuthorizationUrl(Collection<String> scopes) throws IOException {
		GoogleAuthorizationCodeRequestUrl url = buildFlow(scopes).newAuthorizationUrl()
				.setRedirectUri(googleApiConfig.getRedirectUri());
		return url.build();
	}
	
	@Transactional
	public Map<String, Object> exchangeCodeForTokens(String code) throws IOException, GeneralSecurityException {
		Collection<String> allScopes = new ArrayList<>();
		allScopes.addAll(GoogleApiConfig.ANALYTICS_SCOPES);
		allScopes.addAll(GoogleApiConfig.USER_LOGIN_SCOPES);
		
		GoogleAuthorizationCodeFlow flowWithAllScopes = buildFlow(allScopes);
		
		GoogleTokenResponse response = flowWithAllScopes.newTokenRequest(code)
				.setRedirectUri(googleApiConfig.getRedirectUri())
				.execute();
		System.out.println("Full GoogleTokenResponse: " + response.toPrettyString());
		
		String idTokenStr = response.getIdToken();
		GoogleIdToken idToken = null;
		String googleId = "default";
		String email = null;
		String nickname = null;
		String profileImg = null;
		
		if (idTokenStr != null) {
			GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(httpTransport, jsonFactory)
					.setAudience(Collections.singletonList(googleApiConfig.getClientId()))
					.build();
			
			idToken = verifier.verify(idTokenStr);
			
			if(idToken != null) {
				googleId = idToken.getPayload().getSubject();
				email = idToken.getPayload().getEmail();
				nickname = (String) idToken.getPayload().get("name");
				profileImg = (String) idToken.getPayload().get("picture");
				System.out.println("Extracted Google User ID (sub): " + googleId);
			} else {
				System.err.println("ID Token verification failed in OAuthService for code: " + code);
			}
		} else {
			System.err.println("ID Token string is null in OAuthService for code: " + code + ". Cannot extract user ID from ID Token.");
		}
		
		User user = userService.findOrCreateUser(googleId, email, nickname, profileImg, response.getRefreshToken()); 
				
		Credential credential = flowWithAllScopes.createAndStoreCredential(response, user.getGoogleId());
		
        Map<String, Object> result = new HashMap<>();
        result.put("credential", credential);
        result.put("idToken", idToken);
        result.put("googleUserId", googleId);
        result.put("user", user);
        
        return result;
	}
	
	public Credential getCredential(String userId) throws IOException {
		Collection<String> allScopes = new ArrayList<>();
		allScopes.addAll(GoogleApiConfig.ANALYTICS_SCOPES);
		allScopes.addAll(GoogleApiConfig.USER_LOGIN_SCOPES);
		
		GoogleAuthorizationCodeFlow flowWithAllScopes = buildFlow(allScopes);
		Credential credential = flowWithAllScopes.loadCredential(userId);
		
		if (credential != null && credential.getAccessToken() != null) {
			logger.info("Credential loaded for user {}. Access Token is valid or refreshed.", userId);
		} else if (credential != null && credential.getRefreshToken() != null) {
			logger.warn("Credential loaded for user {} but Access Token is null/expired. Attempting refresh...", userId);
			try {
				if (credential.refreshToken()) {
					logger.info("Access Token successfully refreshed for user {}.", userId);
				} else {
					logger.error("Failed to refresh Access Token for user {}. Refresh Token might be invalid.", userId);
				}
			} catch (IOException e) {
				logger.error("IOException during Access Token refresh for user {}: {}", userId, e.getMessage());
			}
		} else {
			logger.warn("No valid Credential or Refresh Token found for user {}.", userId);
		}
		return credential;
	}
	
	// 인증된 Credential을 사용하여 YouTube Analytics API 서비스 객체를 반환.
	public YouTubeAnalytics getYouTubeAnalyticsService(Credential credential) throws IOException {
		return new YouTubeAnalytics.Builder(httpTransport, jsonFactory, credential)
				.setApplicationName(googleApiConfig.getApplicationName())
				.build();
	}
	
	public YouTube getYouTubeService(Credential credential) throws IOException {
		return new YouTube.Builder(httpTransport, jsonFactory, credential)
				.setApplicationName(googleApiConfig.getApplicationName())
				.build();
	}
	
}
