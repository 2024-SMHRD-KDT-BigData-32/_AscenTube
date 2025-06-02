import React, { useEffect, useState } from 'react';
import '../styles/pages/Dashboard.css';
import { Line, Pie } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
  ArcElement,
  ChartDataLabels
);

const Dashboard = () => {
  const [audience, setAudience] = useState(null);
  const [growth, setGrowth] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setTimeout(() => {
      setAudience({
        gender: { male: 60, female: 40 },
        age: { '10대': 10, '20대': 25, '30대': 30, '40대': 20, '50~': 15 },
        country: { KR: 80, US: 10, JP: 5, ETC: 5 },
        time: {
          '0': 2, '1': 1, '2': 1, '3': 1, '4': 1,
          '5': 2, '6': 3, '7': 4, '8': 5, '9': 6,
          '10': 10, '11': 12, '12': 13, '13': 12,
          '14': 10, '15': 8, '16': 7, '17': 10,
          '18': 15, '19': 14, '20': 10, '21': 6,
          '22': 3, '23': 2
        },
      });
      setStats({
        viewCount: "2345678",
        subscriberCount: "12345",
      });
      setGrowth({
        labels: ['1월', '2월', '3월', '4월', '5월', '6월'],
        views: [15000, 17000, 16000, 19000, 22000, 21000],
        subscribers: [100, 120, 150, 180, 220, 250],
      });
      setLoading(false);
    }, 800);
  }, []);

  if (loading || !audience || !growth || !stats) {
    return <p>📡 데이터를 불러오는 중입니다...</p>;
  }

  const growthChartData = {
    labels: growth.labels,
    datasets: [
      {
        label: '조회수',
        data: growth.views,
        borderColor: '#4f46e5',
        backgroundColor: 'rgba(99, 102, 241, 0.2)',
        tension: 0.3,
        fill: true,
      },
      {
        label: '구독자 수',
        data: growth.subscribers,
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const timeChartData = {
    labels: [...Array(24).keys()].map(String),
    datasets: [
      {
        label: '시청 비율 (%)',
        data: [...Array(24).keys()].map(h => audience.time[h] || 0),
        borderColor: '#f59e0b',
        backgroundColor: 'rgba(251, 191, 36, 0.2)',
        tension: 0.3,
        fill: true,
      },
    ],
  };

  return (
    <div className="dashboard-main">
      <main className="dashboard-main">
        <h2 className="dashboard-title">대시보드</h2>

        <div className="card-container" style={{ display: 'flex', gap: '2rem', justifyContent: 'space-between' }}>
          <div className="card" style={{ flex: 1.5, minWidth: '300px' }}>
            <h3>총 조회수</h3>
            <p>{Number(stats.viewCount).toLocaleString()}</p>
          </div>
          <div className="card" style={{ flex: 1.5, minWidth: '300px' }}>
            <h3>누적 시청 시간</h3>
            <p>{Math.floor(Number(stats.viewCount) / 100).toLocaleString()}시간</p>
          </div>
          <div className="card" style={{ flex: 1.5, minWidth: '300px' }}>
            <h3>구독자 수</h3>
            <p>{Number(stats.subscriberCount).toLocaleString()}명</p>
          </div>
        </div>

        <section className="dashboard-section">
          <h3 className="section-title">시청자 분포</h3>
          <div className="pie-chart-section">
            {[{
              title: '성별 비율',
              labels: ['남성', '여성'],
              data: [audience.gender.male, audience.gender.female],
              colors: ['#60a5fa', '#f472b6'],
            }, {
              title: '연령대별 비율',
              labels: Object.keys(audience.age),
              data: Object.values(audience.age),
              colors: ['#f87171', '#fb923c', '#facc15', '#34d399', '#60a5fa'],
            }, {
              title: '국가별 분포',
              labels: Object.keys(audience.country),
              data: Object.values(audience.country),
              colors: ['#93c5fd', '#fdba74', '#fca5a5', '#c4b5fd'],
            }].map((chart, idx) => (
              <div className="pie-card" key={idx}>
                <h4>{chart.title}</h4>
                <div >
                  <Pie
                    data={{
                      labels: chart.labels,
                      datasets: [{
                        data: chart.data,
                        backgroundColor: chart.colors,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: true,
                      plugins: {
                        legend: {
                          display: false
                        },
                        datalabels: {
                          color: '#000',
                          formatter: (value, context) => {
                            const label = context.chart.data.labels[context.dataIndex];
                            return `${label}: ${value}`;
                          },
                          font: {
                            weight: 'bold',
                            size: 12,
                          },
                          align: 'center',
                          anchor: 'center',
                        }
                      }
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="dashboard-section">
          <h3 className="section-title">채널 성장 & 시간대별 시청</h3>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '300px', height: '20rem', position: 'relative' }}>
              <Line data={growthChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
            <div style={{ flex: 1, minWidth: '300px', height: '20rem', position: 'relative' }}>
              <Line data={timeChartData} options={{ responsive: true, maintainAspectRatio: false }} />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Dashboard;
