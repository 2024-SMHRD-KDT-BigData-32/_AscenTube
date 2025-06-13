package com.cm.astb.service;

import java.util.List;
import java.util.Optional;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.entity.User;
import com.cm.astb.repository.UserRepository;

@Service
public class UserService {


	private final UserRepository userRepository;


	public UserService(UserRepository userRepository) {
		this.userRepository = userRepository;
	}

	@Transactional
	public User findOrCreateUser(String googleId, String email, String nickname, String profileImg, String googleRefreshToken) {
		Optional<User> optionalUser = userRepository.findByGoogleId(googleId);

		User user;

		if (optionalUser.isEmpty()) {
			 user = User.builder()
					 .googleId(googleId)
					 .email(email)
					 .nickname(nickname)
					 .profileImg(profileImg)
					 .googleRefreshToken(googleRefreshToken)
					 .googleCredentialJson(null)
					 .build();

			 user = userRepository.save(user);
			 System.out.println("새로운 사용자 등록: " + user.getNickname() + "(" + user.getEmail() + ")" );
		} else {
			user = optionalUser.get();

			boolean isChanged = false;

			if (nickname != null && !nickname.equals(user.getNickname())) {
				user.setNickname(nickname);
				isChanged = true;
			}
			if (email != null && !email.equals(user.getEmail())) {
				user.setEmail(email);
				isChanged = true;
			}
			if (profileImg != null && !profileImg.equals(user.getProfileImg())) {
				user.setProfileImg(profileImg);
				isChanged = true;
			}
			if(googleRefreshToken != null && !googleRefreshToken.equals(user.getGoogleRefreshToken())) {
				user.setGoogleRefreshToken(googleRefreshToken);
				isChanged = true;
			}

			if(isChanged) {
				user = userRepository.save(user);
				System.out.println("기존 사용자 정보 업데이트: " + user.getNickname() + " (" + user.getEmail() + ")");
			}
		}
		return user;
	}

	public Optional<User> findByGoogleId(String googleId) {
		return userRepository.findByGoogleId(googleId);
	}

	public List<User> findAllUsers() {
		return userRepository.findAll();
	}
}
