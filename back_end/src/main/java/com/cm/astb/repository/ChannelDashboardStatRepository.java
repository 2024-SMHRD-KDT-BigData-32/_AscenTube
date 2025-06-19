package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.ChannelDashboardStat;
import com.cm.astb.entity.ChannelDashboardStatsId;

public interface ChannelDashboardStatRepository extends JpaRepository<ChannelDashboardStat, ChannelDashboardStatsId>{
    Optional<ChannelDashboardStat> findById_ChannelIdAndId_StatsDate(String channelId, LocalDateTime collectionDate);
}
