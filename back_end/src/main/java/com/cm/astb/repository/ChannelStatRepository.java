package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.ChannelStat;
import com.cm.astb.entity.ChannelStatsId;

public interface ChannelStatRepository extends JpaRepository<ChannelStat, ChannelStatsId> {
	List<ChannelStat> findById_ChannelIdOrderById_StatsDateDesc(String channelId);
	Optional<ChannelStat> findById_ChannelIdAndId_StatsDate(String channelId, LocalDateTime statsDate);
	List<ChannelStat> findById_ChannelIdAndId_StatsDateBetween(String channelId, LocalDateTime startDate,
			LocalDateTime endDate);
}
