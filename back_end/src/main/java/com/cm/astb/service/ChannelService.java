package com.cm.astb.service;

import java.io.IOException;
import java.math.BigInteger;
import java.security.GeneralSecurityException;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.entity.YouTubeChannel;
import com.cm.astb.repository.YouTubeChannelRepository;
import com.google.api.client.auth.oauth2.Credential;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelContentDetails;
import com.google.api.services.youtube.model.ChannelContentDetails.RelatedPlaylists;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.ChannelSnippet;
import com.google.api.services.youtube.model.ChannelStatistics;
import com.google.api.services.youtube.model.PlaylistItemListResponse;
import com.google.api.services.youtube.model.SearchListResponse;
import com.google.api.services.youtube.model.Thumbnail;
import com.google.api.services.youtube.model.ThumbnailDetails;
import com.google.api.services.youtube.model.Video;
import com.google.api.services.youtube.model.VideoListResponse;
import com.google.api.services.youtube.model.VideoSnippet;
import com.google.api.services.youtube.model.VideoStatistics;

@Service
public class ChannelService {
	
	private static final Logger logger = LoggerFactory.getLogger(ChannelService.class);
	private final OAuthService oAuthService;
	private final YouTubeChannelRepository youTubeChannelRepository;
	
	@Value("${youtube.cache.channel-info.expiration.minutes}")
	private long channelInfoCacheExpirationMinutes;

	@Value("${youtube.api.key}")
    private String apiKey;
	
	public ChannelService(OAuthService oAuthService, YouTubeChannelRepository youTubeChannelRepository) {
		this.oAuthService = oAuthService;
		this.youTubeChannelRepository = youTubeChannelRepository;
	}

	// =================================================================================
    // =                             [신규] 영상 정보 조회 메소드                        =
    // =================================================================================
    
    public Video getVideoInfo(String videoId) throws IOException {
        logger.info("Fetching public video info for ID: {} using API Key.", videoId);

        YouTube youtubeService = new YouTube.Builder(new NetHttpTransport(), new GsonFactory(), request -> {})
                .setApplicationName("ascen-tube-video-info")
                .build();
        
        YouTube.Videos.List request = youtubeService.videos()
                .list(Arrays.asList("snippet", "statistics", "contentDetails"));
        
        request.setKey(apiKey);
        request.setId(Arrays.asList(videoId));
        
        VideoListResponse response = request.execute();
        
        if (response != null && !response.getItems().isEmpty()) {
            return response.getItems().get(0);
        } else {
            return null;
        }
    }


	@Transactional
	public ChannelListResponse getChannelInfoById(String userId, String channelId) throws IOException, GeneralSecurityException {
		Optional<YouTubeChannel> optionalCachedChannel = youTubeChannelRepository.findByChannelId(channelId);
		if(optionalCachedChannel.isPresent()) {
			YouTubeChannel cachedChannel = optionalCachedChannel.get();
			LocalDateTime cacheExpiryTime = cachedChannel.getUpdatedAt().plusMinutes(channelInfoCacheExpirationMinutes);
			if (LocalDateTime.now().isBefore(cacheExpiryTime)) {
				logger.info("Returning cached channel info for ID: {}", channelId);
				return convertYouTubeChannelToChannelListResponse(cachedChannel);
			}
		}
		
		logger.info("Cache expired or not found for channel ID: {}. Calling YouTube API.", channelId);
		Credential credential = oAuthService.getCredential(userId);
		if (credential == null || credential.getAccessToken() == null) {
            throw new GeneralSecurityException("OAuth 인증이 필요합니다. 사용자(" + userId + ")의 Credential이 유효하지 않습니다.");
        }
		YouTube youTube = oAuthService.getYouTubeService(credential);
		YouTube.Channels.List request = youTube.channels().list(Arrays.asList("snippet", "statistics", "contentDetails"));
		request.setId(Arrays.asList(channelId));
		ChannelListResponse apiResponse = request.execute();
		
		if (apiResponse != null && apiResponse.getItems() != null && !apiResponse.getItems().isEmpty()) {
			Channel apiChannel = apiResponse.getItems().get(0);
			YouTubeChannel channelInfoToSave;
			if (optionalCachedChannel.isPresent()) {
				channelInfoToSave = optionalCachedChannel.get();
			} else {
				channelInfoToSave = new YouTubeChannel();
				channelInfoToSave.setChannelId(apiChannel.getId());
			}
			channelInfoToSave.setTitle(apiChannel.getSnippet().getTitle());
			channelInfoToSave.setDescription(apiChannel.getSnippet().getDescription());
			if (apiChannel.getSnippet().getCustomUrl() != null) {
				channelInfoToSave.setChannelCustomUrl(apiChannel.getSnippet().getCustomUrl());
			} else {
				channelInfoToSave.setChannelCustomUrl("https://www.youtube.com/channel/" + apiChannel.getId());
			}
			if (apiChannel.getSnippet().getThumbnails() != null) {
				channelInfoToSave.setThumbnailUrl(apiChannel.getSnippet().getThumbnails().getDefault().getUrl());
			}
			if (apiChannel.getSnippet().getPublishedAt() != null) {
				channelInfoToSave.setYoutubePublishedAt(
						LocalDateTime.parse(apiChannel.getSnippet().getPublishedAt().toStringRfc3339().substring(0, 19))
				);
			}
			if (apiChannel.getStatistics() != null) {
				channelInfoToSave.setViewCount(apiChannel.getStatistics().getViewCount().longValue());
				channelInfoToSave.setSubscriberCount(apiChannel.getStatistics().getSubscriberCount().longValue());
				channelInfoToSave.setVideoCount(apiChannel.getStatistics().getVideoCount().longValue());
			}
			if (apiChannel.getContentDetails() != null && apiChannel.getContentDetails().getRelatedPlaylists() != null &&
	                apiChannel.getContentDetails().getRelatedPlaylists().getUploads() != null) {
	                channelInfoToSave.setUploadsPlaylistId(apiChannel.getContentDetails().getRelatedPlaylists().getUploads());
	            }
			youTubeChannelRepository.save(channelInfoToSave);
		}
		return apiResponse;
	}

