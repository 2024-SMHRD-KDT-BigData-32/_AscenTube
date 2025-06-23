package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.YouTubeVideo;

public interface YouTubeVideoRepository extends JpaRepository<YouTubeVideo, Long>{
    Optional<YouTubeVideo> findById(Long videoId);
	Optional<YouTubeVideo> findByVideoKey(String videoKey);
	List<YouTubeVideo> findByChannelId(String channelId);
	List<YouTubeVideo> findByChannelIdOrderByUploadedAtDesc(String channelId);
	long countByChannelId(String channelId);
	List<YouTubeVideo> findByChannelIdAndUploadedAtBetweenOrderByUploadedAtAsc(String channelId, LocalDateTime startDateTime, LocalDateTime endDateTime);
}
