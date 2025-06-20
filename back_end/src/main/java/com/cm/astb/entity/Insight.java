package com.cm.astb.entity; // 적절한 패키지 경로로 변경

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.EnumType; // EnumType 임포트
import jakarta.persistence.Enumerated; // Enumerated 임포트
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
@Table(name = "TB_INSIGHT")
public class Insight {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "INSIGHT_ID")
    private Integer insightId;

    @Column(name = "VIDEO_ID", nullable = false)
    private Long videoId;

    @Column(name = "GOOGLE_ID", length = 100)
    private String googleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "SOURCE_TYPE", length = 10)
    private SourceType sourceType;

    @Column(name = "STATS_DATE", nullable = false)
    private LocalDateTime statsDate;

    @Enumerated(EnumType.STRING)
    @Column(name = "INSIGHT_TYPE", length = 10)
    private InsightType insightType;

    @Lob
    @Column(name = "INSIGHT_CONTENT", columnDefinition = "TEXT", nullable = false)
    private String insightContent;

    @CreationTimestamp
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;
}