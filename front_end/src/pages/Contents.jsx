import React, { useEffect, useState } from 'react';
import '../styles/pages/Contents.css';

// 📊 Chart.js 불러오기 (그래프를 그릴 때 사용)
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
import { Bar } from 'react-chartjs-2';

// Chart.js에서 사용할 요소 등록 (필수)
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ============================================
// 🟦 상수(한글 요일/시간대/색상 등)
// ============================================
const dayKorean = ['일', '월', '화', '수', '목', '금', '토'];
const timeZones = ['심야 (00~06시)', '오전 (06~12시)', '오후 (12~17시)', '저녁 (18~24시)'];

// 메인 색상
const barColorDay = "#40BFFF";   // 요일별: 쿨 & 선명한 블루
const barColorTime = "#7A7CFF";  // 시간대별: 쿨 & 선명한 퍼플
const barColorLen = "#1EE3CF";   // 길이별: 쿨 & 선명한 민트(청록)

const trafficColors = ['#a78bfa', '#facc15', '#f87171', '#64748b'];
const deviceColors = ['#38bdf8', '#f43f5e', '#fcd34d', '#a3e635'];

// ============================================
// 🟦 재사용 가능한 컴포넌트 (막대/리스트/스택)
// ============================================

// -- 얇은 막대바(요일, 시간대, 길이별) 컴포넌트
const ContentsMultiThinBarList = ({ labels, values, percents, colors, unit }) => (
  <div className="contents-multi-thin-bar-list">
    {labels.map((label, i) => (
      <div className="contents-multi-thin-bar-row" key={label}>
        <span className="contents-multi-bar-label">{label}</span>
        <div className="contents-multi-bar-track">
          <div
            className="contents-multi-bar-fill"
            style={{ width: `${percents[i]}%`, background: colors[i] }}
          />
        </div>
        <span className="contents-multi-bar-value">
          {values[i].toLocaleString()}
          <span className="contents-multi-bar-unit">{unit}</span>
          <span className="contents-multi-bar-percent">({percents[i].toFixed(1)}%)</span>
        </span>
      </div>
    ))}
  </div>
);

// -- 가로로 쌓는 스택 막대바(유입경로/기기별)
const ContentsStackedBar = ({ percents, colors }) => (
  <div className="contents-stacked-bar-track">
    {percents.map((percent, i) => (
      <div
        key={i}
        className="contents-stacked-bar-fill"
        style={{
          width: `${percent}%`,
          background: colors[i],
          borderTopLeftRadius: i === 0 ? 10 : 0,
          borderBottomLeftRadius: i === 0 ? 10 : 0,
          borderTopRightRadius: i === percents.length - 1 ? 10 : 0,
          borderBottomRightRadius: i === percents.length - 1 ? 10 : 0,
        }}
      />
    ))}
  </div>
);

// -- 값과 퍼센트가 같이 나오는 리스트(유입경로/기기)
const ContentsBarValueList = ({ labels, values, percents, colors, unit }) => (
  <ul className="contents-bar-value-list">
    {labels.map((label, i) => (
      <li key={label}>
        <span className="contents-bar-value-dot" style={{ background: colors[i] }} />
        <span className="contents-bar-value-label">{label}</span>
        <span className="contents-bar-value-val">{values[i].toLocaleString()}</span>
        <span className="contents-bar-value-unit">{unit}</span>
        <span className="contents-bar-value-percent">({percents[i].toFixed(1)}%)</span>
      </li>
    ))}
  </ul>
);

// -- Bar 차트 x축 라벨 줄바꿈용 함수(공백 기준)
function to2line(label) {
  return label.replace(' ', '\n');
}

// -- Bar 차트 각 막대 위 숫자 표시 플러그인
const contentsBarLabelPlugin = {
  id: "contentsBarLabelPlugin",
  afterDatasetsDraw: (chart) => {
    const { ctx } = chart;
    ctx.save();
    chart.data.datasets.forEach((dataset, datasetIndex) => {
      chart.getDatasetMeta(datasetIndex).data.forEach((bar, i) => {
        const val = dataset.data[i];
        if (val == null) return;
        ctx.font = 'bold 13px Pretendard, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = "#111";
        ctx.fillText(val, bar.x, bar.y - 8);
      });
    });
    ctx.restore();
  }
};

// ============================================
// 🟦 날짜를 "YY-MM-DD"로 변환하는 함수
// ============================================
function formatShortDate(dateStr) {
  if (!dateStr) return '--';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  return `${parts[0].slice(2)}-${parts[1]}-${parts[2]}`;
}

