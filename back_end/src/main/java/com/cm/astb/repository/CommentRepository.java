package com.cm.astb.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.Comment;

public interface CommentRepository  extends JpaRepository<Comment, String>{
	List<Comment> findByVideoId(Long videoID);
}
