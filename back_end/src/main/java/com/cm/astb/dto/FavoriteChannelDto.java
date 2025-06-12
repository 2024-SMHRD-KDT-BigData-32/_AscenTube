// FavoriteChannelDto.java
package com.cm.astb.dto; // 실제 프로젝트의 DTO 패키지 경로에 맞게 수정해주세요.

import java.time.format.DateTimeFormatter;

import com.cm.astb.entity.FavoriteChannel; // 엔티티 패키지 경로

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data // Lombok: Getter, Setter, toString, equals, hashCode 자동 생성
@Builder // Lombok: 빌더 패턴 구현
@NoArgsConstructor // Lombok: 기본 생성자
@AllArgsConstructor // Lombok: 모든 필드를 인자로 받는 생성자
public class FavoriteChannelDto {

    private Long favId;         // TB_FAVORITE_CHANNEL의 FAV_ID (PK)
    private String googleId;    // 해당 관심 채널을 등록한 사용자의 GOOGLE_ID
    private String cnlId;       // 관심 채널의 YouTube 고유 ID (@handle 또는 UC... 형태)
    private String cnlName;     // 채널명
    private String cnlUrl;      // 채널 URL (@핸들 포함 URL)
    private String cnlMemo;     // 사용자가 입력한 메모
    private String createdAt;   // 등록일시 (ISO 8601 형식의 문자열)
    private String updatedAt;   // 수정일시 (ISO 8601 형식의 문자열)

    /**
     * FavoriteChannel 엔티티 객체로부터 FavoriteChannelDto 객체를 생성합니다.
     * 날짜/시간 필드는 ISO 8601 형식의 문자열로 변환합니다.
     *
     * @param entity FavoriteChannel 엔티티 객체
     * @return FavoriteChannelDto 객체
     */
    public static FavoriteChannelDto fromEntity(FavoriteChannel entity) {
        if (entity == null) {
            return null;
        }
        return FavoriteChannelDto.builder()
                .favId(entity.getFavId())
                .googleId(entity.getGoogleId())
                .cnlId(entity.getCnlId()) // 엔티티의 cnlId를 그대로 사용
                .cnlName(entity.getCnlName())
                .cnlUrl(entity.getCnlUrl())
                .cnlMemo(entity.getCnlMemo())
                .createdAt(entity.getCreatedAt() != null ? entity.getCreatedAt().format(DateTimeFormatter.ISO_DATE_TIME) + "Z" : null)
                .updatedAt(entity.getUpdatedAt() != null ? entity.getUpdatedAt().format(DateTimeFormatter.ISO_DATE_TIME) + "Z" : null)
                .build();
    }
}
