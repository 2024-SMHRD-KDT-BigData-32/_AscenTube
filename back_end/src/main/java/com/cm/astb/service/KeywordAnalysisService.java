package com.cm.astb.service;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

import org.openkoreantext.processor.KoreanTokenJava;
import org.openkoreantext.processor.OpenKoreanTextProcessorJava;
import org.openkoreantext.processor.tokenizer.KoreanTokenizer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.cm.astb.dto.ChannelKeywordDto;
import com.cm.astb.dto.PopularVideoDto;
import com.cm.astb.entity.CachedKeywordSearchResult;
import com.cm.astb.entity.CachedKeywordSearchResultId;
import com.cm.astb.entity.YouTubeVideo;
import com.cm.astb.repository.CachedKeywordSearchResultRepository;
import com.cm.astb.repository.YouTubeVideoRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.google.api.services.youtube.model.SearchResult;
import com.google.api.services.youtube.model.Video;

import scala.collection.Seq;

@Service
public class KeywordAnalysisService {

	private static final Logger logger = LoggerFactory.getLogger(KeywordAnalysisService.class);

    private final YouTubeVideoRepository youTubeVideoRepository;
    private final CachedKeywordSearchResultRepository cachedKeywordSearchResultRepository;
    private final YoutubeDataApiService youtubeApiService;
    private final ObjectMapper objectMapper;
    
    public KeywordAnalysisService(YouTubeVideoRepository youTubeVideoRepository,
			CachedKeywordSearchResultRepository cachedKeywordSearchResultRepository,
			YoutubeDataApiService youtubeApiService, ObjectMapper objectMapper) {
		this.youTubeVideoRepository = youTubeVideoRepository;
		this.cachedKeywordSearchResultRepository = cachedKeywordSearchResultRepository;
		this.youtubeApiService = youtubeApiService;
		this.objectMapper = objectMapper;
	}

