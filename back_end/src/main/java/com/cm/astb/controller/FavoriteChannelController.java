// src/main/java/com/cm/astb/controller/FavoriteChannelController.java
package com.cm.astb.controller;

import java.io.IOException;
import java.security.Principal;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import com.cm.astb.dto.ChannelSearchResultDto;
import com.cm.astb.dto.FavoriteChannelDto;
import com.cm.astb.dto.FavoriteChannelRequestDto;
import com.cm.astb.entity.User;
import com.cm.astb.service.FavoriteChannelService;
import com.cm.astb.service.UserService;

@RestController
@RequestMapping("/fav-channel") // 기존 경로 유지
public class FavoriteChannelController {

    private static final Logger logger = LoggerFactory.getLogger(FavoriteChannelController.class);

    private final FavoriteChannelService favoriteChannelService;
    private final UserService userService;

    public FavoriteChannelController(FavoriteChannelService favoriteChannelService, UserService userService) {
        this.favoriteChannelService = favoriteChannelService;
        this.userService = userService;
    }

    /**
     * 현재 로그인한 사용자의 관심 채널 목록을 조회합니다.
     * 테스트를 위해 googleId를 @RequestParam으로 받을 수 있도록 수정합니다.
     *
     * @param googleId   테스트용 Google ID (선택 사항)
     * @param principal  Spring Security를 통해 현재 로그인한 사용자 정보 (실제 사용)
     * @return 관심 채널 DTO 목록
     */
    @GetMapping
    public ResponseEntity<List<FavoriteChannelDto>> getMyFavoriteChannels(
            @RequestParam(required = false) String googleId, // <--- 추가: 테스트용 googleId 파라미터
            Principal principal) {
        
        String actualGoogleId = (googleId != null && !googleId.isEmpty()) ? googleId : getCurrentUserGoogleId(principal); // RequestParam이 있으면 사용, 없으면 Principal에서 가져옴

        if (actualGoogleId == null || actualGoogleId.isEmpty()) {
            logger.warn("[FavoriteChannelController] 사용자를 식별할 수 없어 관심 채널을 조회할 수 없습니다. 로그인이 필요합니다.");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            List<FavoriteChannelDto> channels = favoriteChannelService.getFavoriteChannelsByGoogleId(actualGoogleId);
            logger.info("[FavoriteChannelController] 사용자({})의 관심 채널 {}개 조회 완료.", actualGoogleId, channels.size());
            return ResponseEntity.ok(channels);
        } catch (Exception e) {
            logger.error("[FavoriteChannelController] 관심 채널 조회 중 서버 오류 (Google ID: {}): {}", actualGoogleId, e.getMessage(), e);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "관심 채널 조회 중 오류가 발생했습니다.", e);
        }
    }

    /**
     * 채널을 검색하고, 현재 사용자가 해당 채널을 찜했는지 여부를 포함하여 반환합니다.
     * 테스트를 위해 googleId를 @RequestParam으로 받을 수 있도록 수정합니다.
     *
     * @param keyword 검색 키워드 (채널명)
     * @param limit 가져올 최대 채널 수 (기본값: 10)
     * @param googleId   테스트용 Google ID (선택 사항)
     * @param principal Spring Security를 통해 현재 로그인한 사용자 정보 (실제 사용)
     * @return 검색 결과 채널 목록 (찜 여부 포함)
     */
    @GetMapping("/search")
    public ResponseEntity<List<ChannelSearchResultDto>> searchChannels(
            @RequestParam String keyword,
            @RequestParam(defaultValue = "10") int limit,
            @RequestParam(required = false) String googleId, // <--- 추가: 테스트용 googleId 파라미터
            Principal principal) {

        String actualGoogleId = (googleId != null && !googleId.isEmpty()) ? googleId : getCurrentUserGoogleId(principal);
        if (actualGoogleId == null || actualGoogleId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        List<ChannelSearchResultDto> results = favoriteChannelService.searchChannels(keyword, actualGoogleId, limit);
        if (results.isEmpty()) {
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.ok(results);
    }


    /**
     * 관심 채널을 등록합니다.
     * 테스트를 위해 googleId를 @RequestParam으로 받을 수 있도록 수정합니다.
     *
     * @param requestDto 찜할 채널 정보 (FavoriteChannelRequestDto)
     * @param googleId   테스트용 Google ID (선택 사항)
     * @param principal 현재 로그인한 사용자 정보 (실제 사용)
     * @return 등록된 관심 채널 정보 (FavoriteChannelDto)
     */
    @PostMapping("/add")
    public ResponseEntity<FavoriteChannelDto> addFavoriteChannel(
            @RequestBody FavoriteChannelRequestDto requestDto,
            @RequestParam(required = false) String googleId, // <--- 추가: 테스트용 googleId 파라미터
            Principal principal) {
        
        String actualGoogleId = (googleId != null && !googleId.isEmpty()) ? googleId : getCurrentUserGoogleId(principal);
        if (actualGoogleId == null || actualGoogleId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        if (requestDto.getChannelId() == null || requestDto.getChannelId().isEmpty() ||
            requestDto.getChannelName() == null || requestDto.getChannelName().isEmpty() ||
            requestDto.getChannelUrl() == null || requestDto.getChannelUrl().isEmpty()) {
            logger.warn("Invalid request to add favorite channel for user {}: Missing channelId, channelName, or channelUrl.", actualGoogleId);
            return ResponseEntity.badRequest().body(null);
        }

        try {
            FavoriteChannelDto newFavChannel = favoriteChannelService.addFavoriteChannel(actualGoogleId, requestDto);
            logger.info("User '{}' successfully added favorite channel: {}.", actualGoogleId, newFavChannel.getCnlId());
            return new ResponseEntity<>(newFavChannel, HttpStatus.CREATED); // 201 Created
        } catch (IllegalStateException e) {
            logger.warn("Failed to add favorite channel for user {}: {}", actualGoogleId, e.getMessage());
            return new ResponseEntity<>(null, HttpStatus.CONFLICT); // 409 Conflict (이미 찜한 경우)
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid channel data for adding favorite for user {}: {}", actualGoogleId, e.getMessage());
            return new ResponseEntity<>(null, HttpStatus.BAD_REQUEST); // 400 Bad Request (존재하지 않는 채널 ID)
        } catch (IOException e) {
            logger.error("Error adding favorite channel for user {}: {}", actualGoogleId, e.getMessage(), e);
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR); // 500 Internal Server Error
        }
    }


    /**
     * 관심 채널을 삭제합니다.
     * 테스트를 위해 googleId를 @RequestParam으로 받을 수 있도록 수정합니다.
     *
     * @param favId 삭제할 관심 채널의 FAV_ID
     * @param googleId   테스트용 Google ID (선택 사항)
     * @param principal 현재 로그인한 사용자 정보 (실제 사용)
     * @return 응답 상태 (204 No Content)
     */
    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteFavoriteChannel(
            @RequestParam Long favId,
            @RequestParam(required = false) String googleId, // <--- 추가: 테스트용 googleId 파라미터
            Principal principal) {
        
        String actualGoogleId = (googleId != null && !googleId.isEmpty()) ? googleId : getCurrentUserGoogleId(principal);
        if (actualGoogleId == null || actualGoogleId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }

        try {
            favoriteChannelService.deleteFavoriteChannel(actualGoogleId, favId);
            logger.info("User '{}' successfully deleted favorite channel with favId: {}.", actualGoogleId, favId);
            return ResponseEntity.noContent().build(); // 204 No Content
        } catch (IllegalArgumentException e) {
            logger.warn("Failed to delete favorite channel {} for user {}: {}", favId, actualGoogleId, e.getMessage());
            return new ResponseEntity<>(HttpStatus.NOT_FOUND); // 404 Not Found
        } catch (Exception e) {
            logger.error("Error deleting favorite channel {} for user {}: {}", favId, actualGoogleId, e.getMessage(), e);
            return new ResponseEntity<>(HttpStatus.INTERNAL_SERVER_ERROR); // 500 Internal Server Error
        }
    }

    /**
     * 관심 채널의 메모를 업데이트합니다.
     * 테스트를 위해 googleId를 @RequestParam으로 받을 수 있도록 수정합니다.
     *
     * @param channelId 업데이트할 채널 ID (UC...)
     * @param requestDto 요청 바디 (메모 내용 포함)
     * @param googleId   테스트용 Google ID (선택 사항)
     * @param principal 현재 로그인한 사용자 정보 (실제 사용)
     * @return 업데이트된 관심 채널 정보 DTO
     */
    @PutMapping("/memo")
    public ResponseEntity<FavoriteChannelDto> updateFavoriteChannelMemo(
            @RequestParam String channelId,
            @RequestBody FavoriteChannelRequestDto requestDto,
            @RequestParam(required = false) String googleId,
            Principal principal) {
        
        String actualGoogleId = (googleId != null && !googleId.isEmpty()) ? googleId : getCurrentUserGoogleId(principal);
        if (actualGoogleId == null || actualGoogleId.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        String newMemo = requestDto.getCnlMemo();

        try {
            FavoriteChannelDto updatedFavorite = favoriteChannelService.updateFavoriteChannelMemo(actualGoogleId, channelId, newMemo);
            logger.info("User '{}' successfully updated memo for channel {}.", actualGoogleId, channelId);
            return ResponseEntity.ok(updatedFavorite);
        } catch (IllegalArgumentException e) {
            logger.warn("Failed to update memo for channel {} by user {}: {}", channelId, actualGoogleId, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).build(); // 찾을 수 없거나 권한 없음
        } catch (Exception e) {
            logger.error("Error updating memo for channel {} by user {}: {}", channelId, actualGoogleId, e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }


    /**
     * 현재 로그인한 사용자의 Google ID를 추출하는 헬퍼 메서드.
     * @param principal Spring Security Principal 객체
     * @return 사용자의 Google ID (sub 클레임 또는 username)
     */
    private String getCurrentUserGoogleId(Principal principal) {
        if (principal == null) {
            logger.warn("[FavoriteChannelController] getCurrentUserGoogleId - Principal 객체가 null입니다 (인증 정보 없음).");
            return null;
        }

        // Principal.getName()이 대부분의 경우 googleId를 반환할 것으로 예상되므로, 이를 우선 사용합니다.
        // 하지만 테스트 목적으로 RequestParam googleId가 제공되면 그것을 사용하므로,
        // 이 헬퍼 메서드는 Principal에서만 가져오는 순수한 역할을 수행합니다.
        
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object authPrincipal = authentication.getPrincipal();

            if (authPrincipal instanceof OAuth2User) {
                OAuth2User oauth2User = (OAuth2User) authPrincipal;
                String googleId = oauth2User.getAttribute("sub");
                if (googleId == null) {
                    googleId = oauth2User.getName();
                    logger.warn("[FavoriteChannelController] OAuth2User에서 'sub' 클레임을 찾을 수 없습니다. 'name' 속성 사용: {}", googleId);
                }
                logger.debug("[FavoriteChannelController] Principal is OAuth2User. Google ID (sub/name): {}", googleId);
                return googleId;
            } else if (authPrincipal instanceof UserDetails) {
                UserDetails userDetails = (UserDetails) authPrincipal;
                String googleId = userDetails.getUsername();
                logger.debug("[FavoriteChannelController] Principal is UserDetails. Google ID (username): {}", googleId);
                return googleId;
            } else if (authPrincipal instanceof String && !"anonymousUser".equals(authPrincipal)) {
                logger.warn("[FavoriteChannelController] Principal is String and not anonymous. Returning as is: {}", authPrincipal);
                return (String) authPrincipal;
            } else if ("anonymousUser".equals(authPrincipal)) {
                logger.warn("[FavoriteChannelController] 익명 사용자 요청입니다. 로그인되지 않았습니다.");
            } else {
                logger.error("[FavoriteChannelController] 처리되지 않은 Principal 타입입니다: {}", authPrincipal.getClass().getName());
            }
        } else {
            logger.warn("[FavoriteChannelController] 유효한 Authentication 객체를 찾을 수 없거나 인증되지 않았습니다.");
        }
        return null;
    }
}