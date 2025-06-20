// src/main/java/com/cm/astb/entity/ChannelDashboardStat.java
package com.cm.astb.entity;

import java.io.Serializable;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Lob; // JSON 텍스트 저장을 위해 @Lob 사용
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "TB_CHANNEL_DASHBOARD_STATS")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChannelDashboardStat implements Serializable {

	private static final long serialVersionUID = 1L;

	@EmbeddedId
    private ChannelDashboardStatsId id;

	@Lob
    @Column(name = "GENDER_DISTRIBUTION_JSON", columnDefinition = "LONGTEXT") // columnDefinition 추가
    private String genderDistributionJson;

    @Lob
    @Column(name = "AGE_GROUP_DISTRIBUTION_JSON", columnDefinition = "LONGTEXT") // columnDefinition 추가
    private String ageGroupDistributionJson;

    @Lob
    @Column(name = "COUNTRY_DISTRIBUTION_JSON", columnDefinition = "LONGTEXT") // columnDefinition 추가
    private String countryDistributionJson;

    @Lob
    @Column(name = "TRAFFIC_SOURCE_DISTRIBUTION_JSON", columnDefinition = "LONGTEXT") // columnDefinition 추가
    private String trafficSourceDistributionJson;

    @Lob
    @Column(name = "DEVICE_DISTRIBUTION_JSON", columnDefinition = "LONGTEXT")
    private String deviceDistributionJson;
    
    @CreationTimestamp
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;
}