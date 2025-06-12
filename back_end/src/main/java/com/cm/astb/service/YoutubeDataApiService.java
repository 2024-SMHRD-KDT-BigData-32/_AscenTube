// YoutubeDataApiService.java (기존 클래스에 메소드 구현 추가)
package com.cm.astb.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired; // Autowired 추가
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils; // StringUtils 추가

import com.cm.astb.AscenTubeApplication; // 기존 코드에 있었으므로 유지
import com.cm.astb.config.GoogleApiConfig;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.util.DateTime;
import com.google.api.client.http.javanet.NetHttpTransport; // 생성자에서 사용하므로 추가
import com.google.api.client.json.gson.GsonFactory;      // 생성자에서 사용하므로 추가
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.PlaylistItemListResponse;
import com.google.api.services.youtube.model.SearchListResponse;
import com.google.api.services.youtube.model.SearchResult;
import com.google.api.services.youtube.model.Video;
import com.google.api.services.youtube.model.VideoListResponse;

@Service
public class YoutubeDataApiService {

   private final YouTube youTube;
   private final String youtubeApiKey;
   private final OAuthService oAuthService;
    private final GoogleApiConfig googleApiConfig; // getYoutubeApiKey()를 위해 추가

   // GoogleApiConfig에서 초기화된 YouTube 객체와 API 키를 주입.
    // 생성자 수정: NetHttpTransport와 GsonFactory를 직접 주입받는 대신,
    // GoogleApiConfig에서 YouTube 빈을 가져오거나, 여기서 직접 생성.
    // 여기서는 GoogleApiConfig를 통해 API 키를 받고, YouTube 객체는 외부에서 주입받는 것으로 가정.
    // 만약 YouTube 객체도 여기서 생성해야 한다면, GoogleApiConfig에서 httpTransport, jsonFactory도 가져와야 함.
    // 이전 Canvas 코드에서는 생성자에서 httpTransport, jsonFactory를 받아 YouTube 객체를 만들었음.
    // 여기서는 기존 코드의 생성자 시그니처를 최대한 따르되, YouTube 객체를 직접 주입받는 것으로 변경.
   public YoutubeDataApiService(YouTube youTube, GoogleApiConfig googleApiConfig,
         OAuthService oAuthService) {
      this.youTube = youTube;
      this.youtubeApiKey = googleApiConfig.getYoutubeApiKey();
      this.oAuthService = oAuthService;
      this.googleApiConfig = new GoogleApiConfig();
   }
   
public List<SearchResult> getTrendingVideosByPeriod(String userId, String categoryId, String regionCode, String period, long maxResults) throws IOException, GeneralSecurityException{
      
      Credential credential = oAuthService.getCredential(userId);
      if (credential == null || credential.getAccessToken() == null) {
         throw new GeneralSecurityException("OAuth 인증이 필요합니다.");
      }
      
      YouTube oAuthYouTube = oAuthService.getYouTubeService(credential);
      YouTube.Search.List search = oAuthYouTube.search().list(Arrays.asList("id", "snippet"));
      search.setType(Arrays.asList("video"));
      search.setRegionCode(regionCode);
      search.setVideoCategoryId(categoryId);
      search.setMaxResults(maxResults);
      search.setOrder("viewCount");
      
      Instant now  = Instant.now();
      Instant publishedAfterInstant = null;
      
      switch (period.toLowerCase()) {
      case "daily":
         publishedAfterInstant = now.minus(1, ChronoUnit.DAYS);
         break;
      case "weekly":
         publishedAfterInstant = now.minus(7, ChronoUnit.DAYS);
         break;
      case "monthly":
         publishedAfterInstant = now.minus(30, ChronoUnit.DAYS);
         break;
      default:
         throw new IllegalArgumentException("Invalid period specified. Please use 'daily', 'weekly', or 'monthly'.");
      }
      
      if (publishedAfterInstant != null) {
         search.setPublishedAfter(new DateTime(publishedAfterInstant.toEpochMilli()).toStringRfc3339());
      }
      
      SearchListResponse response = search.execute();
      if(response.getItems() != null) {
         return response.getItems();
      }
      return List.of();
   }
   
   public List<Video> getTrendingVideosByCategory(String userId, String categoryId, String regionCode, long maxResults) throws IOException, GeneralSecurityException{
      
      Credential credential = oAuthService.getCredential(userId);
      if (credential == null || credential.getAccessToken() == null) {
         throw new GeneralSecurityException("OAuth 인증이 필요합니다.");
      }
      
      YouTube oauthYouTube = oAuthService.getYouTubeService(credential);
      YouTube.Videos.List request = oauthYouTube.videos().list(Arrays.asList("snippet", "statistics"));
      request.setChart("mostPopular");
      request.setRegionCode(regionCode);
      request.setVideoCategoryId(categoryId);
      request.setMaxResults(maxResults);
      
      VideoListResponse response = request.execute();
      if(response.getItems() != null) {
         return response.getItems();
      }
      return List.of();
   }

   public ChannelListResponse getChannelInfo(String channelId) throws IOException {
      YouTube.Channels.List request = youTube.channels()
            .list(Arrays.asList("snippet", "contentDetails", "statistics"))
            .setKey(youtubeApiKey).setId(Arrays.asList(channelId));
      return request.execute();
   }

   public ChannelListResponse getChannelInfoByHandle(String handleId) throws IOException {
        // YouTube API v3에서 setForHandle은 더 이상 권장되지 않거나 없을 수 있습니다.
        // @핸들은 일반적으로 채널 ID로 변환 후 조회하거나, Search API를 사용해야 합니다.
        // 여기서는 핸들에서 '@'를 제거하고 setForUsername으로 시도하는 것으로 가정 (정확도 낮을 수 있음)
        String username = handleId.startsWith("@") ? handleId.substring(1) : handleId;
      YouTube.Channels.List request = youTube.channels()
            .list(Arrays.asList("snippet", "contentDetails", "statistics")).setKey(youtubeApiKey)
            .setForUsername(username); // setForHandle 대신 setForUsername 사용 시도
      return request.execute();
   }

