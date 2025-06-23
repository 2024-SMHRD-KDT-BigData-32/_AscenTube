import React, { useEffect, useState, useMemo } from 'react';
import PageLayout from '../layouts/PageLayout';
import '../styles/pages/Ai.css';
import { fetchChannelKeywords } from '../api/keywordApi';
// --- [에러 해결] --- default export를 가져오기 위해 { } 중괄호를 제거하고, 확장자를 명시합니다.
import fetchAiStrategyReport from '../api/AiApi.jsx'; 
import { fetchDashboardData } from '../api/dashboardApi';
import { fetchCommentAnalysisSummary } from '../api/CommentApi';

// ============================================
// 🟦 상수 및 헬퍼
// ============================================

const SPEECH_ACT_LABELS = {
    PRAISE: '칭찬', CRITICISM: '비판', INFO: '정보제공',
    QUESTION: '질문', EMOTION: '감정표현', REQUEST: '요청', ETC: '기타'
};

const SENTIMENT_LABELS = {
    POSITIVE: '긍정', NEUTRAL: '중립', NEGATIVE: '부정'
};

const NoDataMessage = () => <div className="no-data-message">데이터가 없습니다.</div>;

const AnalysisChart = ({ data, total, labelMap }) => {
    if (!data || data.length === 0) return <NoDataMessage />;
    const calculatedData = data.map(item => ({ ...item, percentage: total > 0 ? (item.count / total) * 100 : 0 }));
    return (
        <ul className="bar-chart-list">
            {calculatedData.sort((a, b) => b.percentage - a.percentage).map(item => {
                if (!item.type) return null;
                const colorClass = item.type.startsWith('P') || item.type.startsWith('N') ? `sentiment-${item.type.toLowerCase()}` : `cat-${item.type.toLowerCase()}`;
                return (
                    <li key={item.type}>
                        <span className="label">{labelMap[item.type] || item.type}</span>
                        <div className="bar-wrapper"><div className={`bar ${colorClass}`} style={{ width: `${item.percentage}%` }}></div></div>
                        <span className="value">{item.percentage.toFixed(1)}%</span>
                    </li>
                );
            })}
        </ul>
    );
};

// --- [디자인 개선] --- 분석적인 UI를 위한 '전략 제안 카드' 컴포넌트 ---
const StrategyCard = ({ icon, title, recommendation }) => (
    <div className="strategy-card">
        <div className="card-header">
            <span className="card-icon">{icon}</span>
            <h3 className="card-title">{title}</h3>
        </div>
        <div className="card-body">
            <p className="recommendation" dangerouslySetInnerHTML={{ __html: recommendation.replace(/\n/g, '<br />') }} />
        </div>
        <div className="card-footer">
            <span className="based-on-label">분석 기반</span>
            <span className="based-on-data">채널 데이터 종합 분석</span>
        </div>
    </div>
);


