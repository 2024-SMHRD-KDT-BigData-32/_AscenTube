// FavoriteChannel.java
package com.cm.astb.entity; // 실제 프로젝트의 엔티티 패키지 경로에 맞게 수정해주세요.

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
// jakarta.persistence.ManyToOne; // User 엔티티와 관계 매핑 시 필요
// jakarta.persistence.FetchType; // User 엔티티와 관계 매핑 시 필요
// jakarta.persistence.JoinColumn; // User 엔티티와 관계 매핑 시 필요
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data // Lombok: Getter, Setter, toString, equals, hashCode 자동 생성
@Builder // Lombok: 빌더 패턴 사용 가능
@NoArgsConstructor // Lombok: 파라미터 없는 기본 생성자 자동 생성
@AllArgsConstructor // Lombok: 모든 필드를 파라미터로 받는 생성자 자동 생성
@Entity // JPA 엔티티임을 선언
@Table(name = "TB_FAVORITE_CHANNEL", uniqueConstraints = {
    // 한 명의 사용자가 동일한 채널을 중복으로 등록하는 것을 방지하기 위한 유니크 제약조건
    // CNL_ID는 @handle 또는 UC... 형태의 채널 식별자를 저장한다고 가정
    @UniqueConstraint(name = "UK_FAV_CHANNEL_GOOGLE_CNL", columnNames = {"GOOGLE_ID", "CNL_ID"})
})
public class FavoriteChannel {

    @Id // 기본키(Primary Key)임을 선언
    @GeneratedValue(strategy = GenerationType.IDENTITY) // 데이터베이스의 자동 증가 기능 사용 (예: MySQL의 AUTO_INCREMENT)
    @Column(name = "FAV_ID")
    private Long favId; // 관심채널 고유번호 (테이블 명세서: FAV_ID INT AUTO_INCREMENT PK)

    @Column(name = "GOOGLE_ID", nullable = false, length = 100)
    private String googleId; // 사용자 Google ID (테이블 명세서: GOOGLE_ID VARCHAR(100) NN)
                             // 이 필드를 통해 TB_USER 테이블과 논리적 관계를 가짐

    @Column(name = "CNL_ID", nullable = false, length = 100)
    private String cnlId; // 관심 채널의 YouTube 채널 ID (@handle 또는 UC... 형태)
                          // (테이블 명세서: CNL_ID VARCHAR(100) NN)

    @Column(name = "CNL_NAME", length = 255)
    private String cnlName; // 채널명 (테이블 명세서: CNL_NAME VARCHAR(255))

    @Column(name = "CNL_URL", length = 1000)
    private String cnlUrl; // 채널 URL (테이블 명세서: CNL_URL VARCHAR(1000))

    @Column(name = "CNL_MEMO", columnDefinition = "TEXT") // TEXT 타입 명시
    private String cnlMemo; // 사용자가 입력한 메모 (테이블 명세서: MEMO TEXT)

    @CreationTimestamp // JPA 엔티티가 처음 저장될 때 현재 시간 자동 저장
    @Column(name = "CREATED_AT", nullable = false, updatable = false) // 등록일시 (테이블 명세서: CREATED_AT TIMESTAMP NN)
    private LocalDateTime createdAt;

    @UpdateTimestamp // JPA 엔티티가 업데이트될 때마다 현재 시간 자동 저장
    @Column(name = "UPDATED_AT", nullable = false) // 수정일시 (테이블 명세서: UPDATED_AT TIMESTAMP NN)
    private LocalDateTime updatedAt;

    // 만약 User 엔티티와 직접적인 JPA 관계 매핑을 원한다면 아래 주석 해제 및 User 엔티티 필요
    // @ManyToOne(fetch = FetchType.LAZY)
    // @JoinColumn(name = "GOOGLE_ID", referencedColumnName = "GOOGLE_ID", insertable = false, updatable = false)
    // private User user; // com.cm.astb.entity.User 필요
}
