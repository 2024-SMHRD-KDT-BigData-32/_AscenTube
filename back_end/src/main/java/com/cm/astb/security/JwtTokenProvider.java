package com.cm.astb.security;

import java.security.Key;
import java.security.KeyStore.SecretKeyEntry;
import java.util.Base64;
import java.util.Date;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import com.cm.astb.entity.User;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.MalformedJwtException;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.UnsupportedJwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtTokenProvider {

	private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
	
	private final SecretKey key;
	private final long jwtExpirationMs; // JWT expiration time (milliseconds)
	
	public JwtTokenProvider(
			@Value("${jwt.secret}") String secret,
			@Value("${jwt.expiration.minutes}") long expirationMinutes) {
		
		byte[] decodedSecretBytes = Decoders.BASE64.decode(secret);
		this.key = new SecretKeySpec(decodedSecretBytes, "HmacSHA256");
		
//		this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
		String initializedKeyBase64 = Base64.getEncoder().encodeToString(this.key.getEncoded());
		logger.warn(">>> [JWT_DEBUG] Initialized Key (Base64): {}", initializedKeyBase64);
//		this.key = Keys.secretKeyFor(SignatureAlgorithm.HS256);
//		String generatedAndEncodedSecret = Base64.getEncoder().encodeToString(this.key.getEncoded());
//		logger.warn("!!! NEW **JJWT-GENERATED & VERIFIED** JWT SECRET KEY (COPY THIS TO application.properties): {}", generatedAndEncodedSecret);
		this.jwtExpirationMs = expirationMinutes * 60 * 1000; // convert minutes to milliseconds
	}
	
	
	public String generateToken(User user) {
		
		Date now = new Date();
		Date expiryDate = new Date(now.getTime() + jwtExpirationMs);
		
		String generateKeyBase64 = Base64.getEncoder().encodeToString(this.key.getEncoded());
        logger.warn(">>> [JWT_DEBUG] Key used for GENERATION (Base64): {}", generateKeyBase64);
		
		return Jwts.builder()
				.subject(user.getGoogleId())
				.claim("email", user.getEmail())
				.claim("nickname", user.getNickname())
				.issuedAt(now)
				.expiration(expiryDate)
				.signWith(key)
				.compact();
	}
	
	public boolean validateToken(String authToken) {
		try {
			String validateKeyBase64 = Base64.getEncoder().encodeToString(this.key.getEncoded());
            logger.warn(">>> [JWT_DEBUG] Key used for VALIDATION (Base64): {}", validateKeyBase64);
            
			Jwts.parser().verifyWith(key).build().parseSignedClaims(authToken);
			return true;
		} catch (io.jsonwebtoken.security.SecurityException | MalformedJwtException e) {
			logger.error("Invalid JWT signature or malformed JWT: {}", e.getMessage());
		} catch (ExpiredJwtException e) {
			logger.error("Expired JWT token: {}", e.getMessage());
		} catch (UnsupportedJwtException e) {
			logger.error("Unsupporoted JWT token: {}", e.getMessage());
		} catch (IllegalArgumentException e) {
			logger.error("JWT claims string is empty or invalid argument: {}", e.getMessage());
		}
		return false;
	}
	
	public String getUserIdFromJWT(String token) {
		String getUserIdKeyBase64 = Base64.getEncoder().encodeToString(this.key.getEncoded());
		logger.warn(">>> [JWT_DEBUG] Key used for GET_USER_ID (Base64): {}", getUserIdKeyBase64);
		
		Claims claims = Jwts.parser()	// JWT parsing(validation)
				.verifyWith(key)		// secret key
				.build()
				.parseSignedClaims(token)
				.getPayload();
		return claims.getSubject();
	}
}
