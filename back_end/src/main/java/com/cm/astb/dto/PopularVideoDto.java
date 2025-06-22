package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class PopularVideoDto {
    private String videoKey;
    private String videoTitle;
    private String thumbnailUrl;
    private String channelId;
    private String channelTitle;
    private LocalDateTime publishedAt;
    private String videoCategoryId;
    private Long viewsCount; // <--- 이 필드를 다시 추가합니다.
    // Integer likeCount; // 필요하다면 추가
    // Integer commentCount; // 필요하다면 추가
}