	private static final HashSet<String> STOP_WORDS = new HashSet<>(Arrays.asList(
            // 한국어 불용어 (명사 형태의 불용어 위주로 남김)
            "채널", "영상", "비디오", "저희", "오늘", "이번", "저번", "다음", "지금", "나중에", "항상", "언제나", "모두", "누구나", "어디든", "무엇이든",
            "시청", "구독", "좋아요", "알림", "설정", "클릭", "링크", "때문", "관련", "위해", "대한", "통해", "위한", "가지", "정도", "점", "분", "것", "수", "등", "이", "그", "저", "것", "좀", "내", "네", "한",
            "여러분", "안녕하세요", "습니다", "입니다", "합니다", "있습니다",
            // 영어 불용어 (기존 불용어 목록에서 명사 형태가 아닌 것 위주로)
            "a", "an", "the", "and", "but", "or", "as", "at", "by", "for", "from", "in", "into", "of", "off", "on", "out", "over", "through", "to", "under", "up", "with", "within", "without",
            "is", "am", "are", "was", "were", "be", "been", "being", "have", "has", "had", "do", "does", "did", "doing", "having",
            "i", "me", "my", "myself", "we", "our", "ours", "ourselves", "you", "your", "yours", "yourself", "yourselves", "he", "him", "his", "himself", "she", "her", "hers", "herself",
            "it", "its", "itself", "they", "them", "their", "theirs", "themselves",
            "what", "which", "who", "whom", "whose", "where", "why", "how", "when", "while", "that", "this", "these", "those", "can", "could", "would", "should", "will", "would", "may", "might",
            "must", "shall", "won't", "can't", "don't", "didn't", "doesn't", "haven't", "hasn't", "hadn't", "won't", "wouldn't", "shouldn't", "couldn't", "mightn't", "mustn't",
            "just", "too", "very", "so", "such", "only", "own", "same", "then", "than", "now", "here", "there", "whence", "whereat", "whereby", "wherefore", "wherein", "whereinto",
            "whereof", "whereon", "whereto", "wherever", "whence", "why",
            "about", "above", "across", "after", "against", "along", "among", "around", "before", "behind", "below", "beneath", "beside", "besides", "between", "beyond", "during", "except",
            "inside", "outside", "plus", "round", "since", "till", "towards", "until", "upon", "versus", "via", "vice", "amongst", "around",
            "first", "second", "third", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "hundred", "thousand", "million", "billion",
            "like", "know", "get", "make", "go", "see", "come", "think", "look", "want", "give", "take", "find", "tell", "show", "call", "try", "ask", "need", "feel", "become", "leave", "put", "mean",
            "keep", "let", "begin", "seem", "help", "talk", "start", "turn", "run", "play", "move", "live", "believe", "bring", "happen", "write", "provide", "sit", "stand", "lose", "pay",
            "meet", "include", "continue", "set", "learn", "change", "lead", "understand", "watch", "follow", "stop", "create", "speak", "read", "allow", "add", "spend", "grow", "open", "walk",
            "win", "offer", "remember", "consider", "appear", "buy", "wait", "serve", "die", "send", "build", "stay", "fall", "cut", "reach", "kill", "raise", "pass", "sell", "require", "report",
            "decide", "pull", "break", "draw", "receive", "agree", "expect", "drive", "deal", "send", "charge", "hold", "form", "push", "compare", "join", "explain", "present", "develop", "throw",
            "design", "produce", "operate", "perform", "improve", "test", "analyze", "manage", "organize", "plan", "implement", "execute", "control", "monitor", "evaluate", "review",
            "about", "after", "all", "also", "always", "another", "any", "anything", "anywhere", "around", "because", "before", "behind", "below", "beside", "between", "both", "but", "by", "down",
            "each", "either", "else", "ever", "every", "everyone", "everything", "everywhere", "few", "for", "from", "further", "here", "how", "if", "in", "inside", "instead", "into", "it", "its",
            "just", "least", "less", "many", "more", "most", "much", "must", "my", "near", "never", "no", "nobody", "none", "nothing", "now", "nowhere", "of", "off", "on", "once", "one", "only",
            "onto", "or", "other", "others", "our", "out", "outside", "over", "per", "quite", "rather", "really", "right", "same", "second", "several", "shall", "should", "since", "so", "some",
            "somehow", "someone", "something", "sometime", "sometimes", "somewhere", "soon", "still", "such", "than", "that", "the", "their", "them", "then", "there", "these", "they", "thing",
            "things", "this", "those", "though", "through", "thus", "till", "to", "together", "too", "toward", "towards", "under", "until", "up", "upon", "us", "very", "via", "want", "we", "well",
            "what", "whatever", "when", "whence", "where", "wherever", "whether", "which", "while", "who", "whoever", "whole", "whom", "whose", "why", "will", "with", "within", "without", "yes",
            "yet", "you", "your", "yours"
    ));

    private static final Pattern NUMBER_ONLY_PATTERN = Pattern.compile("^[0-9]+$");

