package com.cm.astb.repository;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import com.cm.astb.entity.User;

@Repository
public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByGoogleId(String googleId);
}
