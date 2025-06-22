package com.cm.astb.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
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
@Table(name = "TB_COMMENT")
public class Comment {

    @Id
    @Column(name = "CMT_ID", length = 100, nullable = false)
    private String commentId;

    @Column(name = "VIDEO_ID", nullable = false)
    private Long videoId;

    @Column(name = "CMT_WRITE_NAME", length = 255)
    private String commentWriterName;

    @Lob
    @Column(name = "CMT_CONTENT", columnDefinition = "TEXT")
    private String commentContent;

    @Column(name = "CMT_LIKE_CNT")
    private Integer commentLikeCount;

    @Column(name = "CMT_WRITE_AT")
    private LocalDateTime commentWriteAt;

    @Column(name = "CRAWLED_AT")
    private LocalDateTime crawledAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "SENTIMENT_TYPE", length = 20)
    private SentimentType sentimentType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "SPEECH_ACT", length = 20)
    private SpeechActType speechAct;

    @Column(name = "IS_DELETED", length = 1)
    private String isDeleted;

    @Column(name = "DELETED_AT")
    private LocalDateTime deletedAt;

    @CreationTimestamp
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;
    
    @Column(name = "PREPROCESSING_YN", length = 1)
    private String preprocessingYn;
}