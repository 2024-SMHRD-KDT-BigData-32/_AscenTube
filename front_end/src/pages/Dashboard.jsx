// src/pages/Dashboard.jsx

import React, { useEffect, useRef, useState } from 'react';
import PageLayout from '../layouts/PageLayout'; // 공통 레이아웃 import
import '../styles/pages/Dashboard.css'; // 대시보드 전용 CSS import
import { Doughnut, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler, RadialLinearScale } from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { fetchDashboardData } from '../api/dashboardApi';

// Chart.js 모듈과 플러그인 등록
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler, ChartDataLabels, RadialLinearScale);

// 가로 막대 그래프 컴포넌트
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

const Dashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                setError(null);
                const data = await fetchDashboardData();
                setDashboardData(data);
            } catch (err) {
                console.error("대시보드 데이터 로드 중 컴포넌트 오류:", err);
                setError(err.message);
                setDashboardData(null);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // 로딩 및 에러 상태는 PageLayout 안에서 처리
    if (loading) {
        return <PageLayout title="메인 대시보드"><p className="loading-message">📡 채널 데이터를 불러오는 중입니다...</p></PageLayout>;
    }
    if (error) {
        return <PageLayout title="메인 대시보드"><p className="error-message">🚨 데이터 로드 중 오류가 발생했습니다: {error}</p></PageLayout>;
    }
    if (!dashboardData?.stats || !dashboardData?.contentPerformance || !dashboardData?.audience || !dashboardData?.radarData) {
        return <PageLayout title="메인 대시보드"><p className="no-data-message">⚠️ 대시보드 데이터를 표시할 수 없습니다.</p></PageLayout>;
    }

    const { stats, contentPerformance, audience, radarData } = dashboardData;
    const cleanTitle = (title) => title.replace(/#\w+/g, '').trim();
    
    // 차트 데이터 및 옵션 설정
    const trafficSourceChartData = {
        labels: audience.trafficSources.labels,
        datasets: [{
            data: audience.trafficSources.data,
            backgroundColor: ['#5A67D8', '#4299E1', '#38B2AC', '#48BB78', '#F56565', '#ED8936', '#ECC94B', '#9F7AEA', '#ED64A6', '#A0AEC0'],
            borderColor: '#ffffff',
            borderWidth: 3,
        }],
    };
    const trafficDoughnutOptions = {
        responsive: true, maintainAspectRatio: false, cutout: '60%',
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true, backgroundColor: 'rgba(0,0,0,0.8)', padding: 10, bodyFont: { size: 14 }, callbacks: { label: (item) => `${item.label}: ${item.raw.toFixed(1)}%` } },
            datalabels: {
                formatter: (value, context) => value > 5 ? `${context.chart.data.labels[context.dataIndex]}\n${value.toFixed(1)}%` : '',
                font: { weight: '600', size: 12 }, color: '#fff', textShadow: '0px 0px 3px rgba(0,0,0,0.5)',
            }
        },
    };
    const radarExplanation = {
        '성장성': '신규 구독자 유입 속도 및 채널 확장성을 나타냅니다.', '콘텐츠 파워': '시청자가 영상에 얼마나 오래 머무는지로 콘텐츠의 매력을 평가합니다.', '시청자 반응': '조회수 대비 좋아요, 댓글 등 시청자의 적극적인 상호작용 지표입니다.',
        '트래픽 다양성': '다양한 경로를 통한 시청자 유입 정도를 평가합니다.', '타겟 집중도': '채널의 주요 시청자층이 얼마나 명확하고 집중되어 있는지를 나타냅니다.', '채널 규모': '총 영상 수, 총 조회수 등 채널의 전반적인 외형적 규모를 나타냅니다.'
    };
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
        // 이 부분은 실제 API 응답 또는 dashboardApi.js 내의 계산 로직을 사용해야 합니다.
        // 현재는 UI 표시를 위해 임시 데이터를 반환합니다.
        const scores = radarData.scores.map(Number);
        const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;
        // 실제 인사이트 생성 로직 필요
        return { overallScore, insights: ["<strong>구독자 성장</strong>이 매우 활발합니다!", "<strong>트래픽이 한두 소스에 집중</strong>되어 있어 위험합니다."], overallExplanation: "채널 건강 상태가 양호합니다. 몇 가지 개선이 필요한 영역이 있지만, 전반적으로 긍정적인 성장세를 유지하고 있습니다." };
    };
    const analysis = generateAnalysis();

    return (
        <PageLayout title="메인 대시보드">
            {/* 원래 순서 1: 주요 지표 섹션 */}
            <section className="page-section">
                <h2>주요 지표</h2>
                <div className="kpi-grid">
                    <div className="kpi-card"><h3>총 구독자 수</h3><p>{stats.subscriberCount.toLocaleString()}</p></div>
                    <div className="kpi-card"><h3>총 조회수</h3><p>{stats.viewCount.toLocaleString()}</p></div>
                    <div className="kpi-card"><h3>평균 시청 시간</h3><p>{stats.averageViewDuration}</p></div>
                    <div className="kpi-card"><h3>총 영상 수</h3><p>{stats.totalVideos}</p></div>
                    <div className="kpi-card"><h3>평균 업로드 주기</h3><p>{stats.averageUploadInterval}</p></div>
                </div>
            </section>
            
            {/* 원래 순서 2: 콘텐츠 성과 분석 섹션 */}
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
                                            <td><a href={`/video/${video.id}`} title={video.title}>{cleanTitle(video.title)}</a></td>
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
                                    contentPerformance.topSubscriberVideos.map(video => <li key={video.id}><a href={`/video/${video.id}`} title={video.title}><strong>{cleanTitle(video.title)}</strong></a> (구독 {video.newSubs}명)</li>)
                                ) : (<li className="no-data-message">데이터 없음</li>)}
                            </ul>
                        </div>
                        <div className="content-box top-duration-videos">
                            <h4>평균 시청 시간 Top 3</h4>
                            <ul>
                                {contentPerformance.topViewDurationVideos.length > 0 ? (
                                    contentPerformance.topViewDurationVideos.map(video => <li key={video.id}><a href={`/video/${video.id}`} title={video.title}><strong>{cleanTitle(video.title)}</strong></a> ({video.avgDuration})</li>)
                                ) : (<li className="no-data-message">데이터 없음</li>)}
                            </ul>
                        </div>
                    </div>
                </div>
            </section>

            {/* 원래 순서 3: 시청자 및 트래픽 분석 섹션 */}
            <section className="page-section">
                <h2>시청자 및 트래픽 분석</h2>
                <div className="audience-analysis-grid">
                    <div className="stat-box">
                        <h4>성별/연령대</h4>
                        {audience.gender ? (<><HorizontalStatBar category="남성" percentage={audience.gender.male} barColor="#6366f1" /><HorizontalStatBar category="여성" percentage={audience.gender.female} barColor="#ec4899" /></>) : <p className="no-data-message">성별 데이터 없음</p>}
                        <hr style={{margin: '1.5rem 0', border: 'none', borderTop: '1px solid #f3f4f6'}} />
                        {audience.age && Object.keys(audience.age).length > 0 ? (Object.entries(audience.age).map(([range, percent]) => (<HorizontalStatBar key={range} category={`${range}세`} percentage={percent} barColor="#22d3ee" />))) : <p className="no-data-message">연령 데이터 없음</p>}
                    </div>
                    {/* --- '국가별 시청자' 섹션 복원 --- */}
                    <div className="stat-box">
                        <h4>국가별 시청자</h4>
                        {audience.country && Object.keys(audience.country).length > 0 ? (Object.entries(audience.country).map(([countryName, percent]) => (<HorizontalStatBar key={countryName} category={countryName} percentage={percent} barColor="#a855f7" />))) : <p className="no-data-message">데이터 없음</p>}
                    </div>
                    <div className="stat-box traffic-sources-chart">
                        <h4>주요 트래픽 소스</h4>
                        <div className="doughnut-chart-container">
                            {audience.trafficSources?.labels.length > 0 ? (<Doughnut data={trafficSourceChartData} options={trafficDoughnutOptions} />) : (<p className="no-data-message">트래픽 데이터 없음</p>)}
                        </div>
                    </div>
                    {/* --- '댓글 유형 분석' 섹션 복원 --- */}
                    <div className="stat-box comment-analysis-full-width">
                        <h4>댓글 유형 분석 <span className="section-subtitle">*AI 기반 (UI Preview)</span></h4>
                        <div className="comment-analysis-container">
                            <div className="comment-chart-container"><p className="no-data-message">댓글 분석 기능은 준비 중입니다.</p></div>
                            <div className="comment-details-container">
                                <h5>대표 댓글 분석</h5>
                                <div className="representative-comment"><p>"와, 이번 영상 퀄리티 정말 좋네요! 다음 편도 기대하겠습니다."</p><span>긍정적 피드백</span></div>
                                <div className="representative-comment"><p>"혹시 영상에서 사용하신 BGM 정보 알 수 있을까요?"</p><span>정보 문의</span></div>
                                <div className="representative-comment"><p>"편집 방식이 살짝 아쉬워요. 조금 더 속도감 있으면 좋을 것 같아요."</p><span>개선 제안</span></div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* 원래 순서 4: 채널 건강 진단 섹션 */}
            <section className="page-section">
                <h2>채널 건강 진단</h2>
                <div className="channel-health-container">
                    <div className="radar-chart-panel">
                        <Radar data={healthRadarData} options={healthRadarOptions} />
                    </div>
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
        </PageLayout>
    );
};

export default Dashboard;
