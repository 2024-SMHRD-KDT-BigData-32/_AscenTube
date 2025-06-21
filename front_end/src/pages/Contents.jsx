import React, { useEffect, useState, useMemo } from 'react';
import '../styles/pages/Contents.css';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fetchContentsPageData } from '../api/contentsApi';

// Chart.js에서 사용할 요소 등록
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ============================================
// 🟦 상수 및 재사용 컴포넌트
// ============================================
const barColorDay = "#40BFFF";
const barColorTime = "#7A7CFF";
const barColorLen = "#1EE3CF";
const trafficColors = ['#a78bfa', '#facc15', '#f87171', '#64748b', '#38bdf8'];
const deviceColors = ['#38bdf8', '#f43f5e', '#fcd34d', '#a3e635'];

// -- 얇은 막대바 컴포넌트
const ContentsMultiThinBarList = ({ labels, values, percents, colors, unit }) => (
  <div className="contents-multi-thin-bar-list">
    {(labels || []).map((label, i) => (
      <div className="contents-multi-thin-bar-row" key={label}>
        <span className="contents-multi-bar-label">{label}</span>
        <div className="contents-multi-bar-track">
          <div className="contents-multi-bar-fill" style={{ width: `${percents[i] || 0}%`, background: colors[i] }} />
        </div>
        <span className="contents-multi-bar-value">
          {(values[i] || 0).toLocaleString()}
          <span className="contents-multi-bar-unit">{unit}</span>
          <span className="contents-multi-bar-percent">({(percents[i] || 0).toFixed(1)}%)</span>
        </span>
      </div>
    ))}
  </div>
);

// -- 가로로 쌓는 스택 막대바
const ContentsStackedBar = ({ percents, colors }) => (
  <div className="contents-stacked-bar-track">
    {(percents || []).map((percent, i) => (
      <div key={i} className="contents-stacked-bar-fill" style={{ width: `${percent}%`, background: colors[i], borderTopLeftRadius: i === 0 ? 10 : 0, borderBottomLeftRadius: i === 0 ? 10 : 0, borderTopRightRadius: i === percents.length - 1 ? 10 : 0, borderBottomRightRadius: i === percents.length - 1 ? 10 : 0 }} />
    ))}
  </div>
);

// -- 값과 퍼센트가 같이 나오는 리스트
const ContentsBarValueList = ({ labels, values, percents, colors, unit }) => (
  <ul className="contents-bar-value-list">
    {(labels || []).map((label, i) => (
      <li key={label}>
        <span className="contents-bar-value-dot" style={{ background: colors[i] }} />
        <span className="contents-bar-value-label">{label}</span>
        <span className="contents-bar-value-val">{(values[i] || 0).toLocaleString()}</span>
        <span className="contents-bar-value-unit">{unit}</span>
        <span className="contents-bar-value-percent">({(percents[i] || 0).toFixed(1)}%)</span>
      </li>
    ))}
  </ul>
);

// -- Bar 차트 x축 라벨 줄바꿈용 함수
function to2line(label) {
  if (!label) return '';
  return label.length > 15 ? `${label.slice(0, 15)}...` : label.replace(' ', '\n');
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
        if (val == null || val === 0) return;
        ctx.font = 'bold 12px Pretendard, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillStyle = "#4A5568";
        ctx.fillText(val.toLocaleString(), bar.x, bar.y - 5);
      });
    });
    ctx.restore();
  }
};