	/**
     * 주어진 YouTubeVideo 리스트에서 키워드를 추출하고 빈도수를 계산하여 워드클라우드용 데이터를 반환하는 헬퍼 메서드.
     * Open-Korean-Text 형태소 분석기를 사용하여 한국어 명사를 추출하고 정제합니다.
     *
     * @param videos 키워드를 추출할 YouTubeVideo 객체 리스트
     * @param limit  반환할 키워드의 최대 개수
     * @return 키워드 및 빈도수 리스트
     */
    private List<ChannelKeywordDto> extractKeywordsAndCalculateFrequencies(List<YouTubeVideo> videos, int limit) {
        if (videos.isEmpty()) {
            return Collections.emptyList();
        }

        StringBuilder combinedTextBuilder = new StringBuilder();
        for (YouTubeVideo video : videos) {
            if (video.getVideoTitle() != null) combinedTextBuilder.append(video.getVideoTitle()).append(" ");
            if (video.getVideoDescription() != null) combinedTextBuilder.append(video.getVideoDescription()).append(" ");
            if (video.getVideoTags() != null && !video.getVideoTags().isEmpty()) {
                Arrays.stream(video.getVideoTags().split(","))
                      .map(String::trim)
                      .forEach(tag -> combinedTextBuilder.append(tag).append(" "));
            }
        }
        String combinedText = combinedTextBuilder.toString();


        // --- OKT를 이용한 형태소 분석 및 키워드 추출 ---
        // 1. 텍스트 정규화 (선택 사항, OKT 내부에도 정규화 로직 있음)
        CharSequence normalizedText = OpenKoreanTextProcessorJava.normalize(combinedText);

        // 2. 토큰화 및 형태소 분석
        Seq<KoreanTokenizer.KoreanToken> tokens = OpenKoreanTextProcessorJava.tokenize(normalizedText);

        // 3. 어근 추출 (stemming) 및 명사 추출
        List<String> nouns = OpenKoreanTextProcessorJava.tokensToJavaKoreanTokenList(tokens).stream()
            .filter(token -> {
                String pos = token.getPos().toString(); // 품사 태그를 문자열로 가져옴
                return pos.equals("Noun") || pos.equals("ProperNoun") || pos.equals("Hashtag") || pos.equals("ScreenName"); // 명사, 고유명사, 해시태그, 스크린네임 포함
            })
            .map(this::getStemmedWord)
            .map(String::toLowerCase) // 소문자 변환
            .map(word -> word.replaceAll("[^가-힣a-zA-Z0-9]", "")) // 한글, 영어, 숫자만 남기고 특수문자 제거
            .filter(word -> word.length() >= 2) // 2글자 이상 단어만 필터링
            .filter(word -> !STOP_WORDS.contains(word)) // 불용어 제거
            .filter(word -> !NUMBER_ONLY_PATTERN.matcher(word).matches()) // 숫자만 있는 단어 제거
            .collect(Collectors.toList());

        // 4. 빈도수 계산
        Map<String, Long> keywordCounts = nouns.stream()
                .collect(Collectors.groupingBy(Function.identity(), Collectors.counting()));

        // 5. 빈도수 높은 순서로 정렬하고 상위 N개 선택 후 DTO로 변환
        List<ChannelKeywordDto> keywords = keywordCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue(Comparator.reverseOrder()))
                .limit(limit)
                .map(entry -> ChannelKeywordDto.builder()
                        .text(entry.getKey())
                        .weight(entry.getValue().intValue())
                        .build())
                .collect(Collectors.toList());

