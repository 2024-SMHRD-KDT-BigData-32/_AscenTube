package com.cm.astb.controller;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cm.astb.service.YoutubeDataApiService;
import com.google.api.services.youtube.model.ChannelListResponse;

@RestController
@RequestMapping("/youtube")
public class YoutubeDataApiController {
	
	@Autowired
	private YoutubeDataApiService youtubeDataApiService;
	
	
	@GetMapping("/channel-info")
	public ResponseEntity<?> getChannelInfo(@RequestParam String channelId){
		try {
			ChannelListResponse response = youtubeDataApiService.getChannelInfo(channelId);
			if (response.getItems() != null && !response.getItems().isEmpty()) {
				return ResponseEntity.ok(response.getItems().get(0));
			} else {
				return ResponseEntity.notFound().build();
			}
		} catch (Exception e) {
			return ResponseEntity.status(500).body("Error fetching channel info: " + e.getMessage());
		}
	}
	
	@GetMapping("/channel-info-by-handle")
	public ResponseEntity<?> getChannelInfoByHandle(@RequestParam String handleId){
		try {
			ChannelListResponse response = youtubeDataApiService.getChannelInfoByHandle(handleId);
			if (response.getItems() != null && !response.getItems().isEmpty()) {
				return ResponseEntity.ok(response.getItems().get(0));
			} else {
				return ResponseEntity.notFound().build();
			}
		} catch (Exception e) {
			return ResponseEntity.status(500).body("Error fetching channel info by handle: " + e.getMessage());
		}
	}
	
	@GetMapping("/latest-videos")
	public ResponseEntity<?> getLatestVideos(@RequestParam(defaultValue = "UC_x5XG1OV2P6uZZ5FSM9Ttw") String channelId,
											@RequestParam(defaultValue = "5") long maxResults){
		try {
			List<String> videoTitles = youtubeDataApiService.getLatestVideosByChannel(channelId, maxResults);
			return ResponseEntity.ok(videoTitles);
		} catch (Exception e) {
			return ResponseEntity.status(500).body("Error searching videos : " + e.getMessage());
		}
	}

	@GetMapping("/latest-videos-by-handle")
	public ResponseEntity<?> getLatestVideosByHandle(@RequestParam(defaultValue = "") String handleId,
													@RequestParam(defaultValue = "5") long maxResults){
		try {
			List<String> videoTitles = youtubeDataApiService.getLatestVideosByHandle(handleId, maxResults);
			return ResponseEntity.ok(videoTitles);
		} catch (Exception e) {
			return ResponseEntity.status(500).body("Error searching videos : " + e.getMessage());
		}
	}
	
	@GetMapping("/search-videos")
	public ResponseEntity<?> searchVideos(@RequestParam String query, 
										@RequestParam(defaultValue = "10") long maxResults){
		try {
			List<String> videoTitles = youtubeDataApiService.searchVideos(query, maxResults);
			return ResponseEntity.ok(videoTitles);
		} catch (Exception e) {
			return ResponseEntity.status(500).body("Error searching videos: " + e.getMessage());
		}
	}
}

