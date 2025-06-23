// src/pages/Contents.jsx

import React, { useEffect, useState, useMemo } from 'react';
import PageLayout from '../layouts/PageLayout'; // 공통 레이아웃 import
import '../styles/pages/Contents.css'; // Contents 페이지 전용 CSS
import { Chart as ChartJS, CategoryScale, LinearScale, LogarithmicScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fetchContentsPageData } from '../api/contentsApi';

// Chart.js에서 사용할 요소 등록
ChartJS.register(CategoryScale, LinearScale, LogarithmicScale, BarElement, Title, Tooltip, Legend);

// ============================================
// 🟦 상수 및 재사용 컴포넌트
// ============================================
const barColorDay = "#A78BFA";
const barColorTime = "#7A7CFF";
const barColorLen = "#1EE3CF";
const trafficColors = ['#a78bfa', '#facc15', '#f87171', '#64748b', '#38bdf8', '#818cf8', '#f472b6'];
const deviceColors = ['#38bdf8', '#f43f5e', '#fcd34d', '#a3e635'];

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

// --- [수정 1] --- 유입경로 그래프가 100%를 채우도록 로직 수정
const StackedBarSection = ({ title, data, colors, unit }) => {
    if (!data || !data.values || data.values.length === 0) {
        return (
            <section className="page-section">
                <h2>{title}</h2>
                <p className="no-data-message">데이터 없음</p>
            </section>
        );
    }

    const totalValue = data.values.reduce((sum, v) => sum + v, 0);

    return (
        <section className="page-section">
            <h2>{title}</h2>
            <>
                <div className="contents-stacked-bar-track" title={data.labels.map((l, i) => `${l}: ${data.percents[i].toFixed(1)}%`).join('\n')}>
                    {(data.values || []).map((value, i) => {
                        const visualWidthPercent = totalValue > 0 ? (value / totalValue) * 100 : 0;
                        return (
                            <div key={i} className="contents-stacked-bar-fill" style={{ width: `${visualWidthPercent}%`, background: colors[i] }}>
                                {visualWidthPercent > 10 && <span>{`${data.percents[i].toFixed(0)}%`}</span>}
                            </div>
                        );
                    })}
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
        </section>
    );
};


