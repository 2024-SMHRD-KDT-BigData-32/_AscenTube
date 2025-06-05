package com.cm.astb.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import com.cm.astb.AscenTubeApplication;
import com.cm.astb.config.GoogleApiConfig;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.util.DateTime;
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

    private final AscenTubeApplication ascenTubeApplication;
    private final YouTube youTubeService;
    private final String youtubeApiKey;
    private final GoogleApiConfig googleApiConfig;
    private final OAuthService oAuthService;

    @Autowired
    public YoutubeDataApiService(YouTube youTube, GoogleApiConfig googleApiConfig,
                                  OAuthService oAuthService, AscenTubeApplication ascenTubeApplication) {
        this.youTubeService = youTube;
        this.googleApiConfig = googleApiConfig;
        this.youtubeApiKey = googleApiConfig.getYoutubeApiKey();
        this.oAuthService = oAuthService;
        this.ascenTubeApplication = ascenTubeApplication;
    }

    public List<SearchResult> getTrendingVideosByPeriod(String userId, String categoryId, String regionCode, String period, long maxResults) throws IOException, GeneralSecurityException {
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

        Instant now = Instant.now();
        Instant publishedAfterInstant;

        switch (period.toLowerCase()) {
            case "daily" -> publishedAfterInstant = now.minus(1, ChronoUnit.DAYS);
            case "weekly" -> publishedAfterInstant = now.minus(7, ChronoUnit.DAYS);
            case "monthly" -> publishedAfterInstant = now.minus(30, ChronoUnit.DAYS);
            default -> throw new IllegalArgumentException("Invalid period specified. Please use 'daily', 'weekly', or 'monthly'.");
        }

        search.setPublishedAfter(new DateTime(publishedAfterInstant.toEpochMilli()).toStringRfc3339());

        SearchListResponse response = search.execute();
        return response.getItems() != null ? response.getItems() : List.of();
    }

    public List<Video> getTrendingVideosByCategory(String userId, String categoryId, String regionCode, long maxResults) throws IOException, GeneralSecurityException {
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
        return response.getItems() != null ? response.getItems() : List.of();
    }

    public ChannelListResponse getChannelInfo(String channelId) throws IOException {
        return youTubeService.channels()
                .list(Arrays.asList("snippet", "contentDetails", "statistics"))
                .setKey(youtubeApiKey)
                .setId(List.of(channelId))
                .execute();
    }

    public ChannelListResponse getChannelInfoByHandle(String handleId) throws IOException {
        String username = handleId.startsWith("@") ? handleId.substring(1) : handleId;
        return youTubeService.channels()
                .list(Arrays.asList("snippet", "contentDetails", "statistics"))
                .setKey(youtubeApiKey)
                .setForUsername(username)
                .execute();
    }

    public List<String> getLatestVideosByChannel(String channelId, long maxResults) throws IOException {
        ChannelListResponse channelListResponse = youTubeService.channels()
                .list(Arrays.asList("contentDetails"))
                .setKey(youtubeApiKey)
                .setId(List.of(channelId))
                .execute();

        String uploadsPlaylistId = channelListResponse.getItems()
                .get(0)
                .getContentDetails()
                .getRelatedPlaylists()
                .getUploads();

        PlaylistItemListResponse playlistItemListResponse = youTubeService.playlistItems()
                .list(Arrays.asList("snippet"))
                .setKey(youtubeApiKey)
                .setPlaylistId(uploadsPlaylistId)
                .setMaxResults(maxResults)
                .execute();

        return playlistItemListResponse.getItems().stream()
                .map(item -> item.getSnippet().getTitle())
                .collect(Collectors.toList());
    }

    public List<String> getLatestVideosByHandle(String handleId, long maxResults) throws IOException {
        ChannelListResponse channelInfo = getChannelInfoByHandle(handleId);
        if (channelInfo.getItems() == null || channelInfo.getItems().isEmpty()) {
            throw new IOException("핸들에 해당하는 채널을 찾을 수 없습니다: " + handleId);
        }
        String channelId = channelInfo.getItems().get(0).getId();
        return getLatestVideosByChannel(channelId, maxResults);
    }

    public List<String> searchVideos(String query, long maxResults) throws IOException {
        YouTube.Search.List search = youTubeService.search().list(Arrays.asList("id", "snippet"));
        search.setKey(youtubeApiKey);
        search.setQ(query);
        search.setType(List.of("video"));
        search.setFields("items(id/videoId,snippet/title)");
        search.setMaxResults(maxResults);

        SearchListResponse searchResponse = search.execute();
        return searchResponse.getItems() != null
                ? searchResponse.getItems().stream().map(item -> item.getSnippet().getTitle()).collect(Collectors.toList())
                : List.of();
    }

    public Channel getChannelDetailsByIdentifier(String identifier) throws IOException {
        if (!StringUtils.hasText(identifier)) {
            throw new IllegalArgumentException("채널 식별자(ID 또는 @handle)는 필수입니다.");
        }

        YouTube.Channels.List request = youTubeService.channels()
                .list(List.of("snippet", "statistics", "brandingSettings"))
                .setKey(youtubeApiKey);

        if (identifier.startsWith("UC") && identifier.length() == 24) {
            request.setId(List.of(identifier));
        } else if (identifier.startsWith("@")) {
            request.setForUsername(identifier.substring(1));
        } else {
            request.setForUsername(identifier);
        }

        ChannelListResponse response = request.execute();
        if (response.getItems() != null && !response.getItems().isEmpty()) {
            return response.getItems().get(0);
        } else {
            throw new IllegalArgumentException("YouTube에서 '" + identifier + "'에 해당하는 채널을 찾을 수 없습니다.");
        }
    }
}
