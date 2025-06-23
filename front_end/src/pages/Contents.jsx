// src/pages/Contents.jsx

import React, { useEffect, useState, useMemo } from 'react';
import PageLayout from '../layouts/PageLayout'; // 공통 레이아웃 import
import '../styles/pages/Contents.css'; // Contents 페이지 전용 CSS
import { Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fetchContentsPageData } from '../api/contentsApi';

// Chart.js에서 사용할 요소 등록 (LogarithmicScale 추가)
ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, Title, Tooltip, Legend);

// ============================================
// 🟦 상수 및 재사용 컴포넌트
// ============================================
const barColorDay = "#A78BFA"; // 요일별 차트 색상 추가
const barColorTime = "#7A7CFF";
const barColorLen = "#1EE3CF";
const trafficColors = ['#a78bfa', '#facc15', '#f87171', '#64748b', '#38bdf8', '#818cf8', '#f472b6'];
const deviceColors = ['#38bdf8', '#f43f5e', '#fcd34d', '#a3e635'];

// --- 가로 막대바 컴포넌트 ---
const ContentsMultiThinBarList = ({ labels, values, percents, colors, unit }) => (
    <div className="contents-multi-thin-bar-list">
        {(labels || []).map((label, i) => (
            <div className="contents-multi-thin-bar-row" key={label || `item-${i}`}>
                <span className="contents-multi-bar-label">{label}</span>
                <div className="contents-multi-bar-track">
                    <div className="contents-multi-bar-fill" style={{ width: `${percents?.[i] || 0}%`, background: colors?.[i] || '#ccc' }}>
                        {(percents?.[i] || 0) > 15 && (
                            <span className="bar-inner-text">{`${(values?.[i] || 0).toLocaleString()}${unit}`}</span>
                        )}
                    </div>
                </div>
                <span className="contents-multi-bar-value">
                    {`${(percents?.[i] || 0).toFixed(1)}%`}
                </span>
            </div>
        ))}
    </div>
);

// --- 스택 막대바 및 리스트 컴포넌트 ---
const StackedBarSection = ({ title, data, colors, unit }) => (
    <section className="page-section">
        <h2>{title}</h2>
        {data.labels.length > 0 ? (
            <>
                <div className="contents-stacked-bar-track" title={data.labels.map((l, i) => `${l}: ${data.percents[i].toFixed(1)}%`).join('\n')}>
                    {(data.percents || []).map((percent, i) => (
                        <div key={i} className="contents-stacked-bar-fill" style={{ width: `${percent}%`, background: colors[i] }}>
                            {percent > 10 && <span>{`${percent.toFixed(0)}%`}</span>}
                        </div>
                    ))}
                </div>
                <ul className="contents-bar-value-list">
                    {(data.labels || []).map((label, i) => (
                        <li key={label}>
                            <span className="contents-bar-value-dot" style={{ background: colors[i] }} />
                            <span className="contents-bar-value-label">{label}</span>
                            <span className="contents-bar-value-val">
                                {`${(data.values?.[i] || 0).toLocaleString()}${unit}`}
                            </span>
                        </li>
                    ))}
                </ul>
            </>
        ) : <p className="no-data-message">데이터 없음</p>}
    </section>
);

// ✨✨✨ 에러 해결: to2line 함수 추가 ✨✨✨
function to2line(label) {
    if (!label) return '';
    return label.length > 15 ? `${label.slice(0, 15)}...` : label.replace(' ', '\n');
}

