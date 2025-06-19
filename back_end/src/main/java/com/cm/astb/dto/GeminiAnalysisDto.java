package com.cm.astb.dto;

import lombok.Data;

// @Data 어노테이션은 Lombok 라이브러리의 기능으로,
// 아래 필드들에 대한 Getter, Setter, toString 등을 자동으로 만들어줍니다.
@Data
public class GeminiAnalysisDto {
    private String userId;
    private String transcript;
}