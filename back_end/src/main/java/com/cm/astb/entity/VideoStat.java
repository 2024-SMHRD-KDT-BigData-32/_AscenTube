package com.cm.astb.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.google.auto.value.AutoValue.Builder;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "TB_VIDEO_STATS")
public class VideoStat {
	
	@EmbeddedId
    private VideoStatsId id;

    @Column(name = "VIEW_CNT")
    private Long viewCount;

    @Column(name = "LIKE_CNT")
    private Integer likeCount;

    @Column(name = "CMT_CNT")
    private Integer commentCount;

    @Column(name = "AVG_WATCH_TIME")
    private Integer avgWatchTime;

    @CreationTimestamp
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;
}