// ============================================
// 🟦 메인 컴포넌트
// ============================================
const Ai = () => {
    const [popularKeywords, setPopularKeywords] = useState([]);
    const [topWatchedVideos, setTopWatchedVideos] = useState([]);
    const [analysisData, setAnalysisData] = useState(null);
    const [aiReport, setAiReport] = useState(null); // insightSummary와 strategyProposals를 함께 관리
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [activeTab, setActiveTab] = useState('speechAct');

    useEffect(() => {
        const loadAiData = async () => {
            setLoading(true);
            try {
                const userChannelId = localStorage.getItem('user_youtube_channel_id');
                if (!userChannelId) throw new Error('사용자 채널 ID를 찾을 수 없습니다. 다시 로그인 해주세요.');

                const [keywordsData, aiReportData, dashboardData, commentData] = await Promise.all([
                    fetchChannelKeywords(userChannelId, 5),
                    fetchAiStrategyReport(userChannelId),
                    fetchDashboardData(),
                    fetchCommentAnalysisSummary(userChannelId, 'quarter')
                ]);

                if (keywordsData) setPopularKeywords(keywordsData);
                if (aiReportData) setAiReport(aiReportData);
                if (dashboardData?.contentPerformance?.topViewDurationVideos) {
                    setTopWatchedVideos(dashboardData.contentPerformance.topViewDurationVideos);
                }
                if (commentData) {
                    const standardize = (text) => text?.toUpperCase() || null;
                    const standardizedData = {
                        ...commentData,
                        speechActDistribution: commentData.speechActDistribution?.map(item => ({...item, type: standardize(item.type) })),
                        sentimentDistribution: commentData.sentimentDistribution?.map(item => ({...item, type: standardize(item.type) })),
                    };
                    setAnalysisData(standardizedData);
                }
            } catch (err) {
                setError(err);
                console.error("AI 페이지 데이터 로딩 중 에러:", err);
            } finally {
                setLoading(false);
            }
        };
        loadAiData();
    }, []);

    // --- [기능 구현] --- API 응답을 '전략 카드' 데이터 구조로 변환하는 로직 ---
    const strategyCardsData = useMemo(() => {
        const proposals = aiReport?.strategyProposals;
        if (!proposals) return [];

        const cardData = [];
        
        // API가 제공하는 'planning' 전략을 카드로 변환
        if (proposals.planning && proposals.planning.length > 0) {
            const [title, ...descParts] = proposals.planning[0].split(':');
            cardData.push({
                icon: '💡',
                title: title.trim() || '콘텐츠 기획 전략',
                recommendation: descParts.join(':').trim() || '제공된 추천 내용이 없습니다.'
            });
        }
        
        // API가 제공하는 'timing' 전략을 카드로 변환
        if (proposals.timing && proposals.timing.length > 0) {
            const [title, ...descParts] = proposals.timing[0].split(':');
            cardData.push({
                icon: '⏰',
                title: title.trim() || '업로드 최적 시간',
                recommendation: descParts.join(':').trim() || '제공된 추천 내용이 없습니다.'
            });
        }

        // API가 제공하는 'editing' 전략을 카드로 변환
        if (proposals.editing && proposals.editing.length > 0) {
            const [title, ...descParts] = proposals.editing[0].split(':');
            cardData.push({
                icon: '🎨',
                title: title.trim() || '타이틀/썸네일 전략',
                recommendation: descParts.join(':').trim() || '제공된 추천 내용이 없습니다.'
            });
        }

        return cardData;
    }, [aiReport]);

    if (loading) return <PageLayout title="AI 콘텐츠 전략 코치"><h2 className="no-data-message">AI 분석 데이터를 생성 중입니다...</h2></PageLayout>;
    if (error) return <PageLayout title="AI 콘텐츠 전략 코치"><h2 className="no-data-message">데이터 분석 중 오류가 발생했습니다: {error.message}</h2></PageLayout>;

    return (
        <PageLayout title="AI 콘텐츠 전략 코치">
            <section className="page-section">
                <h2>콘텐츠 인사이트 요약</h2>
                <div className="insight-grid">
                    <div className="insight-box">
                        <h3>인기 키워드</h3>
                        {popularKeywords.length > 0 ? (
                            <ul>{popularKeywords.map((k, i) => <li key={i}><strong>{k.text}</strong><span>{k.value}회</span></li>)}</ul>
                        ) : <NoDataMessage />}
                    </div>

                    <div className="insight-box detailed-analysis-box">
                        <div className="analysis-tab-nav">
                            <button className={activeTab === 'speechAct' ? 'active' : ''} onClick={() => setActiveTab('speechAct')}>화행 분석</button>
                            <button className={activeTab === 'sentiment' ? 'active' : ''} onClick={() => setActiveTab('sentiment')}>긍부정 분석</button>
                        </div>
                        <div className="analysis-tab-content">
                            {activeTab === 'speechAct' && <AnalysisChart data={analysisData?.speechActDistribution} total={analysisData?.totalComments} labelMap={SPEECH_ACT_LABELS} />}
                            {activeTab === 'sentiment' && <AnalysisChart data={analysisData?.sentimentDistribution} total={analysisData?.totalComments} labelMap={SENTIMENT_LABELS} />}
                        </div>
                        <p className="note">* 분기별 댓글 분석 기반</p>
                    </div>

                    <div className="insight-box">
                        <h3>몰입도 최고의 영상</h3>
                        {topWatchedVideos.length > 0 ? (
                            <ol className="ranked-list">
                                {topWatchedVideos.map((video, index) => (
                                    <li key={video.id}>
                                        <span className="rank">{index + 1}.</span>
                                        <span className="title" title={video.title}>{video.title}</span>
                                        <span className="value">{video.avgDuration}</span>
                                    </li>
                                ))}
                            </ol>
                        ) : <NoDataMessage />}
                        <p className="note">* 평균 시청 시간 기준 TOP 5</p>
                    </div>
                </div>
                
                {aiReport?.insightSummary && (
                    <div className="summary-box">
                        <p dangerouslySetInnerHTML={{ __html: aiReport.insightSummary.replace(/\n/g, '<br />') }} />
                    </div>
                )}
            </section>

            <section className="page-section">
                <h2>AI 기반 전략 제안</h2>
                {strategyCardsData.length > 0 ? (
                    <div className="strategy-grid">
                        {strategyCardsData.map((card, index) => (
                            <StrategyCard
                                key={index}
                                icon={card.icon}
                                title={card.title}
                                recommendation={card.recommendation}
                            />
                        ))}
                    </div>
                ) : <NoDataMessage />}
            </section>
        </PageLayout>
    );
};

export default Ai;