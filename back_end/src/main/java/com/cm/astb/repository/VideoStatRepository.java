package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.VideoStat;
import com.cm.astb.entity.VideoStatsId;

public interface VideoStatRepository extends JpaRepository<VideoStat, VideoStatsId> {
	
	List<VideoStat> findById_VideoIdOrderById_StatsDateDesc(Integer videoId);
	Optional<VideoStat> findById_VideoIdAndId_StatsDate(Integer videoId, LocalDateTime statsDate);
}
