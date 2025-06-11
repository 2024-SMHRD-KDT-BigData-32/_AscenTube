package com.cm.astb.controller;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.HttpStatusCode;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.cm.astb.security.CustomUserDetails;
import com.cm.astb.service.ChannelService;
import com.google.api.services.youtube.model.Channel;
import com.google.api.services.youtube.model.ChannelListResponse;
import com.google.api.services.youtube.model.Video;

@RestController
@RequestMapping("/channel")
public class ChannelController {
	
	private final ChannelService channelService;

	public ChannelController(ChannelService channelService) {
		this.channelService = channelService;
	}
	
	@GetMapping("/channel-info")
	public ResponseEntity<?> getChannelInfo(@RequestParam("channelId") String channelId) {
		try {
			
			Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
			if (authentication == null || !authentication.isAuthenticated()) {
				return ResponseEntity.status(org.springframework.http.HttpStatus.UNAUTHORIZED)
						.body(Map.of("error", "User is unauthorized."));
			}
			
			Object principal = authentication.getPrincipal();
			if(!(principal instanceof CustomUserDetails)) {
				return ResponseEntity.status(org.springframework.http.HttpStatus.FORBIDDEN)
						.body(Map.of("error", "Invalid user information."));
			}
			CustomUserDetails userDetails = (CustomUserDetails) principal;
			String userId = userDetails.getUsername();
			
			
			if(userId == null || userId.isEmpty()) {
				return ResponseEntity.status(org.springframework.http.HttpStatus.INTERNAL_SERVER_ERROR)
						.body(Map.of("error", "Can't load authorized user's ID."));
			}
			
			ChannelListResponse response = channelService.getChannelInfoById(userId, channelId);
			
			List<Video> latestVideos = channelService.getLatestVideosFromChannel(userId, response);
			List<Video> popularVideos = channelService.getPopularVideosFromChannel(userId, channelId);
			
			if (response != null && response.getItems() != null && !response.isEmpty()) {
				Channel channel = response.getItems().get(0);
				Map<String, Object> channelInfo = Map.of(
					"channelId", channel.getId(),
					"title", channel.getSnippet().getTitle(),
					"description", channel.getSnippet().getDescription(),
					"thumnailUrl", channel.getSnippet().getThumbnails().getDefault().getUrl(),
					"publishedAt", channel.getSnippet().getPublishedAt(),
					"viewCount", channel.getStatistics().getViewCount(),
					"subscriberCount", channel.getStatistics().getSubscriberCount(),
					"videoCount", channel.getStatistics().getVideoCount(),
					"latestVideos", latestVideos,
					"popularVideos", popularVideos
				);
				
				return ResponseEntity.ok(channelInfo);
			} else {
				return ResponseEntity.status(HttpStatus.NOT_FOUND)
						.body(Map.of("error", "Can't find channel infomation."));
			}
		} catch (IOException e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", "An Error occured while call YouTube Data API: " + e.getMessage()));
		} catch (GeneralSecurityException e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
					.body(Map.of("error", e.getMessage()));
		} catch (Exception e) {
			e.printStackTrace();
			return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
					.body(Map.of("error", e.getMessage()));
		}
	}
}
	
