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
                        // ✨✨✨ 스택 바의 각 세그먼트가 100%를 채우도록 너비를 조정 ✨✨✨
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
    // 이전에 15자로 제한했었지만, 테이블 셀에 맞게 더 짧게 (예: 25자) 또는 CSS로 처리하는 것이 좋습니다.
    // 여기서는 예시로 25자로 늘려봅니다. 필요에 따라 조절하세요.
    return label.length > 25 ? `${label.slice(0, 25)}...` : label; // 줄바꿈 대신 ... 처리
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

    // ✨✨✨ 시간대별 더미 데이터 재정의 (새벽, 오전, 오후 분류) ✨✨✨
    const dummyHourlyData = useMemo(() => {
        const rawData = [
            { hour: 0, views: 120 }, { hour: 1, views: 90 }, { hour: 2, views: 70 },
            { hour: 3, views: 50 }, { hour: 4, views: 60 }, { hour: 5, views: 100 },
            { hour: 6, views: 180 }, { hour: 7, views: 300 }, { hour: 8, views: 500 },
            { hour: 9, views: 700 }, { hour: 10, views: 900 }, { hour: 11, views: 1200 },
            { hour: 12, views: 1500 }, { hour: 13, views: 1400 }, { hour: 14, views: 1300 },
            { hour: 15, views: 1250 }, { hour: 16, views: 1100 }, { hour: 17, views: 1000 },
            { hour: 18, views: 950 }, { hour: 19, views: 900 }, { hour: 20, views: 800 },
            { hour: 21, views: 750 }, { hour: 22, views: 600 }, { hour: 23, views: 300 },
        ];

        let dawnViews = 0; // 새벽: 0시 ~ 5시
        let morningViews = 0; // 오전: 6시 ~ 11시
        let afternoonViews = 0; // 오후: 12시 ~ 23시

        rawData.forEach(item => {
            if (item.hour >= 0 && item.hour <= 5) {
                dawnViews += item.views;
            } else if (item.hour >= 6 && item.hour <= 11) {
                morningViews += item.views;
            } else if (item.hour >= 12 && item.hour <= 23) {
                afternoonViews += item.views;
            }
        });

        // 그래프를 위한 형식으로 변환
        return [
            { segment: '새벽', views: dawnViews },
            { segment: '오전', views: morningViews },
            { segment: '오후', views: afternoonViews },
        ];
    }, []);

    // ✨✨✨ 유입경로 더미 데이터 추가 (총합이 100이 되도록 조정) ✨✨✨
    const dummyTrafficData = useMemo(() => {
        const data = {
            'YT_SEARCH': 35000,
            'RELATED_VIDEO': 25000,
            'SUBSCRIBER': 15000,
            'YT_CHANNEL': 10000,
            'EXT_URL': 8000,
            'NO_LINK_OTHER': 7000
        };
        const total = Object.values(data).reduce((sum, v) => sum + v, 0);
        const labels = Object.keys(data);
        const values = Object.values(data);
        // 비율의 총합이 100%가 되도록 정확하게 계산
        const percents = values.map(v => (v / total) * 100);

        return { labels, values, percents };
    }, []);


    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const { allVideos: fetchedVideos = [], statistics: fetchedStats = null } = await fetchContentsPageData();
                setAllVideos(fetchedVideos);

                if (fetchedStats) {
                    setStatistics({
                        ...fetchedStats,
                        uploadCountByTimeZone: dummyHourlyData, // 더미 시간대별 데이터 사용
                        viewsByTrafficSource: dummyTrafficData, // 더미 유입경로 데이터 사용
                    });
                } else {
                    setStatistics({
                        uploadCountByTimeZone: dummyHourlyData,
                        viewsByTrafficSource: dummyTrafficData,
                        uploadCountByDay: {},
                        avgViewsByLength: [],
                        viewsByDevice: { labels: [], values: [], percents: [] },
                    });
                }

            } catch (err) {
                setError("데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요.");
                setStatistics(prevStats => ({
                    ...prevStats,
                    uploadCountByTimeZone: dummyHourlyData,
                    viewsByTrafficSource: dummyTrafficData,
                    uploadCountByDay: {},
                    avgViewsByLength: [],
                    viewsByDevice: { labels: [], values: [], percents: [] },
                }));
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [dummyHourlyData, dummyTrafficData]); // 의존성 추가

    // --- 데이터 가공 로직 (useMemo 사용) ---
    // ✨✨✨ 시간대별 데이터 처리 함수 수정: 'segment' 기준으로 처리 ✨✨✨
    const processHourlyData = (statArray) => {
        if (!Array.isArray(statArray) || statArray.length === 0) return { labels: [], values: [], percents: [] };
        const labels = statArray.map(item => item.segment);
        const values = statArray.map(item => item.views || 0);
        const total = values.reduce((sum, v) => sum + v, 0) || 1;
        const percents = values.map(v => (v / total) * 100);
        return { labels, values, percents };
    };

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
        
        // ✨✨✨ statistics에서 가져온 traffic 데이터는 이제 dummyTrafficData로 대체될 것이므로 직접 사용 ✨✨✨
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
            {/* ✨✨✨ to2line 함수를 적용하여 제목을 자릅니다. ✨✨✨ */}
            <td className="contents-video-title">
                <a href={v.url || '#'} target="_blank" rel="noopener noreferrer">
                    {to2line(v.title || '제목 없음')}
                </a>
            </td>
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
                                {/* ✨✨✨ to2line 함수를 적용하여 제목을 자릅니다. ✨✨✨ */}
                                <td className="contents-video-title">{to2line(v.title)}</td>
                                <td>{(v.views || 0).toLocaleString()}</td>
                                <td>{(v.likes || 0).toLocaleString()}</td>
                                <td>{(v.comments || 0).toLocaleString()}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>

            <div className="contents-grid contents-third">
                <section className="page-section">
                    <h2>업로드 요일별 조회수</h2>
                    {dayOfWeekData.labels.length > 0 ? (
                        <ContentsMultiThinBarList labels={dayOfWeekData.labels} values={dayOfWeekData.values} percents={dayOfWeekData.percents} colors={Array(dayOfWeekData.labels.length).fill(barColorDay)} unit="회" />
                    ) : <p className="no-data-message">데이터 없음</p>}
                </section>
                {/* ✨✨✨ 업로드 시간대별 조회수 섹션은 이제 새벽, 오전, 오후로 분류된 더미 데이터를 사용합니다. ✨✨✨ */}
                <section className="page-section">
                    <h2>업로드 시간대별 조회수</h2>
                    {timeZoneData.labels.length > 0 ? (
                        <ContentsMultiThinBarList labels={timeZoneData.labels} values={timeZoneData.values} percents={timeZoneData.percents} colors={Array(timeZoneData.labels.length).fill(barColorTime)} unit="회" />
                    ) : <p className="no-data-message">데이터 없음</p>}
                </section>
                <section className="page-section"><h2>영상 길이별 평균 조회수</h2>{lengthData.labels.length > 0 ? <ContentsMultiThinBarList labels={lengthData.labels} values={lengthData.values} percents={lengthData.percents} colors={Array(lengthData.labels.length).fill(barColorLen)} unit="회" /> : <p className="no-data-message">데이터 없음</p>}</section>
            </div>

            <div className="contents-grid contents-half">
                {/* ✨✨✨ 유입경로 분석 그래프가 항상 100%를 채우도록 데이터를 수정했습니다. ✨✨✨ */}
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