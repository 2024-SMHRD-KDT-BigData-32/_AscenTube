package com.cm.astb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.io.Serializable;
import java.time.LocalDateTime;

@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode
public class ChannelDashboardStatsId implements Serializable {

	private static final long serialVersionUID = 1L;

	@Column(name = "CNL_ID", length = 100)
    private String channelId;

    @Column(name = "STATS_DATE")
    private LocalDateTime statsDate;
}