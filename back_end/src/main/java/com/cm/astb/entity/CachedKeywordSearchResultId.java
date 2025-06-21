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
public class CachedKeywordSearchResultId implements Serializable {

    private static final long serialVersionUID = 1L;

    @Column(name = "KEYWORD", length = 255)
    private String keyword;

    @Column(name = "COLLECTION_DATE")
    private LocalDateTime collectionDate;

    @Column(name = "VIDEO_CATEGORY_ID", length = 50)
    private String videoCategoryId = "ALL";
}