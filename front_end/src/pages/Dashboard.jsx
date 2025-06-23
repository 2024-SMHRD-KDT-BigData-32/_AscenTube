import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import PageLayout from '../layouts/PageLayout';
import '../styles/pages/Dashboard.css';
import { Doughnut, Radar, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler, RadialLinearScale } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { fetchDashboardData } from '../api/dashboardApi';
import { fetchCommentAnalysisSummary } from '../api/CommentApi';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler, ChartDataLabels, RadialLinearScale);

const SPEECH_ACT_LABELS = {
    PRAISE: '칭찬', CRITICISM: '비판', INFO: '정보제공',
    QUESTION: '질문', EMOTION: '감정표현', REQUEST: '요청', ETC: '기타'
};

const SENTIMENT_LABELS = {
    POSITIVE: '긍정', NEUTRAL: '중립', NEGATIVE: '부정'
};

const NoDataMessage = () => <div className="no-data-message">데이터가 없습니다.</div>;

const AnalysisChart = ({ data, total, labelMap }) => {
    if (!data || data.length === 0) {
        return <NoDataMessage />;
    }

    const calculatedData = data.map(item => ({
        ...item,
        percentage: total > 0 ? (item.count / total) * 100 : 0
    }));

    return (
        <ul className="bar-chart-list">
            {calculatedData
                .sort((a, b) => b.percentage - a.percentage)
                .map(item => {
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

const HorizontalStatBar = ({ category, percentage, barColor = '#4f46e5' }) => {
    const barRef = useRef(null);
    useEffect(() => {
        const timer = setTimeout(() => {
            if (barRef.current) barRef.current.style.width = `${percentage}%`;
        }, 100);
        return () => clearTimeout(timer);
    }, [percentage]);

    return (
        <div className="horizontal-stat-bar">
            <div className="stat-info">
                <span className="stat-category">{category}</span>
                <span className="stat-value">{percentage}%</span>
            </div>
            <div className="stat-bar-track">
                <div className="stat-bar-fill" ref={barRef} style={{ backgroundColor: barColor, width: '0%' }}></div>
            </div>
        </div>
    );
};

const CountUpNumber = ({ target, duration = 2000 }) => {
    const [count, setCount] = useState(0);
    const startTimeRef = useRef(null);

    useEffect(() => {
        const animate = (currentTime) => {
            if (startTimeRef.current === null) startTimeRef.current = currentTime;
            const progress = (currentTime - startTimeRef.current) / duration;
            const currentCount = Math.min(progress * target, target);
            
            if (Number.isInteger(target)) {
                setCount(Math.floor(currentCount));
            } else {
                setCount(parseFloat(currentCount.toFixed(2)));
            }

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                setCount(target);
            }
        };

        const animationFrameId = requestAnimationFrame(animate);

        return () => {
            cancelAnimationFrame(animationFrameId);
            startTimeRef.current = null;
        };
    }, [target, duration]);

    if (typeof target === 'number' && Number.isInteger(target)) {
        return count.toLocaleString();
    }
    return count; 
};

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [commentAnalysisSummary, setCommentAnalysisSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                const userChannelId = localStorage.getItem('user_youtube_channel_id');
                if (!userChannelId) {
                    throw new Error('사용자 채널 ID를 찾을 수 없습니다. 다시 로그인 해주세요.');
                }

                const [dashboardRes, commentsSummaryRes] = await Promise.allSettled([
                    fetchDashboardData(), 
                    fetchCommentAnalysisSummary(userChannelId, 'quarter') 
                ]);

                if (dashboardRes.status === 'fulfilled') {
                    setDashboardData(dashboardRes.value);
                } else {
                    console.error("대시보드 데이터 로드 실패:", dashboardRes.reason);
                    setError(dashboardRes.reason?.message || "대시보드 데이터 로드 실패");
                }

                if (commentsSummaryRes.status === 'fulfilled') { 
                    const commentData = commentsSummaryRes.value; 
                    if (commentData) {
                        const standardize = (text) => text?.toUpperCase() || null;
                        const standardizedData = {
                            ...commentData,
                            speechActDistribution: commentData.speechActDistribution?.map(item => ({...item, type: standardize(item.type) })),
                            sentimentDistribution: commentData.sentimentDistribution?.map(item => ({...item, type: standardize(item.type) })),
                        };
                        setCommentAnalysisSummary(standardizedData);
                    }
                } else {
                    console.warn("댓글 분포 데이터 로드 실패 또는 데이터 없음:", commentsSummaryRes.reason);
                    setCommentAnalysisSummary(null);
                }

            } catch (err) {
                console.error("대시보드 초기 데이터 로드 중 컴포넌트 오류:", err);
                setError(err.message);
                setDashboardData(null);
                setCommentAnalysisSummary(null);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) {
        return <PageLayout title="메인 대시보드"><p className="loading-message">📡 채널 데이터를 불러오는 중입니다...</p></PageLayout>;
    }
    if (error) {
        return <PageLayout title="메인 대시보드"><p className="error-message">🚨 데이터 로드 중 오류가 발생했습니다: {error}</p></PageLayout>;
    }
    if (!dashboardData?.stats || !dashboardData?.contentPerformance || !dashboardData?.audience || !dashboardData?.radarData) {
        return <PageLayout title="메인 대시보드"><p className="no-data-message">⚠️ 대시보드 데이터를 표시할 수 없습니다.</p></PageLayout>;
    }

    const { stats, contentPerformance, audience, radarData, aiCommentAnalysis } = dashboardData; 
    const cleanTitle = (title) => title.replace(/#\w+/g, '').trim();
    
    const sortedTrafficSources = audience.trafficSources.labels.map((label, index) => ({label, data: audience.trafficSources.data[index]})).sort((a,b) => b.data - a.data);
    const trafficSourceLabels = sortedTrafficSources.map(item => item.label);
    const trafficSourceData = sortedTrafficSources.map(item => item.data);
    const trafficSourceBarChartData = {
        labels: trafficSourceLabels,
        datasets: [{
            label: '비율',
            data: trafficSourceData,
            backgroundColor: ['rgba(90, 103, 216, 0.8)','rgba(66, 153, 225, 0.8)','rgba(56, 178, 172, 0.8)','rgba(72, 187, 120, 0.8)','rgba(245, 101, 101, 0.8)','rgba(237, 137, 50, 0.8)','rgba(236, 201, 75, 0.8)','rgba(159, 122, 234, 0.8)','rgba(237, 100, 166, 0.8)','rgba(160, 174, 192, 0.8)'],
            borderColor: ['rgba(90, 103, 216, 1)','rgba(66, 153, 225, 1)','rgba(56, 178, 172, 1)','rgba(72, 187, 120, 1)','rgba(245, 101, 101, 1)','rgba(237, 137, 50, 1)','rgba(236, 201, 75, 1)','rgba(159, 122, 234, 1)','rgba(237, 100, 166, 1)','rgba(160, 174, 192, 1)'],
            borderWidth: 1,
        }],
    };
    const trafficSourceBarChartOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => `${c.label}: ${c.raw.toFixed(1)}%` } }, datalabels: { color: '#fff', font: { weight: 'bold' }, formatter: (value) => value > 5 ? `${value.toFixed(1)}%` : '' } },
        scales: { x: { grid: { display: false }, ticks: { color: '#4A5568' } }, y: { beginAtZero: true, max: 100, grid: { color: '#e2e8f0' }, ticks: { callback: (v) => v + '%', color: '#4A5568' } } }
    };
    
    const radarExplanation = { '성장성': '신규 구독자 유입 속도', '콘텐츠 파워': '시청자의 영상 몰입도', '시청자 반응': '조회수 대비 상호작용', '트래픽 다양성': '다양한 시청자 유입 경로', '타겟 집중도': '주요 시청자층의 명확성', '채널 규모': '채널의 전반적인 외형 규모' };
    const healthRadarData = {
        labels: radarData.labels,
        datasets: [{ label: '채널 건강 점수', data: radarData.scores, backgroundColor: 'rgba(79, 70, 229, 0.2)', borderColor: '#4F46E5', borderWidth: 2, pointBackgroundColor: '#4F46E5', pointBorderColor: '#fff', pointHoverBackgroundColor: '#fff', pointHoverBorderColor: '#4F46E5' }],
    };
    const healthRadarOptions = {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => [`${c.label}: ${c.raw}점`, '', radarExplanation[c.label] || ''] } } },
        scales: { r: { angleLines: { color: '#E2E8F0' }, grid: { color: '#E2E8F0' }, min: 0, max: 100, ticks: { stepSize: 25, backdropColor: 'rgba(255, 255, 255, 0.75)' }, pointLabels: { font: { size: 14, weight: '600' }, color: '#334155' } } },
    };

    const generateAnalysis = () => {
        const validScores = radarData.scores
            .map(Number)
            .filter(score => Number.isFinite(score));

        const overallScore = validScores.length > 0 
            ? validScores.reduce((a, b) => a + b, 0) / validScores.length 
            : 0;
            
        return { 
            overallScore, 
            insights: ["<strong>구독자 성장</strong>이 매우 활발합니다!", "<strong>트래픽이 한두 소스에 집중</strong>되어 있어 위험합니다."], 
            overallExplanation: "채널 건강 상태가 양호합니다. 몇 가지 개선이 필요한 영역이 있지만, 전반적으로 긍정적인 성장세를 유지하고 있습니다." 
        };
    };
    const analysis = generateAnalysis();

    return (
        <PageLayout title="메인 대시보드">
            {/* ✨✨✨ 순서 1: 주요 지표 섹션 ✨✨✨ */}
            <section className="page-section">
                <h2>주요 지표</h2>
                <div className="kpi-grid">
                    <div className="kpi-card"><h3>총 구독자 수</h3><p><CountUpNumber target={stats.subscriberCount} /></p></div>
                    <div className="kpi-card"><h3>총 조회수</h3><p><CountUpNumber target={stats.viewCount} /></p></div>
                    <div className="kpi-card"><h3>평균 시청 시간</h3><p>{stats.averageViewDuration}</p></div>
                    <div className="kpi-card"><h3>총 영상 수</h3><p><CountUpNumber target={stats.totalVideos} /></p></div>
                    <div className="kpi-card"><h3>평균 업로드 주기</h3><p>{stats.averageUploadInterval}</p></div>
                </div>
            </section>
            
            {/* ✨✨✨ 순서 2: 채널 건강 진단 섹션 ✨✨✨ */}
            <section className="page-section">
                <h2>채널 건강 진단</h2>
                <div className="channel-health-container">
                    <div className="radar-chart-panel"><Radar data={healthRadarData} options={healthRadarOptions} /></div>
                    <div className="radar-analysis-panel">
                        <h4 className="analysis-title">종합 분석 및 제안</h4>
                        <p className="analysis-subtitle">채널의 강점과 약점을 바탕으로 다음 성장 전략을 세워보세요.</p>
                        <div className="analysis-overall-score">
                            <span className="score-value">{analysis.overallScore.toFixed(0)}</span>
                            <span className="score-label">/ 100점</span>
                        </div>
                        <p className="overall-score-explanation">{analysis.overallExplanation}</p>
                        <div className="analysis-insight-list">
                            {analysis.insights.map((insight, index) => <p key={index} className="analysis-insight-item" dangerouslySetInnerHTML={{ __html: insight }} />)}
                        </div>
                    </div>
                </div>
            </section>

            {/* ✨✨✨ 순서 3: 시청자 및 트래픽 분석 섹션 ✨✨✨ */}
            <section className="page-section">
                <h2>시청자 및 트래픽 분석</h2>
                <div className="audience-analysis-grid">
                    <div className="stat-box">
                        <h4>성별/연령대</h4>
                        {audience.gender ? (<><HorizontalStatBar category="남성" percentage={audience.gender.male} barColor="#6366f1" /><HorizontalStatBar category="여성" percentage={audience.gender.female} barColor="#ec4899" /></>) : <p className="no-data-message">성별 데이터 없음</p>}
                        <hr style={{margin: '1.5rem 0', border: 'none', borderTop: '1px solid #f3f4f6'}} />
                        {audience.age && Object.keys(audience.age).length > 0 ? (Object.entries(audience.age).map(([range, percent]) => (<HorizontalStatBar key={range} category={`${range}세`} percentage={percent} barColor="#22d3ee" />))) : <p className="no-data-message">연령 데이터 없음</p>}
                    </div>
                    <div className="stat-box">
                        <h4>국가별 시청자</h4>
                        {audience.country && Object.keys(audience.country).length > 0 ? (
                            Object.entries(audience.country).filter(([, percent]) => percent > 0).map(([countryName, percent]) => (<HorizontalStatBar key={countryName} category={countryName} percentage={percent} barColor="#a855f7" />))
                        ) : (<p className="no-data-message">데이터 없음</p>)}
                    </div>
                    <div className="stat-box traffic-sources-bar-chart-container">
                        <h4>주요 트래픽 소스</h4>
                        <div className="bar-chart-full-width">
                            {audience.trafficSources?.labels.length > 0 ? (<Bar data={trafficSourceBarChartData} options={trafficSourceBarChartOptions} />) : (<NoDataMessage />)}
                        </div>
                    </div>
                </div>
            </section>

            {/* ✨✨✨ 순서 4: 콘텐츠 성과 분석 섹션 ✨✨✨ */}
            <section className="page-section">
                <h2>콘텐츠 성과 분석</h2>
                <div className="content-grid">
                    <div className="content-box recent-videos">
                        <h4>최근 업로드 영상 성과</h4>
                        <table>
                            <thead><tr><th>제목</th><th>조회수</th><th>평균시청</th><th>좋아요</th><th>신규구독</th></tr></thead>
                            <tbody>
                                {contentPerformance.recentVideos.length > 0 ? (
                                    contentPerformance.recentVideos.map(video => (
                                        <tr key={video.id}>
                                            <td><Link to={`/video/${video.id}`} title={video.title}>{cleanTitle(video.title)}</Link></td>
                                            <td>{video.views.toLocaleString()}</td>
                                            <td>{video.avgDuration}</td>
                                            <td>{video.likes.toLocaleString()}</td>
                                            <td>{video.newSubs}</td>
                                        </tr>
                                    ))
                                ) : (<tr><td colSpan="5" className="no-data-message">최근 영상 데이터가 없습니다.</td></tr>)}
                            </tbody>
                        </table>
                    </div>
                    <div className="side-by-side-content-wrapper">
                        <div className="content-box top-subscriber-videos">
                            <h4>구독자 증가 기여 Top 3</h4>
                            <ul>
                                {contentPerformance.topSubscriberVideos.length > 0 ? (
                                    contentPerformance.topSubscriberVideos.map(video => <li key={video.id}><Link to={`/video/${video.id}`} title={video.title}><strong>{cleanTitle(video.title)}</strong></Link> (구독 {video.newSubs}명)</li>)
                                ) : (<li className="no-data-message">데이터 없음</li>)}
                            </ul>
                        </div>
                        <div className="content-box top-duration-videos">
                            <h4>평균 시청 시간 Top 3</h4>
                            <ul>
                                {contentPerformance.topViewDurationVideos.length > 0 ? (
                                    contentPerformance.topViewDurationVideos.map(video => <li key={video.id}><Link to={`/video/${video.id}`} title={video.title}><strong>{cleanTitle(video.title)}</strong></Link> ({video.avgDuration})</li>)
                                ) : (<li className="no-data-message">데이터 없음</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* ✨✨✨ 순서 5: 댓글 유형 분석 섹션 ✨✨✨ */}
            <section className="page-section comment-analysis-section">
                <h2>댓글 유형 분석 <span className="section-subtitle">*AI 기반 (분기별)</span></h2>
                <div className="comment-content-wrapper"> 
                    <div className="comment-charts-column"> 
                        <div className="comment-chart-box speech-act-chart"> 
                            <h5>화행 분석</h5>
                            {commentAnalysisSummary?.speechActDistribution && commentAnalysisSummary.totalComments > 0 ? (
                                <AnalysisChart data={commentAnalysisSummary.speechActDistribution} total={commentAnalysisSummary.totalComments} labelMap={SPEECH_ACT_LABELS} />
                            ) : (<NoDataMessage />)}
                        </div>
                        <div className="comment-chart-box sentiment-chart"> 
                            <h5>긍부정 분석</h5>
                            {commentAnalysisSummary?.sentimentDistribution && commentAnalysisSummary.totalComments > 0 ? (
                                <AnalysisChart data={commentAnalysisSummary.sentimentDistribution} total={commentAnalysisSummary.totalComments} labelMap={SENTIMENT_LABELS} />
                            ) : (<NoDataMessage />)}
                        </div>
                    </div>
                    <div className="comment-details-column"> 
                        <div className="representative-comments-list">
                            {aiCommentAnalysis?.aiRepresentativeComments && aiCommentAnalysis.aiRepresentativeComments.length > 0 ? (
                                aiCommentAnalysis.aiRepresentativeComments.slice(0, 4).map((comment, index) => (
                                    <div key={index} className="representative-comment-card"> 
                                        <p className="comment-text">"{comment.commentContent}"</p> 
                                        <div className="comment-labels">
                                            {comment.sentimentType && <span className={`comment-label sentiment-${comment.sentimentType.toLowerCase()}`}>{SENTIMENT_LABELS[comment.sentimentType]}</span>}
                                            {comment.speechAct && <span className={`comment-label type-${comment.speechAct.toLowerCase()}`}>{SPEECH_ACT_LABELS[comment.speechAct]}</span>}
                                        </div>
                                    </div>
                                ))
                            ) : (<NoDataMessage />)}
                        </div>
                        <h5 className="details-title" style={{ marginTop: '1.5rem' }}>AI 종합 피드백</h5>
                        <div className="ai-overall-feedback-box"> 
                            {aiCommentAnalysis?.aiOverallFeedback ? (
                                <p dangerouslySetInnerHTML={{ __html: aiCommentAnalysis.aiOverallFeedback.replace(/\n/g, '<br />') }} />
                            ) : (<NoDataMessage />)}
                        </div>
                    </div>
                </div>
            </section>
        </PageLayout>
    );
};

export default Dashboard;