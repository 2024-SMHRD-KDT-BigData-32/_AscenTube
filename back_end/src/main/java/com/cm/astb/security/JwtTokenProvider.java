package com.cm.astb.security;

import java.security.Key;
import java.util.Date;

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
import io.jsonwebtoken.io.Decoder;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;

@Component
public class JwtTokenProvider {

	private static final Logger logger = LoggerFactory.getLogger(JwtTokenProvider.class);
	
	private final Key key;
	private final long jwtExpirationMs; // JWT expiration time (milliseconds)
	
	public JwtTokenProvider(
			@Value("${jwt.secret}") String secret,
			@Value("${jwt.expiration.minutes}") long expirationMinutes) {
		this.key = Keys.hmacShaKeyFor(Decoders.BASE64.decode(secret));
		this.jwtExpirationMs = expirationMinutes * 60 * 1000; // convert minutes to milliseconds
	}
	
	
	public String generateToken(User user) {
		Claims claims = Jwts.claims().setSubject(user.getGoogleId());
		
		claims.put("email", user.getEmail());
		claims.put("nickname", user.getNickname());
		// claims.put("profileImg", user.getProfileImg()); // URL이 길어지면 토큰 크기가 커질 수 있다.
		
		Date now = new Date();
		Date expiryDate = new Date(now.getTime() + jwtExpirationMs);
		return Jwts.builder()
				.setClaims(claims)
				.setIssuedAt(now)
				.setExpiration(expiryDate)
				.signWith(key, SignatureAlgorithm.HS256)
				.compact();
	}
	
	public boolean validateToken(String authToken) {
		try {
			Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(authToken);
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
		Claims claims = Jwts.parserBuilder()	// JWT parsing(validation)
				.setSigningKey(key)		// secret key
				.build()
				.parseClaimsJws(token)
				.getBody();
		return claims.getSubject();
	}
}
