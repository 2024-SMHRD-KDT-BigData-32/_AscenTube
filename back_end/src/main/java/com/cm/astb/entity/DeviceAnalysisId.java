package com.cm.astb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class DeviceAnalysisId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "VIDEO_ID", nullable = false)
    private Integer videoId;

    @Enumerated(EnumType.STRING)
    @Column(name = "DEVICE_TYPE", nullable = false)
    private DeviceType deviceType;

    @Column(name = "STATS_DATE", nullable = false)
    private LocalDateTime statsDate;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        DeviceAnalysisId that = (DeviceAnalysisId) o;
        return Objects.equals(videoId, that.videoId) &&
               Objects.equals(deviceType, that.deviceType) &&
               Objects.equals(statsDate, that.statsDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(videoId, deviceType, statsDate);
    }
}