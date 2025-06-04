package com.cm.astb.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;

import org.springframework.stereotype.Service;

import com.cm.astb.config.GoogleApiConfig;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeFlow;
import com.google.api.client.googleapis.auth.oauth2.GoogleAuthorizationCodeRequestUrl;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.googleapis.auth.oauth2.GoogleTokenResponse;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtubeAnalytics.v2.YouTubeAnalytics;

@Service
public class OAuthService {
	
	private final GoogleApiConfig googleApiConfig;
	private final NetHttpTransport httpTransport;
	private final GsonFactory jsonFactory;
	private final FileDataStoreFactory dataStoreFactory;
	
	public OAuthService(GoogleApiConfig googleApiConfig, NetHttpTransport httpTransport, 
			GsonFactory jsonFactory, FileDataStoreFactory dataStoreFactory) {
		this.googleApiConfig = googleApiConfig;
		this.httpTransport = httpTransport;
		this.jsonFactory = jsonFactory;
		this.dataStoreFactory = dataStoreFactory;
	}

	private GoogleAuthorizationCodeFlow buildFlow(Collection<String> scopes) throws IOException {
		return new GoogleAuthorizationCodeFlow.Builder(
				httpTransport, 
				jsonFactory, 
				googleApiConfig.googleClientSecrets(),
				scopes)
				.setDataStoreFactory(dataStoreFactory)
				.setAccessType("offline")
				.setApprovalPrompt("force")
				.build();
	}
	
	public String getAuthorizationUrl(Collection<String> scopes) throws IOException {
		GoogleAuthorizationCodeRequestUrl url = buildFlow(scopes).newAuthorizationUrl()
				.setRedirectUri(googleApiConfig.getRedirectUri());
		return url.build();
	}
	
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
		String userId = "currentLoggedInUser"; 
		GoogleIdToken idToken = null;
		
		if (idTokenStr != null) {
			GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(httpTransport, jsonFactory)
					.setAudience(Collections.singletonList(googleApiConfig.getClientId()))
					.build();
			
			idToken = verifier.verify(idTokenStr);
			
			if(idToken != null) {
				userId = idToken.getPayload().getSubject();
				System.out.println("Extracted Google User ID (sub): " + userId);
			} else {
				System.err.println("ID Token verification failed in OAuthService for code: " + code);
			}
		} else {
			System.err.println("ID Token string is null in OAuthService for code: " + code + ". Cannot extract user ID from ID Token.");
		}
		
        Credential credential = flowWithAllScopes.createAndStoreCredential(response, userId);
        
        Map<String, Object> result = new HashMap<>();
        result.put("credential", credential);
        result.put("idToken", idToken);
        
        return result;
	}
	
	public Credential getCredential(String userId) throws IOException {
		Collection<String> allScopes = new ArrayList<>();
		allScopes.addAll(GoogleApiConfig.ANALYTICS_SCOPES);
		allScopes.addAll(GoogleApiConfig.USER_LOGIN_SCOPES);
		
		return buildFlow(allScopes).loadCredential(userId);
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
