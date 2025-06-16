package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.Insight;
import com.cm.astb.entity.InsightType;
import com.cm.astb.entity.SourceType;

public interface InsightRepository extends JpaRepository<Insight, Integer> {
	 List<Insight> findByVideoIdAndInsightTypeOrderByStatsDateDesc(Long videoId, InsightType insightType); // VIDEO_ID와 INSIGHT_TYPE으로 조회 (날짜 내림차순)
	    Optional<Insight> findByVideoIdAndSourceTypeAndStatsDateAndInsightType(
	        Long videoId, SourceType sourceType, LocalDateTime statsDate, InsightType insightType);
}
