package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.Comment;

public interface CommentRepository  extends JpaRepository<Comment, String>{
	List<Comment> findByVideoId(Long videoID);
	/**
     * 특정 비디오 ID 목록에 해당하는 댓글들을 특정 작성 기간 내에서 조회합니다.
     */
    List<Comment> findByVideoIdInAndCommentWriteAtBetween(List<Long> videoIds, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 특정 비디오 ID 목록에 해당하는 댓글들을 특정 작성 기간 내에서 최신 작성일시 기준으로 내림차순 조회합니다.
     */
    List<Comment> findByVideoIdInAndCommentWriteAtBetweenOrderByCommentWriteAtDesc(List<Long> videoIds, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 특정 비디오 ID 목록에 해당하는 댓글들을 특정 작성 기간 내에서 좋아요 수 기준으로 내림차순 조회합니다.
     */
    List<Comment> findByVideoIdInAndCommentWriteAtBetweenOrderByCommentLikeCountDesc(List<Long> videoIds, LocalDateTime startDate, LocalDateTime endDate);

    /**
     * 특정 비디오 ID 목록에 해당하는 댓글들을 특정 작성 기간 내에서
     * 삭제 여부(isDeleted)를 기준으로 필터링하여 조회합니다.
     */
    List<Comment> findByVideoIdInAndCommentWriteAtBetweenAndIsDeleted(List<Long> videoIds, LocalDateTime startDate, LocalDateTime endDate, String isDeleted);
    
    List<Comment> findByVideoIdAndIsDeleted(Long videoId, String isDeleted);
    List<Comment> findByVideoIdAndIsDeletedOrderByCommentWriteAtDesc(Long videoId, String isDeleted);
    List<Comment> findByVideoIdAndIsDeletedOrderByCommentLikeCountDesc(Long videoId, String isDeleted);
    
}
