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
@Embeddable
public class ChannelStatsId implements Serializable{
	
	private static final long serialVersionUID = 1L;
	
	@Column(name = "CNL_ID", length = 100, nullable = false)
    private String channelId;

    @Column(name = "STATS_DATE", nullable = false)
    private LocalDateTime statsDate;

    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (o == null || getClass() != o.getClass()) return false;
        ChannelStatsId that = (ChannelStatsId) o;
	        return Objects.equals(channelId, that.channelId) &&
               Objects.equals(statsDate, that.statsDate);
    }

    @Override
    public int hashCode() {
        return Objects.hash(channelId, statsDate);
    }
}