function to2line(label) {
    if (!label) return '';
    return label.length > 25 ? `${label.slice(0, 25)}...` : label;
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

// --- [수정 4] --- 영상 길이를 'X분 Y초'로 변환하는 함수 추가
function formatVideoLength(lengthInMinutes) {
    if (!lengthInMinutes || isNaN(lengthInMinutes)) return '--';
    const totalSeconds = Math.round(lengthInMinutes * 60);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}분 ${seconds}초`;
}

// ============================================
// 🟦 메인 컴포넌트
// ============================================
const Contents = () => {
    const [allVideos, setAllVideos] = useState([]);
    const [statistics, setStatistics] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [period, setPeriod] = useState('month');

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { allVideos: fetchedVideos, statistics: fetchedStats } = await fetchContentsPageData(period);
                setAllVideos(fetchedVideos || []);
                setStatistics(fetchedStats);
            } catch (err) {
                setError("데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
                setStatistics(null);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [period]);

    // 데이터 처리 함수 (수정 없음)
    const processStatData = (statObject, order) => {
        if (!statObject || typeof statObject !== 'object' || Object.keys(statObject).length === 0) {
            return { labels: [], values: [], percents: [] };
        }
        const allLabels = order || Object.keys(statObject);
        const labels = allLabels.filter(label => statObject[label] !== undefined);
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
    const timeZoneOrder = ['새벽', '오전', '오후', '저녁', '심야'];

    const dayOfWeekData = useMemo(() => processStatData(statistics?.uploadCountByDay, dayOrder), [statistics]);
    const timeZoneData = useMemo(() => processStatData(statistics?.uploadCountByTimeZone, timeZoneOrder), [statistics]);
    const lengthData = useMemo(() => processLengthData(statistics?.avgViewsByLength), [statistics]);
    
    // --- [수정 2 & 3] --- 유입경로, 기기 환경 데이터 정렬 로직 추가
    const { trafficData, deviceData } = useMemo(() => {
        const translateTraffic = (label) => ({'NO_LINK_OTHER':'기타','SUBSCRIBER':'구독','YT_CHANNEL':'채널','YT_SEARCH':'검색','RELATED_VIDEO':'관련영상','YT_OTHER_PAGE':'기타 유튜브','EXT_URL':'외부URL','PLAYLIST':'재생목록','NOTIFICATION':'알림','SHORTS':'쇼츠'}[label] || label);
        const translateDevice = (label) => ({'DESKTOP':'PC','TV':'TV','MOBILE':'모바일','TABLET':'태블릿'}[label] || label);
        
        const rawTraffic = statistics?.viewsByTrafficSource || { labels: [], values: [], percents: [] };
        const rawDevice = statistics?.viewsByDevice || { labels: [], values: [], percents: [] };

        // 유입경로 데이터 정렬 (퍼센트 높은 순)
        const sortedTraffic = (rawTraffic.labels || [])
            .map((label, index) => ({
                label: translateTraffic(label),
                value: rawTraffic.values[index],
                percent: rawTraffic.percents[index]
            }))
            .sort((a, b) => b.percent - a.percent);

        // 기기 환경 데이터 정렬 (횟수 많은 순)
        const sortedDevice = (rawDevice.labels || [])
            .map((label, index) => ({
                label: translateDevice(label),
                value: rawDevice.values[index],
                percent: rawDevice.percents[index]
            }))
            .sort((a, b) => b.value - a.value);

        return {
            trafficData: {
                labels: sortedTraffic.map(item => item.label),
                values: sortedTraffic.map(item => item.value),
                percents: sortedTraffic.map(item => item.percent)
            },
            deviceData: {
                labels: sortedDevice.map(item => item.label),
                values: sortedDevice.map(item => item.value),
                percents: sortedDevice.map(item => item.percent)
            }
        };
    }, [statistics]);

    const top5PopularVideosForChart = useMemo(() => [...(allVideos || [])].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5), [allVideos]);
    const videoLists = useMemo(() => ({
        latest: [...(allVideos || [])].sort((a, b) => new Date(b.uploadDate) - new Date(a.uploadDate)).slice(0, 5),
        popular: [...(allVideos || [])].sort((a, b) => (b.likes || 0) - (a.likes || 0)).slice(0, 5)
    }), [allVideos]);

    // --- [수정 4 & 5] --- 썸네일에 링크 추가, 길이 포맷 변경
    const renderVideoRow = (v, i) => (
        <tr key={v.videoId || i}>
            <td>
                <a href={v.url || '#'} target="_blank" rel="noopener noreferrer">
                    <img src={v.thumb || ''} alt={v.title} className="contents-video-thumb-img" />
                </a>
            </td>
            <td className="contents-video-title">
                <a href={v.url || '#'} target="_blank" rel="noopener noreferrer">
                    {to2line(v.title || '제목 없음')}
                </a>
            </td>
            <td><span>{formatShortDate(v.uploadDate)}</span></td>
            <td>{formatVideoLength(v.length)}</td>
            <td>{(v.views || 0).toLocaleString()}</td>
            <td>{(v.likes || 0).toLocaleString()}</td>
            <td>{(v.comments || 0).toLocaleString()}</td>
        </tr>
    );

    if (loading) return <PageLayout title="콘텐츠 성과 분석"><p className="contents-loading-message">콘텐츠 데이터를 분석하고 있습니다...</p></PageLayout>;
    if (error) return <PageLayout title="콘텐츠 성과 분석"><p className="contents-error-message">{error}</p></PageLayout>;
    if (!statistics && (!allVideos || allVideos.length === 0)) return <PageLayout title="콘텐츠 성과 분석"><p className="no-data-message">표시할 콘텐츠 데이터가 없습니다.</p></PageLayout>;

    // JSX 렌더링 부분은 구조적 변경 없음
    return (
        <PageLayout title="콘텐츠 성과 분석">
            <div className="period-selector">
                <button onClick={() => setPeriod('month')} className={period === 'month' ? 'active' : ''}>1개월</button>
                <button onClick={() => setPeriod('quarter')} className={period === 'quarter' ? 'active' : ''}>3개월</button>
                <button onClick={() => setPeriod('6month')} className={period === '6month' ? 'active' : ''}>6개월</button>
            </div>

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
                        {top5PopularVideosForChart.length > 0 ? top5PopularVideosForChart.map(v => (
                            <tr key={v.videoId}>
                                <td className="contents-video-title">{to2line(v.title)}</td>
                                <td>{(v.views || 0).toLocaleString()}</td>
                                <td>{(v.likes || 0).toLocaleString()}</td>
                                <td>{(v.comments || 0).toLocaleString()}</td>
                            </tr>
                        )) : (
                            <tr><td colSpan="4" className="no-data-message">데이터 없음</td></tr>
                        )}
                    </tbody>
                </table>
            </section>

            <div className="contents-grid contents-third">
                <section className="page-section">
                    <h2>업로드 요일별 조회수</h2>
                    <ContentsMultiThinBarList labels={dayOfWeekData.labels} values={dayOfWeekData.values} percents={dayOfWeekData.percents} colors={Array(dayOfWeekData.labels.length).fill(barColorDay)} unit="회" />
                </section>
                <section className="page-section">
                    <h2>업로드 시간대별 조회수</h2>
                    <ContentsMultiThinBarList labels={timeZoneData.labels} values={timeZoneData.values} percents={timeZoneData.percents} colors={Array(timeZoneData.labels.length).fill(barColorTime)} unit="회" />
                </section>
                <section className="page-section">
                    <h2>영상 길이별 평균 조회수</h2>
                    <ContentsMultiThinBarList labels={lengthData.labels} values={lengthData.values} percents={lengthData.percents} colors={Array(lengthData.labels.length).fill(barColorLen)} unit="회" />
                </section>
            </div>

            <div className="contents-grid contents-half">
                <StackedBarSection title="유입경로 분석" data={trafficData} colors={trafficColors} unit="%" />
                <StackedBarSection title="기기 접속 환경" data={deviceData} colors={deviceColors} unit="회" />
            </div>

            <div className="contents-grid contents-half">
                <section className="page-section">
                    <h2>최신 영상 목록</h2>
                    <table className="contents-video-table">
                        <thead><tr><th>썸네일</th><th>제목</th><th>업로드일</th><th>길이</th><th>조회수</th><th>좋아요</th><th>댓글</th></tr></thead>
                        <tbody>{videoLists.latest.length > 0 ? videoLists.latest.map(renderVideoRow) : <tr><td colSpan="7" className="no-data-message">최신 영상이 없습니다.</td></tr>}</tbody>
                    </table>
                </section>
                <section className="page-section">
                    <h2>인기 영상 목록</h2>
                    <table className="contents-video-table">
                        <thead><tr><th>썸네일</th><th>제목</th><th>업로드일</th><th>길이</th><th>조회수</th><th>좋아요</th><th>댓글</th></tr></thead>
                        <tbody>{videoLists.popular.length > 0 ? videoLists.popular.map(renderVideoRow) : <tr><td colSpan="7" className="no-data-message">인기 영상이 없습니다.</td></tr>}</tbody>
                    </table>
                </section>
            </div>
        </PageLayout>
    );
};

export default Contents;