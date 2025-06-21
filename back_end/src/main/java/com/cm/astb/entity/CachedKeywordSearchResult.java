package com.cm.astb.entity;

import java.io.Serializable;
import java.time.LocalDateTime;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import jakarta.persistence.Column;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.Lob;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "TB_CACHED_KEYWORD_SEARCH_RESULT")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CachedKeywordSearchResult implements Serializable {

    private static final long serialVersionUID = 1L;

    @EmbeddedId
    private CachedKeywordSearchResultId id;

    @Lob // LONGTEXT 매핑
    @Column(name = "SEARCH_RESULTS_JSON", columnDefinition = "LONGTEXT")
    private String searchResultsJson;

    @CreationTimestamp
    @Column(name = "CREATED_AT", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "UPDATED_AT", nullable = false)
    private LocalDateTime updatedAt;
}