package com.cm.astb.repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import com.cm.astb.entity.YouTubeChannel;

public interface YouTubeChannelRepository extends JpaRepository<YouTubeChannel, String>{
	Optional<YouTubeChannel> findByChannelId(String channelId);
	List<YouTubeChannel> findByUpdatedAtBefore(LocalDateTime dateTime);
	
	/**
     * 채널명에 특정 키워드가 포함된 채널을 대소문자 구분 없이 검색하고 페이징 처리합니다.
     * @param channelNameKeyword 검색할 채널명 키워드
     * @param pageable 페이징 및 정렬 정보
     * @return 검색된 YouTubeChannel 리스트 (Pageable에 따라 제한)
     */
    List<YouTubeChannel> findByTitleContainingIgnoreCase(String channelNameKeyword, Pageable pageable);

    /**
     * 특정 채널 ID 목록에 해당하는 YouTube 채널 정보들을 조회합니다.
     * @param channelIds 조회할 채널 ID 리스트
     * @return 해당 채널 ID를 가진 YouTubeChannel 리스트
     */
    List<YouTubeChannel> findByChannelIdIn(List<String> channelIds);
}
