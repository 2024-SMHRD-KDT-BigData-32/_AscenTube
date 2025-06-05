package com.cm.astb.security;

import java.util.Collection;
import java.util.Collections;
import java.util.Optional;

import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import com.cm.astb.entity.User;

public class CustomUserDetails implements UserDetails{
	
	private Optional<User> user;

	public CustomUserDetails(Optional<User> user) {
		this.user = user;
	}

	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		return Collections.singletonList(new SimpleGrantedAuthority("ROLE_USER"));
	}

	@Override
	public String getPassword() {
		return null;
	}

	@Override
	public String getUsername() {
		return user.get().getGoogleId();	//  Spring Security에서는 이 값을 'username'으로 간주
	}
	
	@Override
	public boolean isAccountNonExpired() {
		return true;
	}
	
    @Override
    public boolean isAccountNonLocked() {
        return true;
    }

    @Override
    public boolean isCredentialsNonExpired() {
        return true;
    }

    @Override
    public boolean isEnabled() {
        return true;
    }

    public Optional<User> getUser() {
        return user;
    }
}
