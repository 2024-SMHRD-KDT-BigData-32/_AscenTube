// JwtTokenProvider.java (디버깅 로그 강화 및 키 생성 안정성 확인)
package com.cm.astb.security;

import java.util.Arrays;
import java.util.Base64;
import java.util.Collection;
import java.util.Date;
import java.util.stream.Collectors;

import javax.crypto.SecretKey;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import com.cm.astb.entity.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.WeakKeyException;
import jakarta.servlet.http.HttpServletRequest;

@Component
public class JwtTokenProvider {

    private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final SecretKey key;
    private final long jwtExpirationMs;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration.minutes}") long expirationMinutes) {
        logger.info("JwtTokenProvider 생성자 호출됨.");
        logger.info("주입받은 JWT_SECRET_KEY (환경변수 값): '{}'", secret); 

        if (!StringUtils.hasText(secret)) {
            logger.error("致命的エラー: JWT_SECRET_KEY 환경변수 또는 application.properties의 jwt.secret 값이 비어있거나 null입니다. 애플리케이션을 시작할 수 없습니다.");
            throw new IllegalArgumentException("JWT secret key cannot be empty or null. Check your environment variables or application.properties.");
        }

        byte[] keyBytes;
        try {
            keyBytes = Decoders.BASE64.decode(secret);
            logger.info("BASE64 디코딩된 secret key 바이트 길이: {}", keyBytes.length);

            if (keyBytes.length < 32) { 
                 logger.warn("경고: JWT secret key의 디코딩된 바이트 길이가 32바이트 미만입니다 (현재 {} 바이트). 이는 보안상 매우 취약할 수 있습니다. BASE64로 인코딩된 32바이트 이상의 안전한 문자열을 사용하세요.", keyBytes.length);
            }
        } catch (IllegalArgumentException e) {
            logger.error("JWT secret key가 유효한 BASE64 인코딩 문자열이 아닙니다: '{}'. 오류: {}. 평문 문자열을 직접 사용하거나 올바른 BASE64 인코딩된 키를 사용하세요.", secret, e.getMessage());
            throw new IllegalArgumentException("JWT secret key must be a valid BASE64 encoded string.", e);
        }

        try {
            this.key = Keys.hmacShaKeyFor(keyBytes);
        } catch (WeakKeyException e) {
            logger.error("致命的エラー: 생성된 키가 너무 약합니다 (HS256 알고리즘에 비해 길이가 짧음). JWT_SECRET_KEY 환경변수 값을 확인하세요. 키 바이트 길이: {}", keyBytes.length, e);
            throw e;
        }

        this.jwtExpirationMs = expirationMinutes * 60 * 1000;
        logger.info("JWT 토큰 만료 시간 설정: {}분 ({}ms)", expirationMinutes, jwtExpirationMs);
    }
    
	public String generateToken(User user) {

		Date now = new Date();
		Date expiryDate = new Date(now.getTime() + jwtExpirationMs);

		String generateKeyBase64 = Base64.getEncoder().encodeToString(this.key.getEncoded());
		logger.warn(">>> [JWT_DEBUG] Key used for GENERATION (Base64): {}", generateKeyBase64);

		return Jwts.builder().subject(user.getGoogleId()).claim("email", user.getEmail())
				.claim("nickname", user.getNickname()).issuedAt(now).expiration(expiryDate).signWith(key).compact();
	}
//    public String generateToken(User user) {
//        if (user == null || !StringUtils.hasText(user.getGoogleId())) {
//            logger.error("토큰 생성 실패: User 객체가 null이거나 Google ID가 없습니다.");
//            return null; 
//        }
//        logger.info("generateToken 호출됨. 사용자 Google ID: {}", user.getGoogleId());
//        Claims claims = Jwts.claims().setSubject(user.getGoogleId());
//        claims.put("email", user.getEmail());
//        claims.put("nickname", user.getNickname());
//
//        Date now = new Date();
//        Date expiryDate = new Date(now.getTime() + jwtExpirationMs);
//
//        try {
//            String token = Jwts.builder()
//                    .setClaims(claims)
//                    .setIssuedAt(now)
//                    .setExpiration(expiryDate)
//                    .signWith(key, SignatureAlgorithm.HS256)
//                    .compact();
//            // logger.info("생성된 JWT 토큰 (앞 10자): {}", token.substring(0, Math.min(token.length(), 10)) + "...");
//            return token;
//        } catch (Exception e) {
//            logger.error("JWT 토큰 생성 중 예외 발생: {}", e.getMessage(), e);
//            return null; 
//        }
//    }

    public String getUserIdFromJWT(String token) {
        Claims claims = Jwts.parser()
        		.verifyWith(key)		// secret key
				.build()
				.parseSignedClaims(token)
				.getPayload();

        return claims.getSubject();
    }

    public Authentication getAuthentication(String token) {
        String googleId = this.getUserIdFromJWT(token);
        Collection<? extends GrantedAuthority> authorities =
                Arrays.stream(new String[]{"ROLE_USER"}) 
                        .map(SimpleGrantedAuthority::new)
                        .collect(Collectors.toList());
        UserDetails principal = new org.springframework.security.core.userdetails.User(googleId, "", authorities);
        return new UsernamePasswordAuthenticationToken(principal, token, authorities);
    }

	public boolean validateToken(String authToken) {
		try {
			Jwts.parser().verifyWith(key).build().parseSignedClaims(authToken);
			return true;
		} catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
			logger.error("Invalid JWT signature or malformed JWT: {}", e.getMessage());
		} catch (ExpiredJwtException e) {
			logger.error("Expired JWT token: {}", e.getMessage());
		} catch (UnsupportedJwtException e) {
			logger.error("Unsupported JWT token: {}", e.getMessage());
		} catch (IllegalArgumentException e) {
			logger.error("JWT claims string is empty or invalid argument: {}", e.getMessage());
		}
		return false;
	}
    
    public String resolveToken(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (StringUtils.hasText(bearerToken) && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
    }
}