	public List<Video> getLatestVideosFromChannel(String userId, ChannelListResponse response) throws IOException, GeneralSecurityException {
		Credential credential = oAuthService.getCredential(userId);
		if (credential == null || credential.getAccessToken() == null) {
            throw new GeneralSecurityException("OAuth 인증이 필요합니다. 사용자(" + userId + ")의 Credential이 유효하지 않습니다.");
        }
		YouTube youTube = oAuthService.getYouTubeService(credential);
		String uploadsPlaylistId;
		if(response != null && !response.isEmpty()) {
			uploadsPlaylistId = response.getItems().get(0).getContentDetails().getRelatedPlaylists().getUploads();
		} else {
			logger.warn("Channel {} not found or has no contentDetails for uploads playlist ID.", response.getItems().get(0).getSnippet().getTitle());
            return Collections.emptyList();
		}
		YouTube.PlaylistItems.List playListItems = youTube.playlistItems().list(Arrays.asList("snippet", "contentDetails"));
		playListItems.setPlaylistId(uploadsPlaylistId);
		playListItems.setMaxResults(5L);
		PlaylistItemListResponse playlistItemListResponse = playListItems.execute();
		List<String> videoIds = playlistItemListResponse.getItems().stream()
                .map(item -> item.getContentDetails().getVideoId())
                .collect(Collectors.toList());
		Map<String, VideoStatistics> videoStatsMap = getVideosStatisticsByIds(userId, videoIds);
		return playlistItemListResponse.getItems().stream()
				.map(playlistItem -> {
                    Video video = new Video();
                    video.setId(playlistItem.getContentDetails().getVideoId());
                    VideoSnippet videoSnippet = new VideoSnippet();
                    videoSnippet.setChannelId(playlistItem.getSnippet().getChannelId());
                    videoSnippet.setChannelTitle(playlistItem.getSnippet().getChannelTitle());
                    videoSnippet.setDescription(playlistItem.getSnippet().getDescription());
                    videoSnippet.setPublishedAt(playlistItem.getSnippet().getPublishedAt());
                    videoSnippet.setTitle(playlistItem.getSnippet().getTitle());
                    videoSnippet.setThumbnails(playlistItem.getSnippet().getThumbnails());
                    video.setSnippet(videoSnippet);
                    video.setStatistics(videoStatsMap.get(video.getId()));
                    return video;
                })
                .collect(Collectors.toList());
	}

