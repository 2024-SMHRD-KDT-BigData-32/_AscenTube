package com.cm.astb.entity;

import java.io.Serializable;
import java.time.LocalDateTime;
import java.util.Objects;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable	// embedding to another entity
public class VideoStatsId implements Serializable{
	
	private static final long serialVersionUID = 1L;
	
	@Column(name = "VIDEO_ID", nullable = false)
    private Long videoId;

    @Column(name = "STATS_DATE", nullable = false)
    private LocalDateTime statsDate;
    
    
	@Override
	public boolean equals(Object o) {
		if (this == o ) return true;
		if (o == null || getClass() != o.getClass()) return false;
		VideoStatsId that = (VideoStatsId) o;
		return Objects.equals(videoId, that.videoId) && Objects.equals(statsDate, that.statsDate);
	}
	
	@Override
	public int hashCode() {
		return Objects.hash(videoId, statsDate);
	}
}
