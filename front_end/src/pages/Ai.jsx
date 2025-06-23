import React, { useEffect, useState } from 'react';
import PageLayout from '../layouts/PageLayout';
import '../styles/pages/Ai.css';
import { fetchChannelKeywords } from '../api/keywordApi';
import { fetchAiStrategyReport } from '../api/AiApi';
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


// [개선] 바 차트 UI를 위한 재사용 컴포넌트 추가
const AnalysisChart = ({ data, total, labelMap }) => {
    if (!data || data.length === 0) {
        return <NoDataMessage />;
    }

    // [핵심] API의 percentage 대신 count와 total로 직접 비율을 계산
    const calculatedData = data.map(item => ({
        ...item,
        percentage: total > 0 ? (item.count / total) * 100 : 0
    }));

    return (
        <ul className="bar-chart-list">
            {calculatedData
                .sort((a, b) => b.percentage - a.percentage)
                .map(item => {
                    // type 키가 없는 경우를 대비한 안전장치
                    if (!item.type) return null; 

                    const colorClass = item.type.startsWith('P') || item.type.startsWith('N')
                        ? `sentiment-${item.type.toLowerCase()}`
                        : `cat-${item.type.toLowerCase()}`;

                    return (
                        <li key={item.type}>
                            <span className="label">{labelMap[item.type] || item.type}</span>
                            <div className="bar-wrapper">
                                <div 
                                    className={`bar ${colorClass}`} 
                                    style={{ width: `${item.percentage}%` }}
                                ></div>
                            </div>
                            <span className="value">{item.percentage.toFixed(1)}%</span>
                        </li>
                    );
                })}
        </ul>
    );
};


// ============================================
// 🟦 메인 컴포넌트
// ============================================

const Ai = () => {
    // State 선언
    const [popularKeywords, setPopularKeywords] = useState([]);
    const [topWatchedVideos, setTopWatchedVideos] = useState([]);
    const [analysisData, setAnalysisData] = useState(null);
    const [insightSummary, setInsightSummary] = useState('');
    const [strategyProposals, setStrategyProposals] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    // 화행/긍부정 분석 탭 상태 관리
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
                if (aiReportData) {
                    setInsightSummary(aiReportData.insightSummary);
                    setStrategyProposals(aiReportData.strategyProposals);
                }
                if (dashboardData?.contentPerformance?.topViewDurationVideos) {
                    setTopWatchedVideos(dashboardData.contentPerformance.topViewDurationVideos);
                }
                if (commentData) {
                    // [개선] 데이터의 key를 대문자로 표준화하여 안정성 확보
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

    if (loading) {
        return <PageLayout title="AI 콘텐츠 전략 코치"><h2 className="no-data-message">AI 분석 데이터를 생성 중입니다...</h2></PageLayout>;
    }
    if (error) {
        return <PageLayout title="AI 콘텐츠 전략 코치"><h2 className="no-data-message">데이터 분석 중 오류가 발생했습니다: {error.message}</h2></PageLayout>;
    }

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

                    {/* '댓글 상세 분석' 섹션 (탭 UI 적용) */}
                    <div className="insight-box detailed-analysis-box">
                        <div className="analysis-tab-nav">
                            <button 
                                className={activeTab === 'speechAct' ? 'active' : ''}
                                onClick={() => setActiveTab('speechAct')}
                            >
                                화행 분석
                            </button>
                            <button 
                                className={activeTab === 'sentiment' ? 'active' : ''}
                                onClick={() => setActiveTab('sentiment')}
                            >
                                긍부정 분석
                            </button>
                        </div>
                        
                        <div className="analysis-tab-content">
                            {/* [개선] 새로운 AnalysisChart 컴포넌트를 사용하여 렌더링 */}
                            {activeTab === 'speechAct' && (
                                <AnalysisChart 
                                    data={analysisData?.speechActDistribution}
                                    total={analysisData?.totalComments}
                                    labelMap={SPEECH_ACT_LABELS}
                                />
                            )}

                            {activeTab === 'sentiment' && (
                                <AnalysisChart 
                                    data={analysisData?.sentimentDistribution}
                                    total={analysisData?.totalComments}
                                    labelMap={SENTIMENT_LABELS}
                                />
                            )}
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
                
                {insightSummary && (
                    <div className="summary-box">
                        <p dangerouslySetInnerHTML={{ __html: insightSummary.replace(/\n/g, '<br />') }} />
                    </div>
                )}
            </section>

            <section className="page-section">
                <h2>AI 기반 전략 제안</h2>
                <div className="strategy-grid">
                    <div className="strategy-box"><h3>콘텐츠 기획 전략</h3>{strategyProposals?.planning?.length > 0 ? (<ul>{strategyProposals.planning.map((item, i) => <li key={i}>{item}</li>)}</ul>) : <NoDataMessage />}</div>
                    <div className="strategy-box"><h3>업로드 최적 시간</h3>{strategyProposals?.timing?.length > 0 ? (<ul>{strategyProposals.timing.map((item, i) => <li key={i}>{item}</li>)}</ul>) : <NoDataMessage />}</div>
                    <div className="strategy-box"><h3>타이틀/썸네일 전략</h3>{strategyProposals?.editing?.length > 0 ? (<ul>{strategyProposals.editing.map((item, i) => <li key={i}>{item}</li>)}</ul>) : <NoDataMessage />}</div>
                </div>
            </section>
        </PageLayout>
    );
};

export default Ai;