   public List<String> getLatestVideosByChannel(String channelId, long maxResults) throws IOException {
      ChannelListResponse channelListResponse = youTube.channels().list(Arrays.asList("contentDetails"))
            .setKey(youtubeApiKey).setId(Arrays.asList(channelId)).execute();
      String uploadsPlaylistId = null;
      if (channelListResponse.getItems() != null && !channelListResponse.getItems().isEmpty()) {
         uploadsPlaylistId = channelListResponse.getItems().get(0).getContentDetails().getRelatedPlaylists()
               .getUploads();
      }
      if (uploadsPlaylistId == null) {
         throw new IOException("채널의 업로드 플레이리스트를 찾을 수 없습니다: " + channelId);
      }
      PlaylistItemListResponse playlistItemListResponse = youTube.playlistItems()
            .list(Arrays.asList("snippet"))
            .setKey(youtubeApiKey)
            .setPlaylistId(uploadsPlaylistId)
            .setMaxResults(maxResults)
            .execute();
      return playlistItemListResponse.getItems().stream().map(item -> item.getSnippet().getTitle())
            .collect(Collectors.toList());
   }

   public List<String> getLatestVideosByHandle(String handleId, long maxResults) throws IOException {
        // getChannelInfoByHandle을 사용하여 채널 ID를 먼저 얻는 것이 더 안정적일 수 있습니다.
        ChannelListResponse channelInfo = getChannelInfoByHandle(handleId);
        if (channelInfo.getItems() == null || channelInfo.getItems().isEmpty()) {
            throw new IOException("핸들에 해당하는 채널을 찾을 수 없습니다: " + handleId);
        }
        String channelId = channelInfo.getItems().get(0).getId();
        return getLatestVideosByChannel(channelId, maxResults);
   }

   public List<String> searchVideos(String query, long maxResults) throws IOException {
      YouTube.Search.List search = youTube.search().list(Arrays.asList("id", "snippet"));
      search.setKey(youtubeApiKey);
      search.setQ(query);
      search.setType(Arrays.asList("video"));
      search.setFields("items(id/videoId,snippet/title)");
      search.setMaxResults(maxResults);
      SearchListResponse searchResponse = search.execute();
      List<SearchResult> searchResultList = searchResponse.getItems();
      if (searchResultList != null) {
         return searchResultList.stream().map(item -> item.getSnippet().getTitle()).collect(Collectors.toList());
      }
      return List.of();
   }

    /**
     * 제공된 채널 식별자(ID 또는 @handle)를 사용하여 YouTube Data API에서 채널 상세 정보를 조회합니다.
     *
     * @param identifier 조회할 채널의 ID (UC... 형태) 또는 @handle (예: "@ChimChakMan_Official")
     * @return 조회된 Channel 객체
     * @throws IOException API 호출 중 네트워크 오류 등이 발생한 경우
     * @throws IllegalArgumentException 유효하지 않은 식별자이거나 채널을 찾을 수 없는 경우
     */
    public Channel getChannelDetailsByIdentifier(String identifier) throws IOException, IllegalArgumentException {
        if (!StringUtils.hasText(identifier)) {
            throw new IllegalArgumentException("채널 식별자(ID 또는 @handle)는 필수입니다.");
        }

        System.out.println("[YoutubeDataApiService] 채널 정보 조회 시도. 식별자: " + identifier);
        YouTube.Channels.List request = youTube.channels().list(List.of("snippet", "statistics", "brandingSettings"));
        request.setKey(youtubeApiKey); // API Key 설정

        // 식별자 유형에 따라 API 요청 파라미터 설정
        if (identifier.startsWith("UC") && identifier.length() == 24) {
            System.out.println("  -> 채널 ID(UC...)로 조회: " + identifier);
            request.setId(List.of(identifier));
        } else if (identifier.startsWith("@")) {
            String handle = identifier.substring(1); // @ 제거
            System.out.println("  -> 채널 핸들(@)로 조회 (forUsername 사용): " + handle);
            // YouTube API v3에서 forUsername은 custom URL의 마지막 부분이나 레거시 사용자 이름을 의미.
            // @handle을 직접 지원하지 않을 수 있으므로, 이 방식의 정확도는 보장되지 않음.
            // 가장 좋은 방법은 @handle을 사용자가 입력하면, 백엔드에서 Search API 등을 통해
            // 해당 @handle의 정확한 채널 ID(UC...)를 찾아 사용하는 것.
            // 여기서는 일단 forUsername으로 시도.
            request.setForUsername(handle);
        } else {
            // 그 외의 경우는 사용자 이름으로 간주하고 조회 시도 (정확도 매우 낮음)
             System.out.println("  -> 일반 사용자 이름으로 조회 시도 (정확도 낮음): " + identifier);
            request.setForUsername(identifier);
        }

        ChannelListResponse response = request.execute();

        if (response.getItems() != null && !response.getItems().isEmpty()) {
            System.out.println("  -> 채널 정보 발견: " + response.getItems().get(0).getSnippet().getTitle());
            return response.getItems().get(0); // 첫 번째 결과 반환
        } else {
            System.out.println("  -> 채널 정보 찾을 수 없음.");
            throw new IllegalArgumentException("YouTube에서 '" + identifier + "'에 해당하는 채널을 찾을 수 없습니다.");
        }
    }
}
