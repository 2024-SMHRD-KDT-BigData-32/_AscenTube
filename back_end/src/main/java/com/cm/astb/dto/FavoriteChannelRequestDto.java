// FavoriteChannelRequestDto.java
package com.cm.astb.dto; // 실제 프로젝트의 DTO 패키지 경로에 맞게 수정해주세요.

// import jakarta.validation.constraints.NotBlank; // 유효성 검사를 위해 필요시 추가
// import jakarta.validation.constraints.Size;    // 유효성 검사를 위해 필요시 추가
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data // Lombok: Getter, Setter, toString, equals, hashCode 자동 생성
@NoArgsConstructor // Lombok: 기본 생성자
@AllArgsConstructor // Lombok: 모든 필드를 인자로 받는 생성자 (선택 사항)
public class FavoriteChannelRequestDto {

    // @NotBlank(message = "채널 URL 또는 채널 ID는 필수입니다.") // 유효성 검사 예시
    // @Size(max = 1000, message = "채널 URL은 최대 1000자까지 입력 가능합니다.")
    private String channelUrl; // 사용자가 입력하는 채널 URL (예: @handle, /channel/UC..., /c/customUrl)
                               // 또는 채널 ID (@handle, UC...) 자체를 받을 수도 있음.
                               // API 설계 시 cnlId와 cnlUrl 중 어떤 것을 받을지, 또는 둘 다 받을지 명확히 하는 것이 좋음.
                               // 현재 API 설계 v3에서는 channelUrl을 받도록 되어 있음.

    // @Size(max = 500, message = "메모는 최대 500자까지 입력 가능합니다.") // 유효성 검사 예시
    private String cnlMemo;    // 사용자가 입력하는 메모 (선택 사항)
    private String channelId;
    private String channelName;

}
