package com.cm.astb.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "TB_YT_CHANNEL")
public class YouTubeChannel {

	@Id
	@Column(name = "CNL_ID", length = 100)
	private String channelId;

	@Column(name = "CNL_NAME", length = 255, nullable = false)
	private String title;

	@Lob
	@Column(name = "CNL_INFO", columnDefinition = "TEXT")
	private String description;

	@Column(name = "CNL_URL", length = 1000, nullable = false)
	private String channelCustomUrl;

	@CreationTimestamp
	@Column(name = "CREATED_AT", nullable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "UPDATED_AT", nullable = false)
	private LocalDateTime updatedAt;

	@Column(name = "VIEW_COUNT")
	private Long viewCount;

	@Column(name = "SUBSCRIBER_COUNT")
	private Long subscriberCount;

	@Column(name = "VIDEO_COUNT")
	private Long videoCount;

	@Column(name = "YOUTUBE_PUBLISHED_AT")
	private LocalDateTime youtubePublishedAt;

	@Column(name = "THUMBNAIL_URL", length = 1000)
	private String thumbnailUrl;
	
	@Column(name = "UPLOADS_PLAYLIST_ID", length = 100)
	private String uploadsPlaylistId;
	
	
}