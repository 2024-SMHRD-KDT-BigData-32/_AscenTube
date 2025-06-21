package com.cm.astb.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChannelKeywordDto {
    private String text;
    private Integer weight;
}