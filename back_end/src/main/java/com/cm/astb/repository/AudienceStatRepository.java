package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.AgeGroup;
import com.cm.astb.entity.AudienceStat;
import com.cm.astb.entity.AudienceStatsId;
import com.cm.astb.entity.Gender;

public interface AudienceStatRepository extends JpaRepository<AudienceStat, AudienceStatsId>{
	List<AudienceStat> findById_VideoIdOrderById_StatsDateDesc(Integer videoId);
	Optional<AudienceStat> findById_VideoIdAndId_GenderAndId_AgeGroupAndId_StatsDate(
	        Integer videoId, Gender gender, AgeGroup ageGroup, LocalDateTime statsDate);
}