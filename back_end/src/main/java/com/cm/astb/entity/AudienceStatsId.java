package com.cm.astb.entity;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class AudienceStatsId implements Serializable{
	
	private static final long serialVersionUID = 1L;
	
	@Column(name = "VIDEO_ID", nullable = false)
    private Integer videoId;

    @Enumerated(EnumType.STRING)
    @Column(name = "GENDER", nullable = false)
    private Gender gender;

    @Enumerated(EnumType.STRING)
    @Column(name = "AGE_GROUP", nullable = false)
    private AgeGroup ageGroup;

    @Column(name = "STATS_DATE", nullable = false)
    private LocalDateTime statsDate;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        AudienceStatsId that = (AudienceStatsId) o;
        return Objects.equals(videoId, that.videoId) &&
               Objects.equals(gender, that.gender) &&
               Objects.equals(ageGroup, that.ageGroup) &&
               Objects.equals(statsDate, that.statsDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(videoId, gender, ageGroup, statsDate);
    }

}
