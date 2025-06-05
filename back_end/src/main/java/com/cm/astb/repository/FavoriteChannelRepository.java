// FavoriteChannelRepository.java
package com.cm.astb.repository; // 실제 프로젝트의 리포지토리 패키지 경로에 맞게 수정해주세요.

import com.cm.astb.entity.FavoriteChannel; // 엔티티 패키지 경로
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteChannelRepository extends JpaRepository<FavoriteChannel, Long> { // 기본키 타입은 Long (FAV_ID)

    /**
     * 특정 사용자의 모든 관심 채널 목록을 생성일자 내림차순으로 조회합니다.
     * @param googleId 사용자의 Google ID
     * @return 관심 채널 엔티티 목록
     */
    List<FavoriteChannel> findByGoogleIdOrderByCreatedAtDesc(String googleId);

    /**
     * 특정 사용자가 특정 채널 ID를 가진 관심 채널을 이미 등록했는지 확인합니다.
     * @param googleId 사용자의 Google ID
     * @param cnlId 확인할 채널의 ID (@handle 또는 UC... ID)
     * @return Optional<FavoriteChannel>
     */
    Optional<FavoriteChannel> findByGoogleIdAndCnlId(String googleId, String cnlId);

    /**
     * 특정 사용자가 등록한 관심 채널의 개수를 조회합니다.
     * @param googleId 사용자의 Google ID
     * @return 등록된 관심 채널 개수
     */
    long countByGoogleId(String googleId);

    /**
     * 특정 관심 채널 고유 ID(favId)와 사용자 Google ID로 관심 채널을 조회합니다.
     * (삭제 시 본인 소유의 채널인지 확인하기 위해 사용)
     * @param favId 관심 채널의 FAV_ID
     * @param googleId 사용자의 Google ID
     * @return Optional<FavoriteChannel>
     */
    Optional<FavoriteChannel> findByFavIdAndGoogleId(Long favId, String googleId);

    // 필요에 따라 다른 조회 메소드 추가 가능
    // 예: 사용자의 특정 채널 URL로 관심 채널 조회
    // Optional<FavoriteChannel> findByGoogleIdAndCnlUrl(String googleId, String cnlUrl);
}
