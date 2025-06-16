import React, { useEffect, useRef, useState } from 'react';
import '../styles/pages/Dashboard.css';
import { Line, Doughnut } from 'react-chartjs-2';
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
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Tooltip, Legend, Filler,
  ChartDataLabels
);

const HorizontalStatBar = ({ category, percentage, barColor = '#4f46e5' }) => {
  const barRef = useRef(null);
  useEffect(() => {
    const timer = setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.width = `${percentage}%`;
      }
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
          <div
            className="stat-bar-fill"
            ref={barRef}
            style={{ backgroundColor: barColor, width: '0%' }}
          ></div>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [audience, setAudience] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [stats, setStats] = useState(null);
  const [contentPerformance, setContentPerformance] = useState(null);
  const [kpi, setKpi] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDummyData = () => {
      setTimeout(() => {
        setKpi({ newSubscribersToday: 12, lostSubscribersToday: 3, impressions: 150000, ctr: 5.5 });
        setAudience({
          gender: { male: 60, female: 40 },
          age: { '13-17': 10, '18-24': 25, '25-34': 30, '35-44': 20, '45+': 15 },
          country: { '대한민국': 75, '미국': 10, '일본': 5, '기타': 10 },
          time: { '오전(10-12)': 15, '저녁(18-20)': 40, '밤(20-22)': 30, '기타 시간': 15 },
          trafficSources: { labels: ['YouTube 검색', '추천 동영상', '외부 채널', '탐색 기능', '기타'], data: [45, 25, 15, 10, 5] },
          commentSentiment: { '칭찬': 30, '정보제공': 25, '질문': 18, '감정표현': 12, '요청': 8, '비판': 4, '기타': 3, },
        });
        setStats({ viewCount: "2345678", subscriberCount: "12345", averageViewDuration: "3:45" });
        setGrowth({
            labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
            views: [15000, 17000, 16000, 19000, 22000, 21000],
            subscribers: [100, 120, 150, 180, 220, 250],
            avgViewsPerVideo: [3500, 3800, 3700, 4200, 4500, 4300],
            engagementRate: [5.2, 5.5, 5.3, 5.8, 6.1, 5.9],
        });
        setContentPerformance({
          recentVideos: [{ id: 1, title: "최신 기술 트렌드 분석!", views: 12000, avgDuration: "5:12", likes: 560, comments: 78, newSubs: 15 }, { id: 2, title: "스프링부트 시큐리티 완벽 가이드", views: 25000, avgDuration: "12:30", likes: 1200, comments: 150, newSubs: 45 }, { id: 3, title: "리액트 상태관리 이것만 알면 끝", views: 8500, avgDuration: "8:45", likes: 320, comments: 55, newSubs: 22 },],
          topSubscriberVideos: [{ id: 2, title: "스프링부트 시큐리티 완벽 가이드", newSubs: 45, views: 25000 }, { id: 5, title: "코딩 초보 탈출 프로젝트 (1탄)", newSubs: 38, views: 18000 }, { id: 3, title: "리액트 상태관리 이것만 알면 끝", newSubs: 22, views: 8500 },],
          topViewDurationVideos: [{ id: 4, title: "클라우드 아키텍처 심층 인터뷰", avgDuration: "15:20 (70%)", views: 9200 }, { id: 2, title: "스프링부트 시큐리티 완벽 가이드", avgDuration: "12:30 (65%)", views: 25000 }, { id: 6, title: "데이터 분석가의 하루 (VLOG)", avgDuration: "10:05 (60%)", views: 11000 },]
        });
        setLoading(false);
      }, 800);
    };
    loadDummyData();
  }, []);

  if (loading || !audience || !growth || !stats || !contentPerformance || !kpi) {
    return <p>📡 유튜브 채널 대시보드 데이터를 불러오는 중입니다...</p>;
  }

  const growthChartData = {
    labels: growth.labels,
    datasets: [
      { label: '조회수', data: growth.views, borderColor: '#4f46e5', backgroundColor: 'rgba(79, 70, 229, 0.2)', tension: 0.3, fill: true, },
      { label: '구독자 증감', data: growth.subscribers, borderColor: '#10b981', backgroundColor: 'rgba(16, 185, 129, 0.2)', tension: 0.3, fill: true, },
    ],
  };
  const growthChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top', labels: { color: '#3730a3' } },
      tooltip: { mode: 'index', intersect: false }
    },
    scales: {
      x: { ticks: { color: '#6b7280' }, grid: { display: false } },
      y: { type: 'linear', display: true, position: 'left', ticks: { color: '#6b7280' }, beginAtZero: true, grid: { color: '#e5e7eb' } }
    },
  };

  const trafficSourceChartData = {
    labels: audience.trafficSources.labels,
    datasets: [{
      label: '트래픽 소스',
      data: audience.trafficSources.data,
      backgroundColor: ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe', '#e0e7ff'],
      borderColor: 'white',
      borderWidth: 2,
    }],
  };

  const sentimentChartData = {
    labels: Object.keys(audience.commentSentiment),
    datasets: [{
      label: '댓글 유형 분석',
      data: Object.values(audience.commentSentiment),
      backgroundColor: ['#22c55e', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#ef4444', '#6b7280'],
      borderColor: 'white',
      borderWidth: 2,
    }],
  };

  const doughnutChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      datalabels: {
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        borderRadius: 4,
        color: 'white',
        font: {
          weight: 'bold',
          size: 11,
        },
        padding: {
          top: 4,
          bottom: 2,
          left: 6,
          right: 6,
        },
        formatter: (value, context) => {
          const label = context.chart.data.labels[context.dataIndex];
          if (value < 5) return '';
          return `${label} ${value}%`;
        },
      }
    },
  };

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
            {/* ▼▼▼ [핵심 수정] 화살표와 증감 숫자를 제거하고 다른 카드처럼 단순화 ▼▼▼ */}
            <div className="card subscriber-focus-card">
              <h3>총 구독자 수</h3>
              <p>{Number(stats.subscriberCount).toLocaleString()} 명</p>
            </div>
            <div className="card"><h3>총 조회수</h3><p>{Number(stats.viewCount).toLocaleString()}</p></div>
            <div className="card"><h3>평균 시청 지속 시간</h3><p>{stats.averageViewDuration}</p></div>
            <div className="card"><h3>총 노출수</h3><p>{kpi.impressions.toLocaleString()}</p></div>
            <div className="card"><h3>클릭률 (CTR)</h3><p>{kpi.ctr}%</p></div>
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
                  {contentPerformance.recentVideos.map(video => (
                    <tr key={video.id}><td>{video.title}</td><td>{video.views.toLocaleString()}</td><td>{video.avgDuration}</td><td>{video.likes}</td><td>{video.comments}</td><td>{video.newSubs}</td></tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="side-by-side-content-wrapper">
              <div className="content-box top-subscriber-videos">
                <h4>구독자 증가 기여 Top 영상</h4>
                <ul>{contentPerformance.topSubscriberVideos.map(video => (<li key={video.id}><strong>{video.title}</strong> (구독 {video.newSubs}명, 조회 {video.views.toLocaleString()}회)</li>))}</ul>
              </div>
              <div className="content-box top-duration-videos">
                <h4>평균 시청 지속 시간 Top 영상</h4>
                <ul>{contentPerformance.topViewDurationVideos.map(video => (<li key={video.id}><strong>{video.title}</strong> ({video.avgDuration}, 조회 {video.views.toLocaleString()}회)</li>))}</ul>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-section audience-traffic-section">
          <h3 className="section-title">시청자 및 트래픽 분석</h3>
          <div className="stats-grid audience-analysis-grid">
            <div className="stat-box">
              <h4>성별 비율</h4>
              {audience.gender ? (<> <HorizontalStatBar category="남성" percentage={audience.gender.male} barColor="#6366f1" /> <HorizontalStatBar category="여성" percentage={audience.gender.female} barColor="#ec4899" /> </>) : (<p className="no-data-message">데이터 없음</p>)}
            </div>
            <div className="stat-box">
              <h4>연령대 분포</h4>
              {audience.age && Object.keys(audience.age).length > 0 ? (Object.entries(audience.age).map(([range, percent]) => (<HorizontalStatBar key={range} category={`${range}세`} percentage={percent} barColor="#22d3ee" />))) : (<p className="no-data-message">데이터 없음</p>)}
            </div>
            <div className="stat-box">
              <h4>국가별 시청자</h4>
              {audience.country ? (Object.entries(audience.country).map(([countryName, percent]) => (<HorizontalStatBar key={countryName} category={countryName} percentage={percent} barColor="#a855f7" />))) : (<p className="no-data-message">데이터 없음</p>)}
            </div>
            <div className="stat-box">
              <h4>주요 시청 시간대</h4>
              {audience.time ? (Object.entries(audience.time).map(([timeRange, percent]) => (<HorizontalStatBar key={timeRange} category={timeRange} percentage={percent} barColor="#f59e0b" />))) : (<p className="no-data-message">데이터 없음</p>)}
            </div>
            <div className="stat-box traffic-sources-chart">
              <h4>주요 트래픽 소스</h4>
              <div style={{ height: '12rem', position: 'relative', marginTop: '1rem' }}>
                <Doughnut data={trafficSourceChartData} options={doughnutChartOptions} />
              </div>
            </div>
            <div className="stat-box comment-sentiment-box">
              <h4>댓글 유형 분석 <span className="section-subtitle">*AI 기반</span></h4>
              {audience.commentSentiment ? (
                <div style={{ height: '12rem', position: 'relative', marginTop: '1rem' }}>
                  <Doughnut data={sentimentChartData} options={doughnutChartOptions} />
                </div>
              ) : (<p className="no-data-message">감정 분석 데이터 없음</p>)}
            </div>
          </div>
        </section>

        <section className="dashboard-section growth-monitoring-section">
          <h3 className="section-title">채널 성장 추이 (월별)</h3>
          <div style={{ width: '100%', height: '20rem', position: 'relative' }}>
            <Line data={growthChartData} options={growthChartOptions} />
          </div>
          <div className="stats-grid additional-growth-metrics" style={{ marginTop: '1.5rem' }}>
            <div className="stat-box">
              <h4>월별 평균 조회수/영상 (최근)</h4>
              <p className="highlight-stat-value">{growth.avgViewsPerVideo[growth.avgViewsPerVideo.length - 1].toLocaleString()}</p>
            </div>
            <div className="stat-box">
              <h4>월별 상호작용률 (최근)</h4>
              <p className="highlight-stat-value">{growth.engagementRate[growth.engagementRate.length - 1]}%</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;