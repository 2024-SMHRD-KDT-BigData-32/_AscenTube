package com.cm.astb.entity;

import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import com.google.auto.value.AutoValue.Builder;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "TB_VIDEO")
public class YouTubeVideo {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	@Column(name = "VIDEO_ID", length = 100)
	private Long videoId;

	@Column(name = "VIDEO_KEY", length = 50, nullable = false, unique = true)
	private String videoKey;

	@Column(name = "CNL_ID", length = 100, nullable = false)
	private String channelId;

	@Column(name = "VIDEO_TITLE", length = 255, nullable = false)
	private String videoTitle;

	@Column(name = "VIDEO_TAGS", length = 1000)
	private String videoTags;

	@Lob
	@Column(name = "VIDEO_DESC", columnDefinition = "TEXT")
	private String videoDescription;

	@Column(name = "THUMBNAIL_URL", length = 1000)
	private String thumbnailUrl;

	@Column(name = "VIDEO_CATEGORY", length = 50)
	private String videoCategory;

	@Column(name = "VIDEO_LANGUAGE", length = 20)
	private String videoLanguage;

	@Column(name = "PUBLIC_YN", length = 1)
	private String publicYn;

	@Column(name = "VIDEO_PLAYTIME")
	private Integer videoPlaytime;

	@Column(name = "UPLOADED_AT")
	private LocalDateTime uploadedAt;

	@CreationTimestamp
	@Column(name = "CREATED_AT", nullable = false, updatable = false)
	private LocalDateTime createdAt;

	@UpdateTimestamp
	@Column(name = "UPDATED_AT", nullable = false)
	private LocalDateTime updatedAt;
}
