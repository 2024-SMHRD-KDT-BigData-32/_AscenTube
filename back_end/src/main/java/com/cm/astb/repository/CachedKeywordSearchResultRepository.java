package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.CachedKeywordSearchResult;
import com.cm.astb.entity.CachedKeywordSearchResultId;

public interface CachedKeywordSearchResultRepository extends JpaRepository<CachedKeywordSearchResult, CachedKeywordSearchResultId>{
	Optional<CachedKeywordSearchResult> findById_KeywordAndId_CollectionDateAndId_VideoCategoryId(
            String keyword, LocalDateTime collectionDate, String videoCategoryId);
	/**
     * 특정 키워드의 가장 최신 수집 날짜에 해당하는 검색 결과를 조회.
     *
     * @Query("SELECT s FROM CachedKeywordSearchResult s WHERE s.id.keyword = :keyword AND s.id.videoCategoryId = :categoryId ORDER BY s.id.collectionDate DESC")
     * List<CachedKeywordSearchResult> findLatestByKeywordAndCategory(@Param("keyword") String keyword, @Param("categoryId") String categoryId, Pageable pageable);
     */
}
