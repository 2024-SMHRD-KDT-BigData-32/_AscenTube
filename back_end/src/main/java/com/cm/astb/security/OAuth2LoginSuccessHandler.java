// OAuth2LoginSuccessHandler.java (쿼리 파라미터명 jwtToken으로 수정)
package com.cm.astb.security;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import com.cm.astb.entity.User;
import com.cm.astb.service.UserService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class OAuth2LoginSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private final UserService userService;
    private final JwtTokenProvider jwtTokenProvider;

    @Value("${frontend.redirect.url}")
    private String frontendRedirectUrlConfigValue;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response,
                                        Authentication authentication) throws IOException, ServletException {
        log.info("OAuth2 Login 성공!");
        OAuth2User oAuth2User = (OAuth2User) authentication.getPrincipal();

        String googleId = oAuth2User.getAttribute("sub");
        String email = oAuth2User.getAttribute("email");
        String nickname = oAuth2User.getAttribute("name");
        String profileImg = oAuth2User.getAttribute("picture");

        if (googleId == null || email == null) {
            log.error("Google OAuth2 사용자 정보에서 ID 또는 이메일을 가져올 수 없습니다.");
            String errorRedirectBase = StringUtils.trimWhitespace(frontendRedirectUrlConfigValue);
            String errorTargetUrl = UriComponentsBuilder.fromUriString(errorRedirectBase)
                .queryParam("error", "OAuth2AttributeMissing")
                .build().encode(StandardCharsets.UTF_8).toUriString();
            getRedirectStrategy().sendRedirect(request, response, errorTargetUrl);
            return;
        }

        User user = userService.findOrCreateUser(googleId, email, nickname, profileImg, null);
        log.info("DB에서 사용자 정보 처리 완료: {}", user.getGoogleId());

        String jwtToken = jwtTokenProvider.generateToken(user);

        if (!StringUtils.hasText(jwtToken)) {
            log.error("JWT 토큰 생성 실패! 토큰이 null이거나 비어있습니다.");
            String errorRedirectBase = StringUtils.trimWhitespace(frontendRedirectUrlConfigValue);
            String errorTargetUrl = UriComponentsBuilder.fromUriString(errorRedirectBase)
                .queryParam("error", "JwtGenerationFailed")
                .build().encode(StandardCharsets.UTF_8).toUriString();
            getRedirectStrategy().sendRedirect(request, response, errorTargetUrl);
            return;
        }
        log.info("생성된 JWT 토큰 (첫 10자): {}", jwtToken.substring(0, Math.min(jwtToken.length(), 10)) + "...");

        String targetBaseUrl = StringUtils.trimWhitespace(frontendRedirectUrlConfigValue);

        String targetUrl = UriComponentsBuilder.fromUriString(targetBaseUrl)
                .queryParam("jwtToken", jwtToken)
                .queryParam("googleId", user.getGoogleId())
                .queryParam("userName", user.getNickname())
                .queryParam("userEmail", user.getEmail())
                .build()
                .encode(StandardCharsets.UTF_8)
                .toUriString();

        log.info("프론트엔드로 리디렉션할 최종 URL: {}", targetUrl);
        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}