// -- 날짜 포맷 함수
function formatShortDate(dateStr) {
  if (!dateStr) return '--';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const year = date.getFullYear().toString().slice(2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch (e) {
    return dateStr;
  }
}

// ============================================
// 🟦 메인 컴포넌트
// ============================================
const Contents = () => {
  const [allVideos, setAllVideos] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const { allVideos: fetchedVideos, statistics: fetchedStats } = await fetchContentsPageData();
        setAllVideos(fetchedVideos || []);
        setStatistics(fetchedStats);
      } catch (err) {
        console.error("콘텐츠 페이지 데이터 로드 중 오류:", err);
        setError("데이터를 불러오는 데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  const processStatData = (statObject) => {
    if (!statObject || Object.keys(statObject).length === 0) {
      return { labels: [], values: [], percents: [] };
    }
    const labels = Object.keys(statObject);
    const values = Object.values(statObject);
    const total = values.reduce((sum, v) => sum + v, 0) || 1;
    const percents = values.map(v => (v / total) * 100);
    return { labels, values, percents };
  };

  const dayOfWeekData = useMemo(() => processStatData(statistics?.uploadCountByDay), [statistics]);
  const timeZoneData = useMemo(() => processStatData(statistics?.uploadCountByTimeZone), [statistics]);
  const lengthData = useMemo(() => processStatData(statistics?.avgViewsByLength), [statistics]);
  const trafficData = useMemo(() => processStatData(statistics?.viewsByTrafficSource), [statistics]);
  const deviceData = useMemo(() => processStatData(statistics?.viewsByDevice), [statistics]);

  const latestVideos = useMemo(() =>
    [...allVideos]
      .sort((a, b) => new Date(b.uploadDate + 'T' + (b.uploadTime || '00:00')) - new Date(a.uploadDate + 'T' + (a.uploadTime || '00:00')))
      .slice(0, 5),
    [allVideos]);

  const popularVideos = useMemo(() =>
    [...allVideos]
      .sort((a, b) => (b.likes || 0) - (a.likes || 0))
      .slice(0, 5),
    [allVideos]);

  const renderVideoRow = (v, i) => (
    <tr key={v.videoId || i}>
      <td><img src={v.thumb} alt="thumb" className="contents-video-thumb-img" /></td>
      <td className="contents-video-title">
        <a href={v.url} target="_blank" rel="noopener noreferrer">{v.title}</a>
      </td>
      <td>
        <span>{formatShortDate(v.uploadDate)}<br />{v.uploadTime || '--:--'}</span>
      </td>
      <td>{v.length} 분</td>
      <td>{(v.views || 0).toLocaleString()}</td>
      <td>{(v.likes || 0).toLocaleString()}</td>
      <td>{(v.comments || 0).toLocaleString()}</td>
    </tr>
  );

  if (loading) return <p className="contents-loading-message">콘텐츠 데이터를 분석하고 있습니다...</p>;
  if (error) return <p className="contents-loading-message">{error}</p>;
  if (!statistics || allVideos.length === 0) return <p className="contents-loading-message">표시할 콘텐츠 데이터가 없습니다.</p>;

  return (
    <div className="contents-container">
      <header className="contents-header">
        <h1>콘텐츠 성과 분석</h1>
      </header>
      <main className="contents-main">
        {/* 영상별 성과 Bar 차트 */}
        <div className="contents-full-width-section">
          <section className="contents-section">
            <h2 className="contents-section-title">영상별 성과 비교</h2>
            <div className="contents-chart-wrapper contents-height-420">
              <Bar
                data={{
                  labels: allVideos.map((v) => to2line(v.title)),
                  datasets: [
                    { label: '조회수', data: allVideos.map((v) => v.views), backgroundColor: 'rgba(75,192,192,0.6)', barPercentage: 0.6, },
                    { label: '좋아요', data: allVideos.map((v) => v.likes), backgroundColor: 'rgba(153,102,255,0.6)', barPercentage: 0.6, },
                    { label: '댓글 수', data: allVideos.map((v) => v.comments), backgroundColor: 'rgba(255,159,64,0.6)', barPercentage: 0.6, },
                  ],
                }}
                options={{
                  responsive: true, maintainAspectRatio: false,
                  plugins: { legend: { position: 'top', labels: { font: { family: 'Pretendard, sans-serif' } } } },
                  scales: {
                    x: { ticks: { font: { family: 'Pretendard, sans-serif' }, autoSkip: false, maxRotation: 0, minRotation: 0 } },
                    y: { ticks: { font: { family: 'Pretendard, sans-serif' } } }
                  }
                }}
                plugins={[contentsBarLabelPlugin]}
              />
            </div>
          </section>
        </div>

        {/* 3분할(요일/시간/길이) 영역 */}
        <div className="contents-grid contents-third">
          <section className="contents-section">
            <h2 className="contents-section-title">업로드 요일별 분포</h2>
            <ContentsMultiThinBarList labels={dayOfWeekData.labels} values={dayOfWeekData.values} percents={dayOfWeekData.percents} colors={Array(dayOfWeekData.labels.length).fill(barColorDay)} unit="개" />
          </section>
          <section className="contents-section">
            <h2 className="contents-section-title">업로드 시간대 분포</h2>
            <ContentsMultiThinBarList labels={timeZoneData.labels} values={timeZoneData.values} percents={timeZoneData.percents} colors={Array(timeZoneData.labels.length).fill(barColorTime)} unit="개" />
          </section>
          <section className="contents-section">
            <h2 className="contents-section-title">영상 길이별 평균 조회수</h2>
            <ContentsMultiThinBarList labels={lengthData.labels} values={lengthData.values} percents={lengthData.percents} colors={Array(lengthData.labels.length).fill(barColorLen)} unit="회" />
          </section>
        </div>

        {/* 유입경로/기기별 분석 영역 */}
        <div className="contents-grid contents-half">
          <section className="contents-section">
            <h2 className="contents-section-title">유입경로 분석</h2>
            <ContentsStackedBar percents={trafficData.percents} colors={trafficColors} />
            <ContentsBarValueList labels={trafficData.labels} values={trafficData.values} percents={trafficData.percents} colors={trafficColors} unit="회" />
          </section>
          <section className="contents-section">
            <h2 className="contents-section-title">기기 접속 환경</h2>
            <ContentsStackedBar percents={deviceData.percents} colors={deviceColors} />
            <ContentsBarValueList labels={deviceData.labels} values={deviceData.values} percents={deviceData.percents} colors={deviceColors} unit="회" />
          </section>
        </div>

        {/* 최신/인기 영상 목록 표 */}
        <div className="contents-grid contents-half">
          <section className="contents-section">
            <div>
              <h2 className="contents-section-title" style={{ margin: 0, marginBottom: "1.13rem" }}>최신 영상 목록</h2>
              <span style={{ display: 'block', textAlign: 'right', fontSize: '0.97rem', color: '#888', fontWeight: 400, marginTop: '-0.7rem', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>*최신 5개 영상 기준</span>
            </div>
            <table className="contents-video-table">
              <thead><tr><th>썸네일</th><th>제목</th><th>업로드일</th><th>길이(분)</th><th>조회수</th><th>좋아요</th><th>댓글</th></tr></thead>
              <tbody>{latestVideos.map(renderVideoRow)}</tbody>
            </table>
          </section>
          <section className="contents-section">
            <div>
              <h2 className="contents-section-title" style={{ margin: 0, marginBottom: "1.13rem" }}>인기 영상 목록</h2>
              <span style={{ display: 'block', textAlign: 'right', fontSize: '0.97rem', color: '#888', fontWeight: 400, marginTop: '-0.7rem', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>*조회수 상위 5개 영상 기준</span>
            </div>
            <table className="contents-video-table">
              <thead><tr><th>썸네일</th><th>제목</th><th>업로드일</th><th>길이(분)</th><th>조회수</th><th>좋아요</th><th>댓글</th></tr></thead>
              <tbody>{popularVideos.map(renderVideoRow)}</tbody>
            </table>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Contents;