function formatShortDate(dateStr) {
    if (!dateStr) return '--';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        const year = date.getFullYear().toString().slice(2);
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const day = date.getDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch (e) { return dateStr; }
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
                const { allVideos: fetchedVideos = [], statistics: fetchedStats = null } = await fetchContentsPageData();
                setAllVideos(fetchedVideos);
                setStatistics(fetchedStats);
            } catch (err) {
                setError("데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // --- 데이터 가공 로직 (useMemo 사용) ---
    const processHourlyData = (statArray) => {
        if (!Array.isArray(statArray) || statArray.length === 0) return { labels: [], values: [], percents: [] };
        const sortedData = statArray.sort((a, b) => a.hour - b.hour);
        const labels = sortedData.map(item => `${String(item.hour).padStart(2, '0')}시`);
        const values = sortedData.map(item => item.views || 0);
        const total = values.reduce((sum, v) => sum + v, 0) || 1;
        const percents = values.map(v => (v / total) * 100);
        return { labels, values, percents };
    };

    // ✨✨✨ 경고 해결: processStatData 함수를 다시 사용하도록 수정 ✨✨✨
    const processStatData = (statObject, order) => {
        if (!statObject || typeof statObject !== 'object' || Object.keys(statObject).length === 0) {
            return { labels: [], values: [], percents: [] };
        }
        const labels = order ? order.filter(day => statObject[day] !== undefined) : Object.keys(statObject);
        const values = labels.map(label => statObject[label]);
        const total = values.reduce((sum, v) => sum + v, 0) || 1;
        const percents = values.map(v => (v / total) * 100);
        return { labels, values, percents };
    };
    
    const processLengthData = (statArray) => {
        if (!Array.isArray(statArray) || statArray.length === 0) return { labels: [], values: [], percents: [] };
        const labels = statArray.map(item => item.lengthSegment || 'N/A');
        const values = statArray.map(item => item.viewsCount || 0);
        const total = values.reduce((sum, v) => sum + v, 0) || 1;
        const percents = values.map(v => (v / total) * 100);
        return { labels, values, percents };
    };

    const dayOrder = ["월요일", "화요일", "수요일", "목요일", "금요일", "토요일", "일요일"];
    const dayOfWeekData = useMemo(() => processStatData(statistics?.uploadCountByDay || {}, dayOrder), [statistics]);
    const timeZoneData = useMemo(() => processHourlyData(statistics?.uploadCountByTimeZone || []), [statistics]);
    const lengthData = useMemo(() => processLengthData(statistics?.avgViewsByLength || []), [statistics]);
    
    const { trafficData, deviceData } = useMemo(() => {
        const translateTraffic = (label) => ({'NO_LINK_OTHER':'기타','SUBSCRIBER':'구독','YT_CHANNEL':'채널','YT_SEARCH':'검색','RELATED_VIDEO':'관련영상','YT_OTHER_PAGE':'기타 유튜브','EXT_URL':'외부URL','PLAYLIST':'재생목록','NOTIFICATION':'알림','SHORTS':'쇼츠'}[label] || label);
        const translateDevice = (label) => ({'DESKTOP':'PC','TV':'TV','MOBILE':'모바일','TABLET':'태블릿'}[label] || label);
        
        const rawTraffic = statistics?.viewsByTrafficSource || { labels: [], values: [], percents: [] };
        const rawDevice = statistics?.viewsByDevice || { labels: [], values: [], percents: [] };

        return {
            trafficData: { labels: (rawTraffic.labels || []).map(translateTraffic), values: rawTraffic.values, percents: rawTraffic.percents },
            deviceData: { labels: (rawDevice.labels || []).map(translateDevice), values: rawDevice.values, percents: rawDevice.percents }
        };
    }, [statistics]);

    const top5PopularVideosForChart = useMemo(() => [...(allVideos || [])].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5), [allVideos]);
    const videoLists = useMemo(() => ({
        latest: [...(allVideos || [])].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).slice(0, 5),
        popular: [...(allVideos || [])].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5)
    }), [allVideos]);

    const renderVideoRow = (v, i) => (
        <tr key={v.videoId || i}>
            <td><img src={v.thumb || ''} alt="" className="contents-video-thumb-img" /></td>
            <td className="contents-video-title"><a href={v.url || '#'} target="_blank" rel="noopener noreferrer">{v.title || '제목 없음'}</a></td>
            <td><span>{formatShortDate(v.uploadDate)}</span></td>
            <td>{v.length || 0} 분</td><td>{(v.views || 0).toLocaleString()}</td>
            <td>{(v.likes || 0).toLocaleString()}</td><td>{(v.comments || 0).toLocaleString()}</td>
        </tr>
    );

    if (loading) return <PageLayout title="콘텐츠 성과 분석"><p className="contents-loading-message">콘텐츠 데이터를 분석하고 있습니다...</p></PageLayout>;
    if (error) return <PageLayout title="콘텐츠 성과 분석"><p className="contents-error-message">{error}</p></PageLayout>;
    if (!statistics && allVideos.length === 0) return <PageLayout title="콘텐츠 성과 분석"><p className="no-data-message">표시할 콘텐츠 데이터가 없습니다.</p></PageLayout>;

    return (
        <PageLayout title="콘텐츠 성과 분석">
            <section className="page-section">
                <h2>영상별 성과 비교</h2>
                <div className="contents-chart-wrapper">
                    {top5PopularVideosForChart.length > 0 ? (
                        <Bar
                            data={{
                                labels: top5PopularVideosForChart.map((v) => v.title),
                                datasets: [
                                    { label: '조회수', data: top5PopularVideosForChart.map((v) => v.views || 0), backgroundColor: 'rgba(75,192,192,0.6)', yAxisID: 'y' },
                                    { label: '좋아요', data: top5PopularVideosForChart.map((v) => v.likes || 0), backgroundColor: 'rgba(153,102,255,0.6)', yAxisID: 'y2' },
                                    { label: '댓글 수', data: top5PopularVideosForChart.map((v) => v.comments || 0), backgroundColor: 'rgba(255,159,64,0.6)', yAxisID: 'y2' },
                                ],
                            }}
                            options={{
                                responsive: true, maintainAspectRatio: false,
                                plugins: { legend: { position: 'top' } },
                                scales: {
                                    x: { ticks: { callback: (value, index) => to2line(top5PopularVideosForChart[index].title) } },
                                    y: { type: 'logarithmic', position: 'left', title: { display: true, text: '조회수 (로그 스케일)' } },
                                    y2: { position: 'right', title: { display: true, text: '좋아요 / 댓글 수' }, grid: { drawOnChartArea: false } }
                                }
                            }}
                        />
                    ) : <p className="no-chart-data-message">차트 데이터 부족</p>}
                </div>
                <table className="contents-video-table" style={{marginTop: '1.5rem'}}>
                    <thead><tr><th>제목</th><th>조회수</th><th>좋아요</th><th>댓글</th></tr></thead>
                    <tbody>
                        {top5PopularVideosForChart.map(v => (
                            <tr key={v.videoId}>
                                <td className="contents-video-title">{v.title}</td>
                                <td>{(v.views || 0).toLocaleString()}</td>
                                <td>{(v.likes || 0).toLocaleString()}</td>
                                <td>{(v.comments || 0).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <div className="contents-grid contents-third">
                {/* ✨✨✨ "업로드 요일별 조회수" 섹션 복원 ✨✨✨ */}
                <section className="page-section">
                    <h2>업로드 요일별 조회수</h2>
                    {dayOfWeekData.labels.length > 0 ? (
                        <ContentsMultiThinBarList labels={dayOfWeekData.labels} values={dayOfWeekData.values} percents={dayOfWeekData.percents} colors={Array(dayOfWeekData.labels.length).fill(barColorDay)} unit="회" />
                    ) : <p className="no-data-message">데이터 없음</p>}
                </section>
                <section className="page-section"><h2>업로드 시간대별 조회수</h2>{timeZoneData.labels.length > 0 ? <ContentsMultiThinBarList labels={timeZoneData.labels} values={timeZoneData.values} percents={timeZoneData.percents} colors={Array(timeZoneData.labels.length).fill(barColorTime)} unit="회" /> : <p className="no-data-message">데이터 없음</p>}</section>
                <section className="page-section"><h2>영상 길이별 평균 조회수</h2>{lengthData.labels.length > 0 ? <ContentsMultiThinBarList labels={lengthData.labels} values={lengthData.values} percents={lengthData.percents} colors={Array(lengthData.labels.length).fill(barColorLen)} unit="회" /> : <p className="no-data-message">데이터 없음</p>}</section>
            </div>

            <div className="contents-grid contents-half">
                <StackedBarSection title="유입경로 분석" data={trafficData} colors={trafficColors} unit="%" />
                <StackedBarSection title="기기 접속 환경" data={deviceData} colors={deviceColors} unit="회" />
            </div>

            <div className="contents-grid contents-half">
                <section className="page-section">
                    <h2>최신 영상 목록</h2>
                    <table className="contents-video-table">
                        <thead><tr><th>썸네일</th><th>제목</th><th>업로드일</th><th>길이(분)</th><th>조회수</th><th>좋아요</th><th>댓글</th></tr></thead>
                        <tbody>{videoLists.latest.length > 0 ? videoLists.latest.map(renderVideoRow) : <tr><td colSpan="7" className="no-data-message">최신 영상이 없습니다.</td></tr>}</tbody>
                    </table>
                </section>
                <section className="page-section">
                    <h2>인기 영상 목록</h2>
                    <table className="contents-video-table">
                        <thead><tr><th>썸네일</th><th>제목</th><th>업로드일</th><th>길이(분)</th><th>조회수</th><th>좋아요</th><th>댓글</th></tr></thead>
                        <tbody>{videoLists.popular.length > 0 ? videoLists.popular.map(renderVideoRow) : <tr><td colSpan="7" className="no-data-message">인기 영상이 없습니다.</td></tr>}</tbody>
                    </table>
                </section>
            </div>
        </PageLayout>
    );
};

export default Contents;