// ============================================
// 🟦 메인 컴포넌트
// ============================================
const Contents = () => {
  // -- 데이터 상태값 선언 (영상, 유입경로, 기기, 로딩여부)
  const [videoData, setVideoData] = useState([]);
  const [trafficData, setTrafficData] = useState({});
  const [deviceData, setDeviceData] = useState({});
  const [loading, setLoading] = useState(true);

  // -- 컴포넌트 마운트 시 더미 데이터로 초기화
  useEffect(() => {
    setLoading(true); // 로딩 시작
    setTimeout(() => {
      // 더미 영상 데이터 세팅
      const dummyVideos = [
        { title: '개발 브이로그', views: 1234, likes: 56, comments: 12, retention: 45, uploadDate: '2024-05-01', uploadTime: '08:34', length: 6, thumb: 'https://placehold.co/80x50?text=1', url: 'https://www.youtube.com/watch?v=video1' },
        { title: '코딩 꿀팁', views: 4321, likes: 78, comments: 34, retention: 67, uploadDate: '2024-05-02', uploadTime: '14:25', length: 12, thumb: 'https://placehold.co/80x50?text=2', url: 'https://www.youtube.com/watch?v=video2' },
        { title: 'React 입문', views: 3987, likes: 89, comments: 45, retention: 59, uploadDate: '2024-05-03', uploadTime: '19:05', length: 4, thumb: 'https://placehold.co/80x50?text=3', url: 'https://www.youtube.com/watch?v=video3' },
        { title: '주간 회고', views: 2100, likes: 32, comments: 5, retention: 51, uploadDate: '2024-05-04', uploadTime: '23:17', length: 15, thumb: 'https://placehold.co/80x50?text=4', url: 'https://www.youtube.com/watch?v=video4' },
        { title: '파이썬 기초', views: 1870, likes: 55, comments: 11, retention: 48, uploadDate: '2024-05-04', uploadTime: '11:52', length: 8, thumb: 'https://placehold.co/80x50?text=5', url: 'https://www.youtube.com/watch?v=video5' },
        { title: '채널 QnA', views: 2600, likes: 60, comments: 20, retention: 64, uploadDate: '2024-05-05', uploadTime: '17:45', length: 10, thumb: 'https://placehold.co/80x50?text=6', url: 'https://www.youtube.com/watch?v=video6' },
        { title: '일상 브이로그', views: 900, likes: 22, comments: 7, retention: 37, uploadDate: '2024-05-06', uploadTime: '04:13', length: 5, thumb: 'https://placehold.co/80x50?text=7', url: 'https://www.youtube.com/watch?v=video7' },
        { title: 'Shorts: 한 줄 팁', views: 1890, likes: 80, comments: 25, retention: 71, uploadDate: '2024-05-07', uploadTime: '15:00', length: 0.5, thumb: 'https://placehold.co/80x50?text=8', url: 'https://www.youtube.com/watch?v=video8' },
        { title: '인터뷰', views: 2880, likes: 92, comments: 37, retention: 72, uploadDate: '2024-05-07', uploadTime: '21:22', length: 25, thumb: 'https://placehold.co/80x50?text=9', url: 'https://www.youtube.com/watch?v=video9' },
        { title: '실전 프로젝트', views: 3200, likes: 111, comments: 54, retention: 81, uploadDate: '2024-05-08', uploadTime: '10:27', length: 13, thumb: 'https://placehold.co/80x50?text=10', url: 'https://www.youtube.com/watch?v=video10' },
      ];
      setVideoData(dummyVideos);

      // 더미 유입경로 데이터
      setTrafficData({
        'YouTube 검색': 1200,
        '외부 유입': 800,
        '탐색 기능': 500,
        '추천 영상': 350,
      });

      // 더미 기기 데이터
      setDeviceData({
        'PC': 1400,
        '모바일': 900,
        '태블릿': 150,
        'TV': 60,
      });

      setLoading(false); // 데이터 세팅 끝, 로딩 종료
    }, 500); // 0.5초 후 데이터 로드(실제 API 대신)
  }, []);

  // ====================================
  // 데이터 전처리 및 시각화용 값 계산
  // ====================================

  // -- 업로드 요일별 카운트 계산
  const weekCount = Array(7).fill(0);
  videoData.forEach(v => {
    const day = new Date(v.uploadDate).getDay();
    weekCount[day]++;
  });
  const weekTotal = weekCount.reduce((a, b) => a + b, 0) || 1;
  const weekPerc = weekCount.map(v => v / weekTotal * 100);

  // -- 업로드 시간대별 카운트
  const timeZoneCount = [0, 0, 0, 0];
  videoData.forEach(v => {
    if (typeof v.uploadTime === 'string') {
      const hh = parseInt(v.uploadTime.split(':')[0], 10);
      const zoneIdx = timeZones.indexOf(getTimeZone(hh));
      if (zoneIdx >= 0) timeZoneCount[zoneIdx]++;
    }
  });
  const timeTotal = timeZoneCount.reduce((a, b) => a + b, 0) || 1;
  const timePerc = timeZoneCount.map(v => v / timeTotal * 100);

  // -- 영상 길이 그룹별 평균 조회수
  const lengthGroups = [
    { label: '1분 이하', min: 0, max: 1 },
    { label: '1~5분', min: 1, max: 5 },
    { label: '5~10분', min: 5, max: 10 },
    { label: '10~20분', min: 10, max: 20 },
    { label: '20분 이상', min: 20, max: Infinity },
  ];
  const groupStats = lengthGroups.map(g => {
    const groupVideos = videoData.filter(v => v.length > g.min && v.length <= g.max);
    const avgViews = groupVideos.length
      ? Math.round(groupVideos.reduce((sum, v) => sum + v.views, 0) / groupVideos.length)
      : 0;
    return avgViews;
  });
  const statsTotal = groupStats.reduce((a, b) => a + b, 0) || 1;
  const statsPerc = groupStats.map(v => v / statsTotal * 100);

  // -- 유입경로 데이터
  const trafficLabels = Object.keys(trafficData);
  const trafficVals = Object.values(trafficData);
  const trafficSum = trafficVals.reduce((a, b) => a + b, 0) || 1;
  const trafficPerc = trafficVals.map(v => v / trafficSum * 100);

  // -- 기기 데이터
  const deviceLabels = Object.keys(deviceData);
  const deviceVals = Object.values(deviceData);
  const deviceSum = deviceVals.reduce((a, b) => a + b, 0) || 1;
  const devicePerc = deviceVals.map(v => v / deviceSum * 100);

  // ====================================
  // -- 영상 리스트(테이블) 행 생성 함수
  // ====================================
  // (업로드일+시간 줄바꿈)
  const renderVideoRow = (v, i) => (
    <tr key={i}>
      <td>
        <img src={v.thumb} alt="thumb" className="contents-video-thumb-img" />
      </td>
      <td className="contents-video-title">
        <a href={v.url} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5', textDecoration: 'underline' }}>
          {v.title}
        </a>
      </td>
      <td>
        <span>
          {formatShortDate(v.uploadDate)}
          <br />
          {v.uploadTime || '--:--'}
        </span>
      </td>
      <td>{v.length}</td>
      <td>{v.views.toLocaleString()}</td>
      <td>{v.likes}</td>
      <td>{v.comments}</td>
    </tr>
  );

  // -- 시, 분 → 시간대 텍스트로 변환
  function getTimeZone(hh) {
    if (hh < 6) return timeZones[0];
    if (hh < 12) return timeZones[1];
    if (hh < 18) return timeZones[2];
    return timeZones[3];
  }

  // ====================================
  // 🟦 실제 화면 렌더링 영역(리턴 부분)
  // ====================================
  return (
    <div className="contents-container">
      {/* 상단 제목(고정) */}
      <header className="contents-header">
        <h1>콘텐츠 성과 분석</h1>
      </header>
      {loading ? (
        // 데이터 로딩 중 표시
        <p className="contents-loading-message">데이터를 불러오는 중입니다...</p>
      ) : (
        <main className="contents-main">

          {/* ===== 영상별 성과 Bar 차트 영역 ===== */}
          <div className="contents-full-width-section">
            <section className="contents-section">
              <h2 className="contents-section-title">영상별 성과 비교</h2>
              <div className="contents-chart-wrapper contents-height-420">
                <Bar
                  data={{
                    labels: videoData.map((v) => to2line(v.title)),
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
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top',
                        labels: { font: { family: 'Pretendard, sans-serif', style: 'normal', weight: '400', size: 13 } }
                      }
                    },
                    scales: {
                      x: {
                        ticks: {
                          font: { family: 'Pretendard, sans-serif', style: 'normal', weight: '400', size: 13 },
                          callback: function(value) {
                            const label = this.getLabelForValue(value);
                            if (label && label.includes('\n')) return label.split('\n');
                            return label;
                          },
                          autoSkip: false,
                          maxRotation: 0,
                          minRotation: 0
                        }
                      },
                      y: {
                        ticks: {
                          stepSize: 500,
                          font: { family: 'Pretendard, sans-serif', style: 'normal', weight: '400', size: 13 }
                        },
                        max: Math.ceil(Math.max(
                          ...videoData.map((v) => v.views),
                          ...videoData.map((v) => v.likes),
                          ...videoData.map((v) => v.comments),
                          1
                        ) / 500) * 500 + 500
                      }
                    }
                  }}
                  plugins={[contentsBarLabelPlugin]}
                />
              </div>
            </section>
          </div>

          {/* ===== 3분할(요일/시간/길이 Bar) 영역 ===== */}
          <div className="contents-grid contents-third" style={{ marginTop: "2.5rem" }}>
            <section className="contents-section">
              <h2 className="contents-section-title">업로드 요일별 분포</h2>
              <ContentsMultiThinBarList
                labels={dayKorean}
                values={weekCount}
                percents={weekPerc}
                colors={Array(dayKorean.length).fill(barColorDay)}
                unit="개"
              />
            </section>
            <section className="contents-section">
              <h2 className="contents-section-title">영상 업로드 시간대 분포</h2>
              <ContentsMultiThinBarList
                labels={timeZones}
                values={timeZoneCount}
                percents={timePerc}
                colors={Array(timeZones.length).fill(barColorTime)}
                unit="개"
              />
            </section>
            <section className="contents-section">
              <h2 className="contents-section-title">영상 길이별 평균 조회수</h2>
              <ContentsMultiThinBarList
                labels={lengthGroups.map(g => g.label)}
                values={groupStats}
                percents={statsPerc}
                colors={Array(lengthGroups.length).fill(barColorLen)}
                unit="회"
              />
            </section>
          </div>

          {/* ===== 유입경로/기기별 분석 영역 ===== */}
          <div className="contents-grid contents-half" style={{ marginTop: "2.5rem" }}>
            <section className="contents-section">
              <h2 className="contents-section-title">유입경로 분석</h2>
              <ContentsStackedBar
                percents={trafficPerc}
                colors={trafficColors}
              />
              <ContentsBarValueList
                labels={trafficLabels}
                values={trafficVals}
                percents={trafficPerc}
                colors={trafficColors}
                unit="회"
              />
            </section>
            <section className="contents-section">
              <h2 className="contents-section-title">기기 접속 환경</h2>
              <ContentsStackedBar
                percents={devicePerc}
                colors={deviceColors}
              />
              <ContentsBarValueList
                labels={deviceLabels}
                values={deviceVals}
                percents={devicePerc}
                colors={deviceColors}
                unit="회"
              />
            </section>
          </div>

          {/* ===== 최신/인기 영상 목록 표 ===== */}
          <div className="contents-grid contents-half" style={{ marginTop: "2.5rem" }}>
            {/* 최신 영상 */}
            <section className="contents-section">
              <div>
                {/* 제목 */}
                <h2 className="contents-section-title" style={{ margin: 0, marginBottom: "1.13rem" }}>
                  최신 영상 목록
                </h2>
                {/* 안내문구: 제목 바로 아래, 오른쪽 */}
                <span style={{
                  display: 'block',
                  textAlign: 'right',
                  fontSize: '0.97rem',
                  color: '#888',
                  fontWeight: 400,
                  marginTop: '-0.7rem',
                  marginBottom: '0.2rem',
                  whiteSpace: 'nowrap'
                }}>
                  *최신 5개 영상 기준
                </span>
              </div>
              <table className="contents-video-table">
                <thead>
                  <tr>
                    <th>썸네일</th>
                    <th>제목</th>
                    <th>업로드일</th>
                    <th>길이(분)</th>
                    <th>조회수</th>
                    <th>좋아요</th>
                    <th>댓글</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 최신 5개(업로드일 내림차순)만 추출 */}
                  {[...videoData]
                    .sort((a, b) => {
                      const dateA = new Date(a.uploadDate + 'T' + (a.uploadTime || '00:00'));
                      const dateB = new Date(b.uploadDate + 'T' + (b.uploadTime || '00:00'));
                      return dateB - dateA;
                    })
                    .slice(0, 5)
                    .map(renderVideoRow)}
                </tbody>
              </table>
            </section>
            {/* 인기 영상 */}
            <section className="contents-section">
              <div>
                <h2 className="contents-section-title" style={{ margin: 0, marginBottom: "1.13rem" }}>
                  인기 영상 목록
                </h2>
                <span style={{
                  display: 'block',
                  textAlign: 'right',
                  fontSize: '0.97rem',
                  color: '#888',
                  fontWeight: 400,
                  marginTop: '-0.7rem',
                  marginBottom: '0.2rem',
                  whiteSpace: 'nowrap'
                }}>
                  *최상위 인기 영상 5개 기준
                </span>
              </div>
              <table className="contents-video-table">
                <thead>
                  <tr>
                    <th>썸네일</th>
                    <th>제목</th>
                    <th>업로드일</th>
                    <th>길이(분)</th>
                    <th>조회수</th>
                    <th>좋아요</th>
                    <th>댓글</th>
                  </tr>
                </thead>
                <tbody>
                  {/* 좋아요 수 내림차순 상위 5개만 추출 */}
                  {[...videoData]
                    .sort((a, b) => b.likes - a.likes)
                    .slice(0, 5)
                    .map(renderVideoRow)}
                </tbody>
              </table>
            </section>
          </div>
        </main>
      )}
    </div>
  );
};

export default Contents;
