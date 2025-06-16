package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.DeviceAnalysis;
import com.cm.astb.entity.DeviceAnalysisId;
import com.cm.astb.entity.DeviceType;

public interface DeviceAnalysisRepository extends JpaRepository<DeviceAnalysis, DeviceAnalysisId>{
	List<DeviceAnalysis> findById_VideoIdOrderById_StatsDateDesc(Integer videoId);

    Optional<DeviceAnalysis> findById_VideoIdAndId_DeviceTypeAndId_StatsDate(
        Integer videoId, DeviceType deviceType, LocalDateTime statsDate);
}
