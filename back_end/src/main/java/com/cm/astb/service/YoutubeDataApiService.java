package com.cm.astb.service;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import com.cm.astb.AscenTubeApplication;
import com.cm.astb.config.GoogleApiConfig;
import com.google.api.services.youtube.YouTube;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.PlaylistItemListResponse;
import com.google.api.services.youtube.model.SearchListResponse;
import com.google.api.services.youtube.model.SearchResult;

@Service
public class YoutubeDataApiService {

	private final AscenTubeApplication ascenTubeApplication;
	private final YouTube youTube;
	private final String youtubeApiKey;

	// GoogleApiConfig에서 초기화된 YouTube 객체와 API 키를 주입.
	public YoutubeDataApiService(YouTube youTube, GoogleApiConfig googleApiConfig,
			AscenTubeApplication ascenTubeApplication) {
		this.youTube = youTube;
		this.youtubeApiKey = googleApiConfig.getYoutubeApiKey();
		this.ascenTubeApplication = ascenTubeApplication;
	}

	public ChannelListResponse getChannelInfo(String channelId) throws IOException {
		YouTube.Channels.List request = youTube.channels()
				.list(Arrays.asList("snippet", "contentDetails", "statistics")) // 가져올 정보
				.setKey(youtubeApiKey).setId(Arrays.asList(channelId));

		return request.execute();
	}

	public ChannelListResponse getChannelInfoByHandle(String handelId) throws IOException {
		YouTube.Channels.List request = youTube.channels()
				.list(Arrays.asList("snippet", "contentDetails", "statistics")).setKey(youtubeApiKey)
				.setForHandle(handelId);

		return request.execute();
	}

	public List<String> getLatestVideosByChannel(String channelId, long maxResults) throws IOException {
		// 채널의 업로드 플레이리스트 ID를 가져옵니다.
		// YouTube Data API는 채널에 업로드된 동영상들을 "업로드" 플레이리스트에 자동으로 추가합니다.
		ChannelListResponse channelListResponse = youTube.channels().list(Arrays.asList("contentDetails"))
				.setKey(youtubeApiKey).setId(Arrays.asList(channelId)).execute();

		String uploadsPlaylistId = null;
		if (channelListResponse.getItems() != null && !channelListResponse.getItems().isEmpty()) {
			uploadsPlaylistId = channelListResponse.getItems().get(0).getContentDetails().getRelatedPlaylists()
					.getUploads();
		}

		if (uploadsPlaylistId == null) {
			throw new IOException("채널의 업로드 플레이리스트를 찾을 수 없습니다");
		}

		// 업로드 플레이리스트에서 동영상 목록을 가져옵니다.
		PlaylistItemListResponse playlistItemListResponse = youTube.playlistItems()
				.list(Arrays.asList("snippet"))
				.setKey(youtubeApiKey)
				.setPlaylistId(uploadsPlaylistId)
				.setMaxResults(maxResults)
				.execute();

		// 동영상 제목만 추출하여 리스트로 반환합니다.
		return playlistItemListResponse.getItems().stream().map(item -> item.getSnippet().getTitle())
				.collect(Collectors.toList());
	}

	public List<String> getLatestVideosByHandle(String handleId, long maxResults) throws IOException {
		ChannelListResponse channelListResponse = youTube.channels().list(Arrays.asList("contentDetails"))
				.setKey(youtubeApiKey)
				.setForHandle(handleId)
				.execute();

		String uploadsPlaylistId = null;
		if (channelListResponse.getItems() != null && !channelListResponse.getItems().isEmpty()) {
			uploadsPlaylistId = channelListResponse.getItems().get(0).getContentDetails().getRelatedPlaylists()
					.getUploads();
		}

		if (uploadsPlaylistId == null) {
			throw new IOException("채널의 업로드 플레이리스트를 찾을 수 없습니다");
		}

		// 업로드 플레이리스트에서 동영상 목록을 가져옵니다.
		PlaylistItemListResponse playlistItemListResponse = youTube.playlistItems()
				.list(Arrays.asList("snippet"))
				.setKey(youtubeApiKey)
				.setPlaylistId(uploadsPlaylistId)
				.setMaxResults(maxResults)
				.execute();

		// 동영상 제목만 추출하여 리스트로 반환합니다.
		return playlistItemListResponse.getItems().stream().map(item -> item.getSnippet().getTitle())
				.collect(Collectors.toList());
	}

	public List<String> searchVideos(String query, long maxResults) throws IOException {
		YouTube.Search.List search = youTube.search().list(Arrays.asList("id", "snippet"));
		search.setKey(youtubeApiKey);
		search.setQ(query);
		search.setType(Arrays.asList("video")); // 동영상만 검색

		search.setFields("items(id/videoId,snippet/title)"); // 필요한 필드만 지정
		search.setMaxResults(maxResults);

		SearchListResponse searchResponse = search.execute();
		List<SearchResult> searchResultList = searchResponse.getItems();

		if (searchResultList != null) {
			return searchResultList.stream().map(item -> item.getSnippet().getTitle()).collect(Collectors.toList());
		}
		return List.of();
	}

}

