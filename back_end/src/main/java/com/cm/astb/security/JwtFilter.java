// JwtFilter.java (디버깅 로그 추가)
package com.cm.astb.security;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

@Component
@RequiredArgsConstructor
public class JwtFilter extends OncePerRequestFilter {

    private static final Logger customLogger = LoggerFactory.getLogger(JwtFilter.class);
    private final JwtTokenProvider jwtTokenProvider;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        String jwt = null;
        Authentication authentication = null;
        try {
            jwt = jwtTokenProvider.resolveToken(request); // 요청에서 JWT 토큰 추출
            
            if (StringUtils.hasText(jwt)) {
                customLogger.info("[JwtFilter] 요청 URI: {}, JWT 발견 (앞 10자): {}", request.getRequestURI(), jwt.substring(0, Math.min(jwt.length(), 10)) + "...");
                if (jwtTokenProvider.validateToken(jwt)) {
                    authentication = jwtTokenProvider.getAuthentication(jwt);
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                    customLogger.info("[JwtFilter] SecurityContext에 Authentication 저장 완료: '{}', URI: {}", authentication.getName(), request.getRequestURI());
                } else {
                    customLogger.warn("[JwtFilter] 유효하지 않은 JWT 토큰입니다, URI: {}", request.getRequestURI());
                }
            } else {
                // customLogger.info("[JwtFilter] JWT 토큰이 헤더에 없습니다, URI: {}", request.getRequestURI());
            }
        } catch (Exception e) {
            customLogger.error("[JwtFilter] JWT 처리 중 예외 발생 URI: {}, 에러: {}", request.getRequestURI(), e.getMessage(), e); // 스택 트레이스 로깅 추가
        }

        filterChain.doFilter(request, response);
    }
}