package com.cm.astb.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.dto.UserLoginResultDto;
import com.cm.astb.entity.User;
import com.cm.astb.repository.UserRepository;

@Service
public class UserService {

    private static final Logger logger = LoggerFactory.getLogger(UserService.class);

	private final UserRepository userRepository;


	public UserService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Transactional
	public UserLoginResultDto findOrCreateUser(String googleId, String email, String nickname, String profileImg, String refreshToken) { // <--- 반환 타입 변경
        Optional<User> existingUserOpt = userRepository.findByGoogleId(googleId);

        if (existingUserOpt.isPresent()) { // 기존 사용자
            User user = existingUserOpt.get();
            logger.info("Existing user logged in: {}", googleId);
            user.setEmail(email);
            user.setNickname(nickname);
            user.setProfileImg(profileImg);
            user.setGoogleRefreshToken(refreshToken);
            user.setUpdatedAt(LocalDateTime.now());
            return UserLoginResultDto.builder().user(userRepository.save(user)).isNewUser(false).build(); // isNewUser = false
        } else { // 신규 사용자
            logger.info("New user registered: {}", googleId);
            User newUser = User.builder()
                    .googleId(googleId)
                    .email(email)
                    .nickname(nickname)
                    .profileImg(profileImg)
                    .googleRefreshToken(refreshToken)
                    .joinedAt(LocalDateTime.now())
                    .updatedAt(LocalDateTime.now())
                    .build();
            return UserLoginResultDto.builder().user(userRepository.save(newUser)).isNewUser(true).build(); // isNewUser = true
        }
    }
	
	/**
     * 사용자의 Google 채널 ID를 업데이트합니다.
     * 이 메서드는 OAuthController.oauth2Callback 또는 OAuthService.exchangeCodeForTokens에서 호출됩니다.
     * @param googleId 사용자 Google ID
     * @param myChannelId 사용자 채널 ID (UC... 형식)
     */
    @Transactional
    public void updateUserChannelId(String googleId, String myChannelId) {
        userRepository.findByGoogleId(googleId).ifPresentOrElse(
            user -> {
                // 기존 채널 ID와 다를 경우에만 업데이트
                if (myChannelId != null && !myChannelId.equals(user.getMyChannelId())) {
                    user.setMyChannelId(myChannelId);
                    user.setUpdatedAt(LocalDateTime.now());
                    userRepository.save(user);
                    logger.info("User {}'s channel ID updated to: {}", googleId, myChannelId);
                } else if (myChannelId == null && user.getMyChannelId() != null) {
                    // 새 myChannelId가 null인데 기존 myChannelId는 있는 경우 (예: 채널이 사라진 경우)
                    user.setMyChannelId(null);
                    user.setUpdatedAt(LocalDateTime.now());
                    userRepository.save(user);
                    logger.info("User {}'s channel ID cleared as it became null.", googleId);
                } else {
                    logger.debug("User {}'s channel ID is already {} or no new ID provided. No update needed.", googleId, myChannelId);
                }
            },
            () -> logger.warn("User {} not found when trying to update channel ID {}. Skipping update.", googleId, myChannelId)
        );
    }

	public Optional<User> findByGoogleId(String googleId) {
		return userRepository.findByGoogleId(googleId);
	}

	public List<User> findAllUsers() {
		return userRepository.findAll();
	}

	public Optional<User> findUserByChannelId(String channelId) {
		return userRepository.findByMyChannelId(channelId);
	}
}