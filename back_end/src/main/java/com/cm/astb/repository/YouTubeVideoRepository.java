package com.cm.astb.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.YouTubeVideo;

public interface YouTubeVideoRepository extends JpaRepository<YouTubeVideo, Long>{
	Optional<YouTubeVideo> findByVideoKey(String videoKey);
	List<YouTubeVideo> findByChannelId(String channelId);
	List<YouTubeVideo> findByChannelIdOrderByUploadedAtDesc(String channelId);
}
