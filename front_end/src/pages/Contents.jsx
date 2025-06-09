import React, { useEffect, useState } from 'react';
import '../styles/pages/Contents.css';
// import axios from 'axios'; // 1. axios import 제거 (API 호출을 안 하므로)
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Bar, Doughnut } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// 📌 중앙 텍스트 플러그인 생성 함수 (변경 없음)
const createCenterTextPlugin = (text) => ({
  id: 'centerText',
  beforeDraw: (chart) => {
    const { width, height, ctx } = chart;
    ctx.restore();
    ctx.font = `${(height / 120).toFixed(2)}em 'Pretendard', sans-serif`;
    ctx.fillStyle = '#1e293b';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, width / 2, height / 2);
    ctx.save();
  },
});

const Contents = () => {
  const [videoData, setVideoData] = useState([]);
  const [trafficData, setTrafficData] = useState({});
  const [deviceData, setDeviceData] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 2. fetchAllData 함수 내용 수정
    const loadInitialData = () => { // 함수명 변경 (선택 사항)
      setLoading(true);
      // try-catch 블록을 단순화하고, API 호출 대신 더미 데이터 직접 사용
      // console.log('데이터 로딩 시뮬레이션 시작...'); // 디버깅용 로그

      // API 호출을 주석 처리하거나 삭제합니다.
      // const token = localStorage.getItem('accessToken');
      // const res = await axios.post('http://localhost:4000/video-analysis', { token });
      // setVideoData(res.data.videoData);
      // setTrafficData(res.data.trafficSources);
      // setDeviceData(res.data.deviceData);

      // 더미 데이터를 직접 설정합니다. (기존 catch 블록의 내용 활용)
      // 실제 API 호출을 하는 것처럼 보이게 하려면 약간의 딜레이를 줄 수 있습니다 (선택 사항)
      setTimeout(() => {
        setVideoData([
          { title: '더미 영상 1 (로컬)', views: 1234, likes: 56, comments: 12, retention: 45 },
          { title: '더미 영상 2 (로컬)', views: 4321, likes: 78, comments: 34, retention: 67 },
          { title: '더미 영상 3 (로컬)', views: 987, likes: 32, comments: 5, retention: 59 },
        ]);

        setTrafficData({
          'YouTube 검색 (로컬)': 1200,
          '외부 유입 (로컬)': 800,
          '탐색 기능 (로컬)': 500,
          '추천 영상 (로컬)': 350,
        });

        setDeviceData({
          'PC (로컬)': 1400,
          '모바일 (로컬)': 900,
          '태블릿 (로컬)': 150,
          'TV (로컬)': 60,
        });

        setLoading(false);
        // console.log('더미 데이터 로딩 완료'); // 디버깅용 로그
      }, 500); // 0.5초 딜레이 (로딩 화면을 잠시 보여주기 위함)

    };

    loadInitialData();
  }, []); // 의존성 배열은 비워둡니다 (마운트 시 1회 실행).

  // 📊 바 차트 데이터 (변경 없음)
  const barData = {
    labels: videoData.map((v) => v.title),
    datasets: [
      {
        label: '조회수',
        data: videoData.map((v) => v.views),
        backgroundColor: 'rgba(75,192,192,0.6)',
      },
      {
        label: '좋아요',
        data: videoData.map((v) => v.likes),
        backgroundColor: 'rgba(153,102,255,0.6)',
      },
      {
        label: '댓글 수',
        data: videoData.map((v) => v.comments),
        backgroundColor: 'rgba(255,159,64,0.6)',
      },
    ],
  };

  // 📊 도넛 차트 설정 (변경 없음)
  const doughnutOptions = {
    responsive: true,
    cutout: '60%',
    plugins: {
      legend: { display: false },
      tooltip: { enabled: false },
    },
  };

  // 도넛 차트용 데이터 (변경 없음)
  const doughnutTraffic = {
    labels: Object.keys(trafficData),
    datasets: [
      {
        label: '유입경로',
        data: Object.values(trafficData),
        backgroundColor: ['#a78bfa', '#facc15', '#f87171', '#64748b'],
        borderWidth: 1,
      },
    ],
  };

  const doughnutDevice = {
    labels: Object.keys(deviceData),
    datasets: [
      {
        label: '기기 접속',
        data: Object.values(deviceData),
        backgroundColor: ['#38bdf8', '#f43f5e', '#fcd34d', '#a3e635'],
        borderWidth: 1,
      },
    ],
  };

  // 중앙 퍼센트 텍스트 계산 예시 (변경 없음)
  const getCenterText = (dataObj) => {
    const total = Object.values(dataObj).reduce((sum, v) => sum + v, 0);
    if (total === 0) return '0%'; // 데이터가 없을 경우 0% 반환
    const first = Object.values(dataObj)[0] ?? 0;
    const percent = Math.round((first / total) * 100);
    return `${percent}%`;
  };

  return (
    <div className="contents-container">
      <header className="contents-header">
        <h1>콘텐츠 성과 분석</h1>
      </header>

      {loading ? (
        <p>데이터를 불러오는 중입니다...</p> // 로딩 메시지 변경
      ) : (
        <main className="contents-main">
          {/* 바 차트 (변경 없음) */}
          <section className="contents-section">
            <h2>📊 영상별 성과 분석</h2>
            <div className="chart-wrapper">
              <Bar
                data={barData}
                options={{
                  responsive: true,
                  plugins: { legend: { position: 'top' } },
                }}
              />
            </div>
          </section>

          {/* 유입경로 (변경 없음) */}
          <section className="contents-section">
            <h2>🔍 유입경로 분석</h2>
            <div className="chart-layout">
              <div className="chart-wrapper">
                <Doughnut
                  data={doughnutTraffic}
                  options={doughnutOptions}
                  plugins={[createCenterTextPlugin(getCenterText(trafficData))]}
                />
              </div>
              <ul className="chart-legend">
                {Object.entries(trafficData).map(([label, value], i) => (
                  <li key={i}>
                    <span
                      className="dot"
                      style={{ backgroundColor: doughnutTraffic.datasets[0].backgroundColor[i] }}
                    ></span>
                    {label} <strong>{value.toLocaleString()}회</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* 기기접속 (변경 없음) */}
          <section className="contents-section">
            <h2>📱 기기 접속 환경</h2>
            <div className="chart-layout">
              <div className="chart-wrapper">
                <Doughnut
                  data={doughnutDevice}
                  options={doughnutOptions}
                  plugins={[createCenterTextPlugin(getCenterText(deviceData))]}
                />
              </div>
              <ul className="chart-legend">
                {Object.entries(deviceData).map(([label, value], i) => (
                  <li key={i}>
                    <span
                      className="dot"
                      style={{ backgroundColor: doughnutDevice.datasets[0].backgroundColor[i] }}
                    ></span>
                    {label} <strong>{value.toLocaleString()}회</strong>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        </main>
      )}
    </div>
  );
};

export default Contents;