package com.cm.astb.config;

import java.io.File;
import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.Arrays;
import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Primary;

import com.google.api.client.googleapis.auth.oauth2.GoogleClientSecrets;
import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.client.util.store.FileDataStoreFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtubeAnalytics.v2.YouTubeAnalytics;

@Configuration
public class GoogleApiConfig {
	@Value("${youtube.api.key}")
	private String youtubeApiKey;
	
	@Value("${google.oauth2.client-id}")
	private String clientId;
	
	@Value("${google.oauth2.client-secret}")
	private String clientSecret;
	
	@Value("${google.oauth2.redirect-uri}")
	private String redirectUri;
	
	@Value("${frontend.redirect.url}")
	private String frontendRedirectUrl;
	
	@Value("${spring.application.name}")
	private String applicationName;
	
	@Value("${google.tokens.directory.path")
	private String tokensDirectoryPath;
	
	@Bean
	public NetHttpTransport httpTransport() throws GeneralSecurityException, IOException {
		return GoogleNetHttpTransport.newTrustedTransport();
	}
	
	@Bean
	public GsonFactory jsonFactory() {
		return GsonFactory.getDefaultInstance();
	}
	
	@Bean
	public FileDataStoreFactory fileDataStoreFactory() throws IOException {
		return new FileDataStoreFactory(new File(tokensDirectoryPath));
	}
	
	// YouTube Data API 서비스를 초기화하는 Bean을 정의.
	@Bean
	@Primary
	public YouTube youtubeDataApi() {
		return new YouTube.Builder(new NetHttpTransport(), new GsonFactory(), request -> {})
				.setApplicationName(applicationName)
				.build();
	}

	// OAuth 2.0 인증 흐름을 위한 GoogleClientSecrets Bean
	@Bean
	public GoogleClientSecrets googleClientSecrets() {
		System.out.println("ClientId: " + clientId); // 디버깅용
		System.out.println("ClientSecret: " + clientSecret); // 디버깅용
		System.out.println("RedirectUri: " + redirectUri);
		
		GoogleClientSecrets clientSecrets = new GoogleClientSecrets();
		GoogleClientSecrets.Details details = new GoogleClientSecrets.Details(); // <-- Details 객체를 직접 생성
		
		details.setClientId(clientId);
		details.setClientSecret(clientSecret);
		
		clientSecrets.setInstalled(details); // <-- 생성된 Details 객체를 setInstalled()로 설정
		return clientSecrets;
	}
	
	
	// YouTube API 스코프
	public static final List<String> ANALYTICS_SCOPES = Arrays.asList(
			"https://www.googleapis.com/auth/yt-analytics.readonly",
            "https://www.googleapis.com/auth/youtube.readonly"
	);
	
	public static final List<String> USER_LOGIN_SCOPES = Arrays.asList(
				"openid",	// ID Token 수령 목적
				"email",	
				"profile"
			);
	

	public String getYoutubeApiKey() {
		return youtubeApiKey;
	}

	public String getClientId() {
		return clientId;
	}

	public String getClientSecret() {
		return clientSecret;
	}

	public String getRedirectUri() {
		return redirectUri;
	}

	public String getFrontendRedirectUrl() {
		return frontendRedirectUrl;
	}

	public String getApplicationName() {
		return applicationName;
	}

	public String getTokensDirectoryPath() {
		return tokensDirectoryPath;
	}
	
}