	public List<Video> getPopularVideosFromChannel(String userId, String channelId) throws IOException, GeneralSecurityException {
	    Credential credential = oAuthService.getCredential(userId);
	    if (credential == null || credential.getAccessToken() == null) {
	        throw new GeneralSecurityException("OAuth 인증이 필요합니다. 사용자(" + userId + ")의 Credential이 유효하지 않습니다.");
	    }
	    YouTube youTube = oAuthService.getYouTubeService(credential);
	    
	    // [수정] 아래 한 줄을 올바른 코드로 변경합니다.
		// 잘못된 코드: Youtube.List search = Youtube().list(Arrays.asList("snippet"));
	    YouTube.Search.List search = youTube.search().list(Arrays.asList("snippet"));

	    search.setType(Arrays.asList("video"));
	    search.setOrder("viewCount");
	    search.setMaxResults(5L);
	    search.setChannelId(channelId);

	    SearchListResponse searchResponse = search.execute();
	    List<String> videoIds = searchResponse.getItems().stream()
	                                .map(item -> item.getId().getVideoId())
	                                .collect(Collectors.toList());
	    Map<String, VideoStatistics> videoStatsMap = getVideosStatisticsByIds(userId, videoIds);

	    return searchResponse.getItems().stream()
	            .map(searchResult -> {
	                Video video = new Video();
	                video.setId(searchResult.getId().getVideoId());

	                VideoSnippet videoSnippet = new VideoSnippet();
	                videoSnippet.setChannelId(searchResult.getSnippet().getChannelId());
	                videoSnippet.setChannelTitle(searchResult.getSnippet().getChannelTitle());
	                videoSnippet.setDescription(searchResult.getSnippet().getDescription());
	                videoSnippet.setPublishedAt(searchResult.getSnippet().getPublishedAt());
	                videoSnippet.setTitle(searchResult.getSnippet().getTitle());
	                videoSnippet.setThumbnails(searchResult.getSnippet().getThumbnails());

	                video.setSnippet(videoSnippet);
	                video.setStatistics(videoStatsMap.get(video.getId()));

	                return video;
	            })
	            .collect(Collectors.toList());
	}
    
	public Map<String, VideoStatistics> getVideosStatisticsByIds(String userId, List<String> videoIds) throws IOException, GeneralSecurityException {
        if (videoIds == null || videoIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Credential credential = oAuthService.getCredential(userId);
        if (credential == null || credential.getAccessToken() == null) {
            throw new GeneralSecurityException("OAuth 인증이 필요합니다. 사용자(" + userId + ")의 Credential이 유효하지 않습니다.");
        }
        YouTube youTube = oAuthService.getYouTubeService(credential);
        YouTube.Videos.List request = youTube.videos().list(Arrays.asList("statistics"));
        request.setId(Arrays.asList(String.join(",", videoIds)));
        VideoListResponse response = request.execute();
        return response.getItems().stream()
                .filter(video -> video.getStatistics() != null)
                .collect(Collectors.toMap(Video::getId, Video::getStatistics));
    }
	
	
	private ChannelListResponse convertYouTubeChannelToChannelListResponse(YouTubeChannel ytChannel) {
		Channel channel = new Channel();
		channel.setId(ytChannel.getChannelId());
		ChannelSnippet snippet = new ChannelSnippet();
		snippet.setTitle(ytChannel.getTitle());
		snippet.setDescription(ytChannel.getDescription());
		if (ytChannel.getYoutubePublishedAt() != null) {
            snippet.setPublishedAt(com.google.api.client.util.DateTime.parseRfc3339(ytChannel.getYoutubePublishedAt().toString() + "Z"));
        }
		ThumbnailDetails thumbnails = new ThumbnailDetails();
		Thumbnail defaultThumbnail = new Thumbnail();
		defaultThumbnail.setUrl(ytChannel.getThumbnailUrl());
		thumbnails.setDefault(defaultThumbnail);
		snippet.setThumbnails(thumbnails);
		channel.setSnippet(snippet);
		ChannelStatistics statistics = new ChannelStatistics();
		statistics.setViewCount(BigInteger.valueOf(ytChannel.getViewCount()));
		statistics.setSubscriberCount(BigInteger.valueOf(ytChannel.getSubscriberCount()));
		statistics.setVideoCount(BigInteger.valueOf(ytChannel.getVideoCount()));
		channel.setStatistics(statistics);
		ChannelContentDetails contentDetails = new ChannelContentDetails();
		RelatedPlaylists relatedPlaylists = new RelatedPlaylists();
		relatedPlaylists.setUploads(ytChannel.getUploadsPlaylistId());
		contentDetails.setRelatedPlaylists(relatedPlaylists);
		channel.setContentDetails(contentDetails);
		ChannelListResponse response = new ChannelListResponse();
		response.setItems(List.of(channel));
		return response;
	}
}