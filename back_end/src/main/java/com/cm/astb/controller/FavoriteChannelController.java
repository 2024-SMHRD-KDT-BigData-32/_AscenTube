// FavoriteChannelController.java (getCurrentUserGoogleId 메소드 수정)
package com.cm.astb.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails; // UserDetails 임포트
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cm.astb.dto.FavoriteChannelDto;
import com.cm.astb.service.FavoriteChannelService;

@RestController
@RequestMapping("/api/ascen/user/me/favorite-channels")
public class FavoriteChannelController {

    private final FavoriteChannelService favoriteChannelService;

    @Autowired
    public FavoriteChannelController(FavoriteChannelService favoriteChannelService) {
        this.favoriteChannelService = favoriteChannelService;
    }

    @GetMapping
    public ResponseEntity<List<FavoriteChannelDto>> getMyFavoriteChannels() {
        String googleId = getCurrentUserGoogleId();

        if (googleId == null) {
            System.err.println("[FavoriteChannelController] 사용자를 식별할 수 없어 관심 채널을 조회할 수 없습니다. 로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            List<FavoriteChannelDto> channels = favoriteChannelService.getFavoriteChannelsByGoogleId(googleId);
            System.out.println("[FavoriteChannelController] 사용자(" + googleId + ")의 관심 채널 " + channels.size() + "개 조회 완료.");
            return ResponseEntity.ok(channels);
        } catch (Exception e) {
            System.err.println("[FavoriteChannelController] 관심 채널 조회 중 서버 오류 (Google ID: " + googleId + "): " + e.getMessage());
            e.printStackTrace();
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "관심 채널 조회 중 오류가 발생했습니다.", e);
        }
    }

    private String getCurrentUserGoogleId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            System.out.println("[FavoriteChannelController] getCurrentUserGoogleId - Principal 타입: " + (principal != null ? principal.getClass().getName() : "null"));

            if (principal instanceof OAuth2User) { // Google OAuth2 로그인 직후
                OAuth2User oauth2User = (OAuth2User) principal;
                String googleId = oauth2User.getAttribute("sub");
                System.out.println("[FavoriteChannelController] Principal is OAuth2User. Google ID (sub): " + googleId);
                return googleId;
            } else if (principal instanceof UserDetails) { // JWT 토큰으로 인증된 경우
                UserDetails userDetails = (UserDetails) principal;
                String googleId = userDetails.getUsername(); // JwtTokenProvider에서 googleId를 username으로 설정했음
                System.out.println("[FavoriteChannelController] Principal is UserDetails. Google ID (username): " + googleId);
                return googleId;
            } else if (principal instanceof String && !"anonymousUser".equals(principal)) {
                 System.out.println("[FavoriteChannelController] Principal is String: " + principal + ". 이 경우 Google ID 추출 로직 필요.");
                 return (String) principal; // 또는 적절한 변환 로직
            } else if ("anonymousUser".equals(principal)) {
                 System.err.println("[FavoriteChannelController] 익명 사용자 요청입니다. 로그인되지 않았습니다.");
            } else if (principal != null) {
                 System.err.println("[FavoriteChannelController] 처리되지 않은 Principal 타입입니다: " + principal.getClass().getName());
            } else {
                 System.err.println("[FavoriteChannelController] Principal 객체가 null입니다 (인증 정보 없음).");
            }
        } else {
            System.err.println("[FavoriteChannelController] 유효한 Authentication 객체를 찾을 수 없거나 인증되지 않았습니다.");
        }
        return null;
    }
}
