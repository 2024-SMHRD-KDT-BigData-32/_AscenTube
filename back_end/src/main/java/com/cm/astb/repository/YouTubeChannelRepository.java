package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.YouTubeChannel;

public interface YouTubeChannelRepository extends JpaRepository<YouTubeChannel, String>{
	Optional<YouTubeChannel> findByChannelId(String channelId);
	List<YouTubeChannel> findByUpdatedAtBefore(LocalDateTime dateTime);
}