        return keywords;
    }

    /**
     * 특정 채널의 동영상 제목, 설명, 태그에서 키워드를 추출하여 워드클라우드용 데이터를 반환합니다.
     *
     * @param channelId 조회할 유튜브 채널 ID
     * @param limit     반환할 키워드의 최대 개수
     * @return 키워드 및 빈도수 리스트
     */
    @Transactional(readOnly = true)
    public List<ChannelKeywordDto> getChannelKeywordsForWordCloud(String channelId, int limit) {
        logger.info("Attempting to get keywords for word cloud for channelId: {} (limit: {})", channelId, limit);

        List<YouTubeVideo> videos = youTubeVideoRepository.findByChannelId(channelId);
        if (videos.isEmpty()) {
            logger.warn("No videos found for channelId: {}. Cannot extract keywords.", channelId);
            return Collections.emptyList();
        }

        List<ChannelKeywordDto> keywords = extractKeywordsAndCalculateFrequencies(videos, limit);

        logger.info("Successfully extracted {} keywords for channelId: {}", keywords.size(), channelId);
        return keywords;
    }


    /**
     * 특정 카테고리의 인기 동영상에서 키워드를 추출하여 워드클라우드용 데이터를 반환.
     * @param categoryId 조회할 유튜브 카테고리 ID
     * @param limit      반환할 키워드의 최대 개수
     * @return 키워드 및 빈도수 리스트
     */
    @Transactional(readOnly = true)
    public List<ChannelKeywordDto> getCategoryKeywordsForWordCloud(String categoryId, int limit) {
        logger.info("Attempting to get keywords for word cloud for categoryId: {} (limit: {}) - Future Expansion.", categoryId, limit);

        List<YouTubeVideo> popularVideosInCategory = Collections.emptyList(); // TODO: 향후 구현: 인기 동영상 조회 로직

        if (popularVideosInCategory.isEmpty()) {
            logger.warn("No popular videos found for categoryId: {}. Cannot extract keywords.", categoryId);
            return Collections.emptyList();
        }

        List<ChannelKeywordDto> keywords = extractKeywordsAndCalculateFrequencies(popularVideosInCategory, limit);

        logger.info("Successfully extracted {} keywords for categoryId: {}", keywords.size(), categoryId);
        return keywords;
    }
    
    /**
     * KoreanTokenJava 객체에서 어근(stem) 또는 원래 텍스트를 안전하게 추출.
     * @param token 형태소 분석된 토큰
     * @return 어근 또는 원래 텍스트 (String)
     */
    private String getStemmedWord(KoreanTokenJava token) {
    	 String stem = token.getStem();
         if (stem != null && !stem.isEmpty()) {
             return stem;
         } else {
             return token.getText();
         }
    }
    
    /**
     * 특정 키워드에 대한 인기 동영상 검색 결과를 조회합니다.
     * 캐시 유효 기간(예: 24시간) 내에 데이터가 있으면 캐시에서 반환하고, 없으면 YouTube API를 호출하여 캐시하고 반환합니다.
     * 이 메서드는 이제 `getPopularVideosForChannelKeywords` 내부에서 각 키워드별로 호출됩니다.
     *
     * @param keyword          조회할 키워드
     * @param videoCategoryId  동영상 카테고리 ID (선택 사항, null 또는 "ALL"인 경우 전체 카테고리)
     * @param resultLimit      이 키워드에 대해 가져올 영상의 최대 개수 (API 호출 및 캐싱될 결과 수)
     * @return 캐시되거나 새로 검색된 인기 동영상 목록 DTO
     */
    @Transactional
    public List<PopularVideoDto> getPopularVideosForKeyword(String keyword, String videoCategoryId, int resultLimit) {
        logger.info("Attempting to get popular videos for keyword: '{}', category: '{}', resultLimit: {}",
                    keyword, videoCategoryId != null ? videoCategoryId : "ALL", resultLimit);

        long cacheValidityHours = 24; // 캐시 유효 시간 (시간 단위)
        LocalDateTime currentCollectionDate = LocalDate.now().atStartOfDay();
        String actualCategoryId = (videoCategoryId == null || videoCategoryId.isEmpty()) ? "ALL" : videoCategoryId;

        CachedKeywordSearchResultId cachedId = new CachedKeywordSearchResultId(keyword, currentCollectionDate, actualCategoryId);
        Optional<CachedKeywordSearchResult> cachedResultOpt = cachedKeywordSearchResultRepository.findById(cachedId);

        // 1. 캐시에서 최신 유효 데이터 조회 시도
        if (cachedResultOpt.isPresent()) {
            LocalDateTime cachedAt = cachedResultOpt.get().getUpdatedAt();
            long hoursSinceCached = ChronoUnit.HOURS.between(cachedAt, LocalDateTime.now());

            if (hoursSinceCached < cacheValidityHours) {
                try {
                    logger.info("Cache hit for keyword: '{}', category: '{}'. Cached at {} ({} hours old).", keyword, actualCategoryId, cachedAt, hoursSinceCached);
                    List<PopularVideoDto> results = objectMapper.readValue(
                        cachedResultOpt.get().getSearchResultsJson(),
                        new TypeReference<List<PopularVideoDto>>() {}
                    );
                    return results; // 캐시된 원본 리스트를 반환 (최종 limit은 호출하는 쪽에서 처리)
                } catch (JsonProcessingException e) {
                    logger.error("Error deserializing cached search results for keyword '{}', category '{}': {}", keyword, actualCategoryId, e.getMessage(), e);
                }
            } else {
                logger.info("Cache for keyword: '{}', category: '{}' found but expired ({} hours old).", keyword, actualCategoryId, hoursSinceCached);
            }
        } else {
            logger.info("Cache miss for keyword: '{}', category: '{}'. No entry for today.", keyword, actualCategoryId);
        }

        // 2. 캐시 미스 또는 캐시 만료 시, YouTube API 호출
        List<SearchResult> searchResults = Collections.emptyList();
        String searchGoogleId = "105233553913338283491";
        try {
            String regionCode = "KR";
            String order = "viewCount";
            long apiMaxResults = 10L;

            searchResults = youtubeApiService.searchVideosByKeyword(
                searchGoogleId, keyword, apiMaxResults, regionCode, actualCategoryId, order
            );

        } catch (IOException | GeneralSecurityException e) {
            logger.error("Error calling YouTube API for keyword '{}', category '{}': {}", keyword, actualCategoryId, e.getMessage(), e);
            return Collections.emptyList();
        }

        // 3. 가져온 데이터를 캐시하고 DTO로 반환
        List<Map<String, Object>> videoDetailsList = new ArrayList<>();
        List<PopularVideoDto> popularVideoDtos = new ArrayList<>();

        for (SearchResult result : searchResults) {
            String videoId = result.getId().getVideoId();
            if (videoId == null) continue;

            Long viewsCount = null;
            String actualVideoCategoryId = null; // <--- 추가

            // 각 SearchResult에 대해 Video Data API (videos.list)를 추가 호출하여 통계 정보 및 스니펫 정보 가져오기
            try {
                Video videoStatsAndSnippet = youtubeApiService.getVideoStatistics(searchGoogleId, videoId); // <-- 수정: 메서드 이름은 그대로지만 snippet도 가져옴
                if (videoStatsAndSnippet != null) {
                    if (videoStatsAndSnippet.getStatistics() != null) {
                        viewsCount = videoStatsAndSnippet.getStatistics().getViewCount().longValue();
                    }
                    if (videoStatsAndSnippet.getSnippet() != null) { // <--- 추가
                        actualVideoCategoryId = videoStatsAndSnippet.getSnippet().getCategoryId(); // <--- 카테고리 ID 가져오기
                    }
                }
            } catch (IOException | GeneralSecurityException e) {
                logger.error("Error fetching statistics and snippet for videoId {}: {}", videoId, e.getMessage());
            }

            Map<String, Object> videoData = new LinkedHashMap<>();
            videoData.put("videoKey", videoId);
            videoData.put("videoTitle", result.getSnippet().getTitle());
            videoData.put("thumbnailUrl", Optional.ofNullable(result.getSnippet().getThumbnails())
                                                 .map(t -> t.getDefault())
                                                 .map(td -> td.getUrl())
                                                 .orElse(null));
            videoData.put("channelId", result.getSnippet().getChannelId());
            videoData.put("channelTitle", result.getSnippet().getChannelTitle());
            videoData.put("publishedAt", result.getSnippet().getPublishedAt().toStringRfc3339());
            videoData.put("videoCategoryId", actualVideoCategoryId); // <--- 실제 비디오 카테고리 ID 사용
            videoData.put("viewsCount", viewsCount);

            videoDetailsList.add(videoData);

            popularVideoDtos.add(PopularVideoDto.builder()
                                .videoKey(videoId)
                                .videoTitle(result.getSnippet().getTitle())
                                .thumbnailUrl(Optional.ofNullable(result.getSnippet().getThumbnails())
                                                    .map(t -> t.getDefault())
                                                    .map(td -> td.getUrl())
                                                    .orElse(null))
                                .channelId(result.getSnippet().getChannelId())
                                .channelTitle(result.getSnippet().getChannelTitle())
                                .publishedAt(LocalDateTime.parse(result.getSnippet().getPublishedAt().toStringRfc3339().substring(0, 19)))
                                .videoCategoryId(actualVideoCategoryId) // <--- 실제 비디오 카테고리 ID 사용
                                .viewsCount(viewsCount)
                                .build());
        }
        // 캐시 저장 (UPSERT)
        try {
            CachedKeywordSearchResult cachedResult = new CachedKeywordSearchResult();
            cachedResult.setId(cachedId);
            cachedResult.setSearchResultsJson(objectMapper.writeValueAsString(videoDetailsList));
            cachedKeywordSearchResultRepository.save(cachedResult);
            logger.info("Successfully cached {} search results for keyword: '{}', category: '{}'.", searchResults.size(), keyword, actualCategoryId);
        } catch (JsonProcessingException e) {
            logger.error("Error serializing search results for keyword '{}', category '{}' for caching: {}", keyword, actualCategoryId, e.getMessage(), e);
        }

        // API로부터 가져온 원본 리스트를 반환 (최종 limit은 호출하는 쪽에서 처리)
        return popularVideoDtos;
    }


    /**
     * 특정 채널의 상위 키워드들을 기반으로 인기 동영상 목록을 조회합니다.
     * 이 메서드는 각 상위 키워드별로 캐시되거나 새로 검색된 인기 영상을 가져와 합산합니다.
     *
     * @param channelId        조회할 채널 ID (키워드 추출용)
     * @param videoCategoryId  동영상 카테고리 ID (선택 사항, null 또는 "ALL"인 경우 전체 카테고리)
     * @param totalResultLimit 최종적으로 반환할 영상의 최대 개수
     * @param keywordLimit     채널에서 가져올 상위 키워드의 개수 (예: 5개)
     * @return 각 키워드별 인기 영상 목록을 합산한 최종 목록 (중복 제거 후 제한)
     */
    @Transactional
    public List<PopularVideoDto> getPopularVideosForChannelKeywords(
            String channelId,
            String videoCategoryId,
            int totalResultLimit,
            int keywordLimit) { // 몇 개의 상위 키워드를 사용할지

        logger.info("Getting popular videos for channel '{}' based on its top {} keywords. Total result limit: {}",
                    channelId, keywordLimit, totalResultLimit);

        // 1. 해당 채널의 상위 키워드를 가져옵니다.
        List<ChannelKeywordDto> topKeywords = getChannelKeywordsForWordCloud(channelId, keywordLimit);
        if (topKeywords.isEmpty()) {
            logger.warn("No top keywords found for channelId: {}. Returning empty list for popular videos.", channelId);
            return Collections.emptyList();
        }

        // 2. 각 상위 키워드에 대해 인기 영상을 가져옵니다. (캐시 또는 API 호출)
        // Set을 사용하여 중복 제거 및 최종 순서 유지를 위해 LinkedHashSet 사용
        Set<PopularVideoDto> distinctPopularVideos = new LinkedHashSet<>();
        
        // 각 키워드별로 몇 개의 영상을 가져올지 설정 (예: 각 키워드당 10개, 총 50개면 적절)
        int videosPerKeyword = 2; 

        for (ChannelKeywordDto keywordDto : topKeywords) {
            String keyword = keywordDto.getText();
            // 각 키워드에 대해 getPopularVideosForKeyword 호출
            List<PopularVideoDto> videosForKeyword = getPopularVideosForKeyword(keyword, videoCategoryId, videosPerKeyword); // resultLimit 대신 videosPerKeyword 전달
            distinctPopularVideos.addAll(videosForKeyword); // 중복 제거하며 추가
            
            // 총 결과 개수 제한을 초과하면 루프 중단
            if (distinctPopularVideos.size() >= totalResultLimit) {
                break;
            }
        }

        // 3. 최종 결과 리스트로 변환하고, 요청된 totalResultLimit에 맞춰 제한합니다.
        List<PopularVideoDto> finalResult = new ArrayList<>(distinctPopularVideos);
        finalResult.sort(Comparator.comparing(PopularVideoDto::getViewsCount, Comparator.nullsLast(Comparator.reverseOrder()))); // 조회수 기준으로 내림차순 정렬 (PopularVideoDto에 viewsCount 필드 추가 필요)

        return finalResult.stream()
                          .limit(totalResultLimit)
                          .collect(Collectors.toList());
    }
}