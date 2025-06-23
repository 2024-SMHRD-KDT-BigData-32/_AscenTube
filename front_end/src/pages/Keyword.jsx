// src/pages/Keyword.jsx

import React, { useEffect, useState } from 'react';
import PageLayout from '../layouts/PageLayout'; // 재사용 레이아웃 import
import '../styles/pages/Keyword.css'; // Keyword 페이지 전용 CSS
import WordCloudBox from '../components/WordCloudBox'; // WordCloudBox 컴포넌트를 다시 import 합니다.
import { fetchChannelKeywords, fetchRelatedPopularVideos } from '../api/keywordApi';
import { fetchDashboardData } from '../api/dashboardApi';

const NoDataMessage = () => <div className="no-data-message">데이터가 없습니다.</div>;

// 'getTagStyle' 헬퍼 함수는 WordCloudBox를 사용하므로 더 이상 필요하지 않습니다.

const Keyword = () => {
    const [channelKeywords, setChannelKeywords] = useState([]);
    const [relatedVideos, setRelatedVideos] = useState([]);
    const [representativeVideos, setRepresentativeVideos] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadPageData = async () => {
            setLoading(true);
            try {
                const userChannelId = localStorage.getItem('user_youtube_channel_id');
                if (!userChannelId) throw new Error('사용자 채널 ID를 찾을 수 없습니다. 다시 로그인 해주세요.');

                const [keywordsData, videosData, dashboardData] = await Promise.all([
                    fetchChannelKeywords(userChannelId, 15),
                    fetchRelatedPopularVideos(userChannelId, 8),
                    fetchDashboardData()
                ]);
                
                setChannelKeywords(keywordsData);
                setRelatedVideos(videosData);
                
                if (keywordsData.length > 0 && dashboardData?.contentPerformance) {
                    const topKeywords = keywordsData;
                    const topChannelVideos = [...dashboardData.contentPerformance.topSubscriberVideos, ...dashboardData.contentPerformance.topViewDurationVideos];
                    const usedVideoIds = new Set();
                    const matchedVideos = topKeywords.map(keyword => {
                        const foundVideo = topChannelVideos.find(video => video.title.toLowerCase().includes(keyword.text.toLowerCase()) && !usedVideoIds.has(video.id));
                        if (foundVideo) {
                            usedVideoIds.add(foundVideo.id);
                            return {
                                keyword: keyword.text,
                                video: foundVideo,
                                performance: foundVideo.newSubs ? `${foundVideo.newSubs.toLocaleString()}명 구독` : `평균 ${foundVideo.avgDuration} 시청`
                            };
                        }
                        return null;
                    }).filter(Boolean).slice(0, 5);
                    setRepresentativeVideos(matchedVideos);
                }
            } catch (err) {
                setError(err);
            } finally {
                setLoading(false);
            }
        };
        loadPageData();
    }, []);

    // min/max 계산 로직은 WordCloudBox 내부에서 처리하므로 여기서는 필요 없습니다.

    if (loading) {
        return <PageLayout title="키워드 분석"><h2>데이터 로딩 중...</h2></PageLayout>;
    }
    if (error) {
        return <PageLayout title="키워드 분석"><h2>에러가 발생했습니다: {error.message}</h2></PageLayout>;
    }

    return (
        <PageLayout title="키워드 분석">
            {/* 섹션 1: 채널 키워드 (WordCloudBox 컴포넌트 사용으로 복원) */}
            <section className="page-section">
                <h2>채널 키워드</h2>
                {channelKeywords.length > 0 ? (
                    <WordCloudBox words={channelKeywords} />
                ) : <NoDataMessage />}
            </section>
            
            {/* 섹션 2: 연관 인기 동영상 */}
            <section className="page-section">
                <h2>연관 인기 동영상</h2>
                <div className="list-box video-list-box">
                    {relatedVideos.length > 0 ? (
                        relatedVideos.map(video => (
                            <a key={video.id} className="list-card video-card" href={video.hreflink} target="_blank" rel="noopener noreferrer">
                                <div className="video-thumbnail-container">
                                    <img src={video.thumbnailUrl} alt={video.title} className="video-thumbnail-image" />
                                </div>
                                <div className="list-card-content">
                                    <h4 className="list-card-title">{video.title}</h4>
                                    <p className="list-card-meta">{video.channel}</p>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.75rem' }}>
                                        <p className="list-card-meta secondary">
                                            {/* 조회수 아이콘 SVG */}
                                            <svg className="meta-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639l4.418-2.209a1.012 1.012 0 011.332.091l.888.887a1.012 1.012 0 001.433 0l2.88-2.879a1.012 1.012 0 011.433 0l.888.887a1.012 1.012 0 001.332-.091l4.418-2.209a1.012 1.012 0 010 .639l-4.418 2.209a1.012 1.012 0 01-1.332-.09l-.888-.887a1.012 1.012 0 00-1.433 0L9.88 12.322a1.012 1.012 0 01-1.433 0l-.888-.887a1.012 1.012 0 00-1.332.09L2.036 12.322z" /><path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 100-7 3.5 3.5 0 000 7z" /></svg>
                                            {video.views}
                                        </p>
                                        <p className="list-card-meta secondary">
                                            {/* 날짜 아이콘 SVG */}
                                            <svg className="meta-icon" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                                            {video.date}
                                        </p>
                                    </div>
                                </div>
                            </a>
                        ))
                    ) : <NoDataMessage />}
                </div>
            </section>
            
            {/* 섹션 3: 키워드별 대표 영상 */}
            <section className="page-section">
                <h2>키워드별 대표 영상</h2>
                {representativeVideos.length > 0 ? (
                    <ul className="representative-video-list">
                        {representativeVideos.map((item) => (
                            <li key={item.video.id} className="representative-video-item">
                                <span className="rep-keyword-tag">#{item.keyword}</span>
                                <div className="rep-video-info">
                                    <span className="title" title={item.video.title}>{item.video.title}</span>
                                    <span className="performance">
                                        성과: <span className="metric-value">{item.performance}</span>
                                    </span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : <NoDataMessage />}
            </section>
        </PageLayout>
    );
};

export default Keyword;
