package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.InflowRoute;
import com.cm.astb.entity.InflowRouteId;

public interface InflowRepository extends JpaRepository<InflowRoute, InflowRouteId>{
	List<InflowRoute> findById_VideoIdOrderById_StatsDateDesc(Integer videoId);
	Optional<InflowRoute> findById_VideoIdAndId_InflowTypeAndId_StatsDate(
	        Integer videoId, String inflowType, LocalDateTime statsDate);
}
