// FavoriteChannelService.java (Interface)
package com.cm.astb.service; // 실제 프로젝트의 서비스 패키지 경로에 맞게 수정해주세요.

import java.io.IOException;
import java.util.List;

import com.cm.astb.dto.FavoriteChannelDto;
import com.cm.astb.dto.FavoriteChannelRequestDto;

public interface FavoriteChannelService {

    /**
     * 현재 인증된 사용자의 Google ID를 기반으로 관심 채널 목록을 조회합니다.
     * @param googleId 현재 로그인된 사용자의 Google ID
     * @return 관심 채널 DTO 목록
     */
    List<FavoriteChannelDto> getFavoriteChannelsByGoogleId(String googleId);

    /**
     * 현재 인증된 사용자의 관심 채널을 추가합니다.
     * @param googleId 현재 로그인된 사용자의 Google ID
     * @param requestDto 추가할 관심 채널 정보 DTO
     * @return 추가된 관심 채널 DTO
     * @throws IOException YouTube API 호출 등에서 발생 가능
     * @throws IllegalArgumentException 유효성 검사 실패 또는 비즈니스 로직 위반 시
     */
    FavoriteChannelDto addFavoriteChannel(String googleId, FavoriteChannelRequestDto requestDto) throws IOException, IllegalArgumentException;

    /**
     * 현재 인증된 사용자의 특정 관심 채널을 삭제합니다.
     * @param googleId 현재 로그인된 사용자의 Google ID
     * @param favId 삭제할 관심 채널의 FAV_ID
     * @throws IllegalArgumentException 해당 채널을 찾을 수 없거나 삭제 권한이 없는 경우
     */
    void deleteFavoriteChannel(String googleId, Long favId) throws IllegalArgumentException;
}

