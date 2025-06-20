package com.cm.astb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId; // @EmbeddedId 임포트
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "TB_CHANNEL_STATS")
public class ChannelStat { 

    @EmbeddedId
    private ChannelStatsId id;
    
    @Column(name = "SUBSCRIBER_GAINED")
    private Integer subscriberGained;

    @Column(name = "DAILY_VIEWS_CNT")
    private Long dailyViewsCnt;

    @Column(name = "ESTIMATED_MIN_WATCHED")
    private Long estimatedMinWatched;
    
    @Column(name = "AVG_VIEW_DURATION")
    private Long avgViewDuration;
    
    @Column(name = "SUBSCRIBER_CNT")
    private Long subscriberCnt;

    @Column(name = "TOTAL_VIEWS_CNT")
    private Long totalViewsCnt;

    @Column(name = "TOTAL_WATCH_TIME")
    private Long totalWatchTime;

    @Column(name = "VIDEOS_CNT")
    private Long videosCnt;
    
    @CreationTimestamp
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;
}