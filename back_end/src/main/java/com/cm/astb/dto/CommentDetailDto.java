package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class CommentDetailDto {
    private String commentId;
    private String videoKey;
    private String videoTitle;
    private String commentContent;
    private String commentWriterName;
    private Integer commentLikeCount;
    private LocalDateTime commentWriteAt;
    private String sentimentType;
    private String speechAct;
}