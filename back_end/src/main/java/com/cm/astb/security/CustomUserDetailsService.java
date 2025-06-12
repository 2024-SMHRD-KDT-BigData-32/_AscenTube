package com.cm.astb.security;

import java.util.Optional;

import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

import com.cm.astb.entity.User;
import com.cm.astb.service.UserService;

@Service
public class CustomUserDetailsService implements UserDetailsService {

	private final UserService userService;

	public CustomUserDetailsService(UserService userService) {
		this.userService = userService;
	}

	@Override
	public UserDetails loadUserByUsername(String googleId) throws UsernameNotFoundException {
		Optional<User> user = userService.findByGoogleId(googleId);
		if(!user.isPresent()) {
			throw new UsernameNotFoundException("User not found with googleId: " + googleId);
		}
		return new CustomUserDetails(user);
	}

}
