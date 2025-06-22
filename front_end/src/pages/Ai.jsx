// src/pages/Ai.jsx

import React, { useEffect, useState, useRef } from 'react';
import '../styles/pages/Ai.css';
import { fetchChannelKeywords } from '../api/keywordApi';
import { fetchAiStrategyReport } from '../api/AiApi';
import { fetchDashboardData } from '../api/dashboardApi'; // dashboardApi import 추가

// 재사용 컴포넌트들 (기존과 동일)
const AnimatedBar = ({ percentage, color = '#6366f1' }) => { /* ... 기존 코드 ... */ 
    const barRef = useRef(null);
    useEffect(() => {
        const timer = setTimeout(() => {
            if (barRef.current) barRef.current.style.width = `${percentage}%`;
        }, 100);
        return () => clearTimeout(timer);
    }, [percentage]);
    return (
        <div className="progress-bar-container">
            <div className="progress-bar" ref={barRef} style={{ backgroundColor: color }}></div>
        </div>
    );
};
const NoDataMessage = () => <div className="no-data-message">데이터가 없습니다.</div>;


const Ai = () => {
    // State 선언
    const [popularKeywords, setPopularKeywords] = useState([]);
    const [topWatchedVideos, setTopWatchedVideos] = useState([]); // '성과 요약'을 대체할 새로운 State
    const [sentimentRatio, setSentimentRatio] = useState(null);
    const [insightSummary, setInsightSummary] = useState('');
    const [strategyProposals, setStrategyProposals] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadAiData = async () => {
            setLoading(true);
            try {
                const userChannelId = localStorage.getItem('user_youtube_channel_id');
                if (!userChannelId) throw new Error('사용자 채널 ID를 찾을 수 없습니다. 다시 로그인 해주세요.');

                // Promise.all로 여러 API를 동시에 호출
                const [keywordsData, aiReportData, dashboardData] = await Promise.all([
                    fetchChannelKeywords(userChannelId, 5),
                    fetchAiStrategyReport(userChannelId),
                    fetchDashboardData() // 대시보드 데이터 전체를 가져옵니다.
                ]);

                // 각 State에 데이터 설정
                if (keywordsData) setPopularKeywords(keywordsData);
                if (aiReportData) {
                    setInsightSummary(aiReportData.insightSummary);
                    setStrategyProposals(aiReportData.strategyProposals);
                }
                // ✨✨✨ 핵심 수정: 대시보드 데이터에서 필요한 부분을 추출하여 State에 저장 ✨✨✨
                if (dashboardData?.contentPerformance?.topViewDurationVideos) {
                    setTopWatchedVideos(dashboardData.contentPerformance.topViewDurationVideos);
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

    // 로딩 및 에러 UI (기존과 동일)
    if (loading) return <div className="ai-container"><h2>AI 분석 데이터를 불러오는 중...</h2></div>;
    if (error) return <div className="ai-container"><h2>에러가 발생했습니다: {error.message}</h2></div>;

    // JSX 렌더링
    return (
        <div className="ai-container" id="ai-page">
            <header className="ai-header">
                <h1>AI 콘텐츠 전략 코치</h1>
                <input type="text" placeholder="전략 검색..." />
            </header>
            <main className="ai-main">
                <section className="ai-section">
                    <h2>콘텐츠 인사이트 요약</h2>
                    <div className="insight-grid">
                        <div className="insight-box">
                            <h3>인기 키워드</h3>
                            {popularKeywords.length > 0 ? (
                                <ul>{popularKeywords.map((k, i) => <li key={i}><strong>{k.text}</strong>: {k.value}회 등장</li>)}</ul>
                            ) : <NoDataMessage />}
                        </div>

                        <div className="insight-box">
                            <h3>감정 반응 비율</h3>
                            {sentimentRatio ? (
                                <ul>{/* ... 감정 비율 렌더링 ... */}</ul>
                            ) : <NoDataMessage />}
                            <p className="note">* 댓글 감정 분석 기반</p>
                        </div>

                        {/* ✨✨✨ 핵심 수정: '성과 요약' 박스를 '최고 시청 시간 영상'으로 교체 ✨✨✨ */}
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
                            ) : (
                                <NoDataMessage />
                            )}
                            <p className="note">* 평균 시청 시간 기준 TOP 5</p>
                        </div>
                    </div>
                    
                    <div className="summary-box">{insightSummary ? <p dangerouslySetInnerHTML={{ __html: insightSummary.replace(/\n/g, '<br />') }} /> : <NoDataMessage />}</div>
                </section>

                <section className="ai-section">
                    <h2>GPT 기반 전략 제안</h2>
                    <div className="strategy-grid">
                        <div className="strategy-box">
                            <h3>콘텐츠 기획 전략</h3>
                            {strategyProposals?.planning?.length > 0 ? (<ul>{strategyProposals.planning.map((item, i) => <li key={i}>{item}</li>)}</ul>) : <NoDataMessage />}
                        </div>
                        <div className="strategy-box">
                            <h3>업로드 최적 시간</h3>
                            {strategyProposals?.timing?.length > 0 ? (<ul>{strategyProposals.timing.map((item, i) => <li key={i}>{item}</li>)}</ul>) : <NoDataMessage />}
                        </div>
                        <div className="strategy-box">
                            <h3>감성 편집 전략</h3>
                            {strategyProposals?.editing?.length > 0 ? (<ul>{strategyProposals.editing.map((item, i) => <li key={i}>{item}</li>)}</ul>) : <NoDataMessage />}
                        </div>
                    </div>
                </section>
            </main>
        </div>
    );
};

export default Ai;