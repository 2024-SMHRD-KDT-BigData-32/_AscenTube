import React, { useEffect, useRef, useState } from 'react';
import '../styles/pages/Dashboard.css';
import { Doughnut, Radar } from 'react-chartjs-2'; // Radar 임포트 추가
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
  Filler,
  RadialLinearScale, // Radar 차트를 위한 Scale 임포트
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { fetchDashboardData } from '../api/dashboardApi';

// Chart.js 모듈 등록
ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler, ChartDataLabels, RadialLinearScale // RadialLinearScale 등록
);

// HorizontalStatBar 컴포넌트
const HorizontalStatBar = ({ category, percentage, barColor = '#4f46e5' }) => {
  const barRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (barRef.current) barRef.current.style.width = `${percentage}%`;
    }, 100);
    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="image-style-stat-bar">
      <div className="stat-info">
        <span className="stat-category">• {category}:</span>
        <span className="stat-value">{percentage}%</span>
      </div>
      <div className="stat-bar-container">
        <div className="stat-bar-track">
          <div className="stat-bar-fill" ref={barRef} style={{ backgroundColor: barColor, width: '0%' }}></div>
        </div>
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

  if (loading) return <p>📡 유튜브 채널 대시보드 데이터를 불러오는 중입니다...</p>;
  if (error) return <p className="error-message">🚨 데이터 로드 중 오류가 발생했습니다: {error}</p>;
  if (!dashboardData || !dashboardData.stats || !dashboardData.contentPerformance || !dashboardData.audience || !dashboardData.radarData) {
    return <p className="error-message">⚠️ 대시보드 데이터를 표시할 수 없습니다. 백엔드 API 상태를 확인해주세요.</p>;
  }

  const { stats, contentPerformance, audience, radarData } = dashboardData;

  const trafficSourceChartData = {
    labels: audience.trafficSources.labels,
    datasets: [{
      data: audience.trafficSources.data,
      backgroundColor: ['#5A67D8', '#4299E1', '#38B2AC', '#48BB78', '#F56565', '#ED8936', '#ECC94B', '#9F7AEA', '#ED64A6', '#A0AEC0'],
      borderColor: '#ffffff',
      borderWidth: 2,
    }],
  };

  const trafficDoughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: { padding: { top: 60, bottom: 60, left: 30, right: 30, } },
    events: ['mousemove', 'mouseout', 'click', 'touchstart', 'touchmove'],
    onHover: null, hover: { mode: null }, animation: { duration: 0 },
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true, backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: 12, titleFont: { size: 0 },
        bodyFont: { size: 15, weight: 'bold' }, bodySpacing: 5, displayColors: false,
        callbacks: {
          label: (tooltipItem) => `${tooltipItem.label || ''}  ${(tooltipItem.raw || 0).toFixed(2)}%`
        }
      },
      datalabels: {
        formatter: (value, context) => {
          if (value < 3) return null;
          const label = context.chart.data.labels[context.dataIndex];
          return `${label} ${value.toFixed(1)}%`;
        },
        anchor: 'end', offset: 35,
        align: (context) => {
          const T = Math.PI, p = context.chart.getDatasetMeta(0).data[context.dataIndex];
          if (!p) return 'center';
          const a = (p.startAngle + p.endAngle) / 2;
          return a > T * 0.5 && a < T * 1.5 ? "start" : "end";
        },
        textAlign: 'center',
        font: { size: 13, weight: '700', family: 'Pretendard' },
        color: '#1E293B', textStrokeColor: 'white', textStrokeWidth: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.7)',
        borderColor: (context) => context.dataset.backgroundColor,
        borderWidth: 2, borderRadius: 5, padding: 6,
      }
    },
  };

  const healthRadarData = {
    labels: radarData.labels,
    datasets: [
      {
        label: '채널 건강 점수',
        data: radarData.scores,
        backgroundColor: 'rgba(79, 70, 229, 0.2)',
        borderColor: '#4F46E5',
        borderWidth: 2,
        pointBackgroundColor: '#4F46E5',
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: '#4F46E5',
      },
    ],
  };

  const healthRadarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: {
          label: (context) => `${context.label}: ${context.raw}점`
        }
      }
    },
    scales: {
      r: {
        angleLines: { color: '#E2E8F0' },
        grid: { color: '#E2E8F0' },
        min: 0,
        max: 100,
        ticks: {
          stepSize: 25,
          backdropColor: 'rgba(255, 255, 255, 0.75)',
          color: '#64748B',
        },
        pointLabels: {
          font: { size: 14, weight: '600', family: 'Pretendard' },
          color: '#334155'
        },
      },
    },
  };

  const generateAnalysis = () => {
    const scores = radarData.scores.map(Number);
    const insights = [];
    const overallScore = scores.reduce((a, b) => a + b, 0) / scores.length;

    if (scores[0] < 50) insights.push(<>채널의 <strong>신규 구독자</strong> 확보 능력이 다소 아쉽습니다. 구독을 유도할 수 있는 콘텐츠 기획이 필요해 보입니다.</>);
    if (scores[1] < 50) insights.push(<>시청자를 영상에 오래 머물게 하는 <strong>콘텐츠 흡입력</strong>이 부족합니다. 영상 초반 30초의 구성과 편집을 점검해보세요.</>);
    if (scores[2] < 50) insights.push(<>조회수 대비 시청자들의 <strong>좋아요, 댓글 참여</strong>가 저조합니다. 영상 마지막에 질문을 던지거나 의견을 유도해보세요.</>);
    if (scores[3] < 60) insights.push(<><strong>트래픽이 한두 소스에 집중</strong>되어 있어 위험합니다. YouTube 검색이나 외부 유입 등 새로운 경로를 개척할 필요가 있습니다.</>);
    if (scores[4] < 60) insights.push(<>채널의 <strong>핵심 시청자 타겟</strong>이 명확하지 않습니다. 채널의 정체성을 강화하여 팬덤을 구축하는 전략을 추천합니다.</>);
    if (scores[5] < 50) insights.push(<>아직 채널의 <strong>절대적인 규모</strong>가 작습니다. 꾸준한 업로드를 통해 구독자 기반을 단단히 다지는 것이 중요합니다.</>);

    if (insights.length === 0) {
      insights.push(<>모든 지표가 안정적입니다! 현재 채널은 매우 <strong>균형 잡힌 성장</strong>을 하고 있습니다. 지금처럼 꾸준히 운영해주세요.</>);
    }

    return { overallScore, insights };
  };

  const analysis = generateAnalysis();

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>메인 대시보드</h1>
        <input type="text" placeholder="전략 검색..." />
      </header>

      <main className="dashboard-main">
        <section className="dashboard-section kpi-section">
          <h3 className="section-title">주요 지표</h3>
          <div className="card-grid kpi-grid">
            <div className="card subscriber-focus-card"><h3>총 구독자 수</h3><p>{stats.subscriberCount.toLocaleString()} 명</p></div>
            <div className="card"><h3>총 조회수</h3><p>{stats.viewCount.toLocaleString()} 회</p></div>
            <div className="card"><h3>평균 시청 지속 시간</h3><p>{stats.averageViewDuration}</p></div>
            <div className="card"><h3>총 영상 수</h3><p>{stats.totalVideos.toLocaleString()} 개</p></div>
            <div className="card"><h3>평균 업로드 주기</h3><p>{stats.averageUploadInterval}</p></div>
          </div>
        </section>

        <section className="dashboard-section content-performance-section">
          <h3 className="section-title">콘텐츠 성과 분석</h3>
          <div className="content-grid">
            <div className="content-box recent-videos">
              <h4>최근 업로드 영상 성과</h4>
              <table>
                <thead><tr><th>제목</th><th>조회수</th><th>평균시청</th><th>좋아요</th><th>댓글</th><th>신규구독</th></tr></thead>
                <tbody>
                  {contentPerformance.recentVideos.length > 0 ? (
                    contentPerformance.recentVideos.map(video => (
                      <tr key={video.id}>
                        <td>{video.title}</td><td>{video.views.toLocaleString()}</td><td>{video.avgDuration}</td>
                        <td>{video.likes.toLocaleString()}</td><td>{video.comments.toLocaleString()}</td><td>{video.newSubs}</td>
                      </tr>
                    ))
                  ) : (<tr><td colSpan="6">최근 업로드 영상 데이터가 없습니다.</td></tr>)}
                </tbody>
              </table>
            </div>
            <div className="side-by-side-content-wrapper">
              <div className="content-box top-subscriber-videos">
                <h4>구독자 증가 기여 Top 영상</h4>
                <ul>
                  {contentPerformance.topSubscriberVideos.length > 0 ? (
                    contentPerformance.topSubscriberVideos.map(video => (<li key={video.id}><strong>{video.title}</strong> (구독 {video.newSubs}명, 조회 {video.views.toLocaleString()}회)</li>))
                  ) : (<li>구독자 증가 기여 영상 데이터가 없습니다.</li>)}
                </ul>
              </div>
              <div className="content-box top-duration-videos">
                <h4>평균 시청 지속 시간 Top 영상</h4>
                <ul>
                  {contentPerformance.topViewDurationVideos.length > 0 ? (
                    contentPerformance.topViewDurationVideos.map(video => (<li key={video.id}><strong>{video.title}</strong> ({video.avgDuration}, 조회 {video.views.toLocaleString()}회)</li>))
                  ) : (<li>평균 시청 지속 시간 Top 영상 데이터가 없습니다.</li>)}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section audience-traffic-section">
          <h3 className="section-title">시청자 및 트래픽 분석</h3>
          <div className="stats-grid audience-analysis-grid">
            <div className="stat-box">
              <h4>성별 비율</h4>
              {audience.gender ? (<><HorizontalStatBar category="남성" percentage={audience.gender.male} barColor="#6366f1" /><HorizontalStatBar category="여성" percentage={audience.gender.female} barColor="#ec4899" /></>) : <p className="no-data-message">데이터 없음</p>}
            </div>
            <div className="stat-box">
              <h4>연령대 분포</h4>
              {audience.age && Object.keys(audience.age).length > 0 ? (Object.entries(audience.age).map(([range, percent]) => (<HorizontalStatBar key={range} category={`${range}세`} percentage={percent} barColor="#22d3ee" />))) : <p className="no-data-message">데이터 없음</p>}
            </div>
            <div className="stat-box">
              <h4>국가별 시청자</h4>
              {audience.country && Object.keys(audience.country).length > 0 ? (Object.entries(audience.country).map(([countryName, percent]) => (<HorizontalStatBar key={countryName} category={countryName} percentage={percent} barColor="#a855f7" />))) : <p className="no-data-message">데이터 없음</p>}
            </div>
            <div className="stat-box traffic-sources-chart">
              <h4>주요 트래픽 소스</h4>
              <div className="doughnut-chart-container">
                {audience.trafficSources && audience.trafficSources.labels.length > 0 ? (<Doughnut data={trafficSourceChartData} options={trafficDoughnutOptions} />) : (<p className="no-data-message">데이터 없음</p>)}
              </div>
            </div>
            <div className="stat-box comment-analysis-full-width">
              <h4>댓글 유형 분석 <span className="section-subtitle">*AI 기반 (UI Preview)</span></h4>
              <div className="comment-analysis-container">
                <div className="comment-chart-container">
                  <p className="no-data-message">댓글 분석 기능은 준비 중입니다.</p>
                </div>
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

        <section className="dashboard-section">
          <h3 className="section-title">채널 건강 진단</h3>
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
              <div className="analysis-insight-list">
                {analysis.insights.map((insight, index) => (
                  <p key={index} className="analysis-insight-item">{insight}</p>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;