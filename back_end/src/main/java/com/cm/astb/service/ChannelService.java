package com.cm.astb.service;

import java.io.IOException;
import java.math.BigInteger;
import java.security.GeneralSecurityException;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
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
import com.google.api.services.youtube.model.SearchResult;
import com.google.api.services.youtube.model.SearchResultSnippet;
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

    public Video getVideoInfo(String videoId) throws IOException {
        logger.info("Fetching public video info for ID: {} using API Key.", videoId);
        YouTube youtubeService = new YouTube.Builder(new NetHttpTransport(), new GsonFactory(), request -> {}).setApplicationName("ascen-tube-video-info").build();
        
        YouTube.Videos.List request = youtubeService.videos().list(Arrays.asList("snippet", "statistics", "contentDetails"));
        request.setKey(apiKey);
        request.setId(Arrays.asList(videoId));
        
        VideoListResponse response = request.execute();
        
        return (response != null && !response.getItems().isEmpty()) ? response.getItems().get(0) : null;
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
		YouTube youTube = oAuthService.getYouTubeService(credential);
		YouTube.Channels.List request = youTube.channels().list(Arrays.asList("snippet", "statistics", "contentDetails"));
		request.setId(Arrays.asList(channelId));
		ChannelListResponse apiResponse = request.execute();
		
		if (apiResponse != null && !apiResponse.getItems().isEmpty()) {
			updateChannelCache(apiResponse.getItems().get(0), optionalCachedChannel);
		}
		return apiResponse;
	}

	public List<Video> getLatestVideosFromChannel(String userId, ChannelListResponse response) throws IOException, GeneralSecurityException {
		Credential credential = oAuthService.getCredential(userId);
		YouTube youTube = oAuthService.getYouTubeService(credential);

		String uploadsPlaylistId = Optional.ofNullable(response)
				.map(r -> r.getItems())
				.filter(items -> !items.isEmpty())
				.map(items -> items.get(0))
				.map(Channel::getContentDetails)
				.map(ChannelContentDetails::getRelatedPlaylists)
				.map(RelatedPlaylists::getUploads)
				.orElse(null);

		if (uploadsPlaylistId == null) {
			String channelTitle = Optional.ofNullable(response).map(r -> r.getItems().get(0).getSnippet().getTitle()).orElse("Unknown Channel");
			logger.warn("Channel '{}' has no uploads playlist ID. Cannot fetch latest videos.", channelTitle);
            return Collections.emptyList();
		}

		YouTube.PlaylistItems.List playListItemsRequest = youTube.playlistItems().list(Arrays.asList("snippet", "contentDetails"));
		playListItemsRequest.setPlaylistId(uploadsPlaylistId);
		playListItemsRequest.setMaxResults(5L);
		PlaylistItemListResponse playlistItemListResponse = playListItemsRequest.execute();
		
		List<String> videoIds = playlistItemListResponse.getItems().stream()
				.map(item -> item.getContentDetails().getVideoId())
				.collect(Collectors.toList());
		
		return enrichVideosWithStats(userId, playlistItemListResponse.getItems().stream()
				.map(this::convertPlaylistItemToVideo)
				.collect(Collectors.toList()), videoIds);
	}

	public List<Video> getPopularVideosFromChannel(String userId, String channelId) throws IOException, GeneralSecurityException {
	    Credential credential = oAuthService.getCredential(userId);
	    if (credential == null || credential.getAccessToken() == null) {
	        throw new GeneralSecurityException("OAuth 인증이 필요합니다. 사용자(" + userId + ")의 Credential이 유효하지 않습니다.");
	    }
	    YouTube youTube = oAuthService.getYouTubeService(credential);

	    // Create a search request to fetch popular videos
	    YouTube.Search.List searchRequest = youTube.search().list(Arrays.asList("snippet"));
	    searchRequest.setChannelId(channelId);
	    searchRequest.setType(Arrays.asList("video"));
	    searchRequest.setOrder("viewCount");
	    searchRequest.setMaxResults(5L);

	    SearchListResponse searchResponse = searchRequest.execute();
	    
	    List<String> videoIds = searchResponse.getItems().stream()
	            .map(item -> item.getId().getVideoId())
	            .collect(Collectors.toList());

	    // Convert SearchResult to Video objects
	    List<Video> videos = searchResponse.getItems().stream()
	            .map(this::convertSearchResultToVideo)
	            .collect(Collectors.toList());

	    // Enrich videos with statistics
	    return enrichVideosWithStats(userId, videos, videoIds);
	}
    
	private Map<String, VideoStatistics> getVideosStatisticsByIds(String userId, List<String> videoIds) throws IOException, GeneralSecurityException {
        if (videoIds == null || videoIds.isEmpty()) {
            return Collections.emptyMap();
        }
        Credential credential = oAuthService.getCredential(userId);
        YouTube youTube = oAuthService.getYouTubeService(credential);
        YouTube.Videos.List request = youTube.videos().list(Arrays.asList("statistics"));
        request.setId(videoIds);
        VideoListResponse response = request.execute();
        return response.getItems().stream()
                .filter(video -> video.getStatistics() != null)
                .collect(Collectors.toMap(Video::getId, Video::getStatistics));
    }
	
	private void updateChannelCache(Channel apiChannel, Optional<YouTubeChannel> optionalCachedChannel) {
		YouTubeChannel channelToSave = optionalCachedChannel.orElseGet(() -> {
			YouTubeChannel newChannel = new YouTubeChannel();
			newChannel.setChannelId(apiChannel.getId());
			return newChannel;
		});

		ChannelSnippet snippet = apiChannel.getSnippet();
		if (snippet != null) {
			channelToSave.setTitle(snippet.getTitle());
			channelToSave.setDescription(snippet.getDescription());
			channelToSave.setChannelCustomUrl(Optional.ofNullable(snippet.getCustomUrl()).orElse("https://www.youtube.com/watch?v=O_FJAhtpryY" + apiChannel.getId()));
			Optional.ofNullable(snippet.getThumbnails()).map(ThumbnailDetails::getDefault).map(Thumbnail::getUrl).ifPresent(channelToSave::setThumbnailUrl);
			Optional.ofNullable(snippet.getPublishedAt()).ifPresent(dt -> 
				channelToSave.setYoutubePublishedAt(LocalDateTime.ofInstant(Instant.ofEpochMilli(dt.getValue()), ZoneOffset.UTC))
			);
		}

		ChannelStatistics stats = apiChannel.getStatistics();
		if (stats != null) {
			Optional.ofNullable(stats.getViewCount()).ifPresent(v -> channelToSave.setViewCount(v.longValue()));
			Optional.ofNullable(stats.getSubscriberCount()).ifPresent(s -> channelToSave.setSubscriberCount(s.longValue()));
			Optional.ofNullable(stats.getVideoCount()).ifPresent(vc -> channelToSave.setVideoCount(vc.longValue()));
		}

		Optional.ofNullable(apiChannel.getContentDetails()).map(ChannelContentDetails::getRelatedPlaylists).map(RelatedPlaylists::getUploads).ifPresent(channelToSave::setUploadsPlaylistId);
		
		youTubeChannelRepository.save(channelToSave);
	}
	
	private ChannelListResponse convertYouTubeChannelToChannelListResponse(YouTubeChannel ytChannel) {
		Channel channel = new Channel();
		channel.setId(ytChannel.getChannelId());
		
		ChannelSnippet snippet = new ChannelSnippet();
		snippet.setTitle(ytChannel.getTitle());
		snippet.setDescription(ytChannel.getDescription());
		if (ytChannel.getYoutubePublishedAt() != null) {
			long millis = ytChannel.getYoutubePublishedAt().toInstant(ZoneOffset.UTC).toEpochMilli();
			snippet.setPublishedAt(new com.google.api.client.util.DateTime(millis));
		}
		if (ytChannel.getThumbnailUrl() != null) {
			ThumbnailDetails thumbnails = new ThumbnailDetails();
			thumbnails.setDefault(new Thumbnail().setUrl(ytChannel.getThumbnailUrl()));
			snippet.setThumbnails(thumbnails);
		}
		channel.setSnippet(snippet);

		ChannelStatistics statistics = new ChannelStatistics();
		statistics.setViewCount(BigInteger.valueOf(ytChannel.getViewCount()));
		statistics.setSubscriberCount(BigInteger.valueOf(ytChannel.getSubscriberCount()));
		statistics.setVideoCount(BigInteger.valueOf(ytChannel.getVideoCount()));
		channel.setStatistics(statistics);

		if (ytChannel.getUploadsPlaylistId() != null) {
			ChannelContentDetails contentDetails = new ChannelContentDetails();
			RelatedPlaylists relatedPlaylists = new RelatedPlaylists();
			relatedPlaylists.setUploads(ytChannel.getUploadsPlaylistId());
			contentDetails.setRelatedPlaylists(relatedPlaylists);
			channel.setContentDetails(contentDetails);
		}

		ChannelListResponse response = new ChannelListResponse();
		response.setItems(Collections.singletonList(channel));
		return response;
	}

	private List<Video> enrichVideosWithStats(String userId, List<Video> videos, List<String> videoIds) throws IOException, GeneralSecurityException {
		Map<String, VideoStatistics> videoStatsMap = getVideosStatisticsByIds(userId, videoIds);
		videos.forEach(video -> video.setStatistics(videoStatsMap.get(video.getId())));
		return videos;
	}
	
	private Video convertPlaylistItemToVideo(com.google.api.services.youtube.model.PlaylistItem playlistItem) {
		Video video = new Video();
		video.setId(playlistItem.getContentDetails().getVideoId());
		VideoSnippet snippet = new VideoSnippet();
		snippet.setChannelId(playlistItem.getSnippet().getChannelId());
		snippet.setChannelTitle(playlistItem.getSnippet().getChannelTitle());
		snippet.setDescription(playlistItem.getSnippet().getDescription());
		snippet.setPublishedAt(playlistItem.getSnippet().getPublishedAt());
		snippet.setTitle(playlistItem.getSnippet().getTitle());
		snippet.setThumbnails(playlistItem.getSnippet().getThumbnails());
		video.setSnippet(snippet);
		return video;
	}
	
	private Video convertSearchResultToVideo(SearchResult searchResult) {
	    Video video = new Video();
	    video.setId(searchResult.getId().getVideoId());

	    SearchResultSnippet searchSnippet = searchResult.getSnippet();
	    
	    if (searchSnippet != null) {
	        VideoSnippet videoSnippet = new VideoSnippet();
	        videoSnippet.setPublishedAt(searchSnippet.getPublishedAt());
	        videoSnippet.setChannelId(searchSnippet.getChannelId());
	        videoSnippet.setTitle(searchSnippet.getTitle());
	        videoSnippet.setDescription(searchSnippet.getDescription());
	        videoSnippet.setThumbnails(searchSnippet.getThumbnails());
	        videoSnippet.setChannelTitle(searchSnippet.getChannelTitle());
	        
	        video.setSnippet(videoSnippet);
	    }
	    
	    return video;
	}
}