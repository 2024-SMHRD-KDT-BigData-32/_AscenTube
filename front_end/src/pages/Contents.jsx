// src/pages/Contents.jsx
import React, { useEffect, useState, useMemo } from 'react';
import '../styles/pages/Contents.css';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js';
import { Bar } from 'react-chartjs-2';
import { fetchContentsPageData } from '../api/contentsApi'; // contentsApi는 변경 없음

// Chart.js에서 사용할 요소 등록
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement);

// ============================================
// 🟦 상수 및 재사용 컴포넌트
// ============================================
const barColorDay = "#40BFFF";
const barColorTime = "#7A7CFF";
const barColorLen = "#1EE3CF"; // 영상 길이별 평균 조회수 차트 색상
const trafficColors = ['#a78bfa', '#facc15', '#f87171', '#64748b', '#38bdf8'];
const deviceColors = ['#38bdf8', '#f43f5e', '#fcd34d', '#a3e635'];

// -- 얇은 막대바 컴포넌트
const ContentsMultiThinBarList = ({ labels, values, percents, colors, unit }) => (
    <div className="contents-multi-thin-bar-list">
        {/* ⭐ [수정] labels가 없을 경우 빈 배열로 처리하여 map 오류 방지 */}
        {(labels || []).map((label, i) => (
            <div className="contents-multi-thin-bar-row" key={label || `item-${i}`}> {/* key에 label이 없을 경우 대비 */}
                <span className="contents-multi-bar-label">{label || 'N/A'}</span>
                <div className="contents-multi-bar-track">
                    {/* ⭐ [수정] percents[i]가 없을 경우 0으로 처리 */}
                    <div className="contents-multi-bar-fill" style={{ width: `${percents?.[i] || 0}%`, background: colors?.[i] || '#ccc' }} />
                </div>
                <span className="contents-multi-bar-value">
                    {/* values가 백분율일 경우 소수점 두 자리까지 표시 */}
                    {unit === '%' ? `${(values?.[i] || 0).toFixed(2)}` : (values?.[i] || 0).toLocaleString()}
                    <span className="contents-multi-bar-unit">{unit}</span>
                    {/* ⭐ [수정] percents[i]가 없을 경우 0으로 처리 */}
                    <span className="contents-multi-bar-percent">({(percents?.[i] || 0).toFixed(1)}%)</span>
                </span>
            </div>
        ))}
    </div>
);

// -- 가로로 쌓는 스택 막대바
const ContentsStackedBar = ({ percents, colors }) => (
    <div className="contents-stacked-bar-track">
        {/* ⭐ [수정] percents가 없을 경우 빈 배열로 처리하여 map 오류 방지 */}
        {(percents || []).map((percent, i) => (
            <div key={i} className="contents-stacked-bar-fill" 
                 style={{ 
                     width: `${percent || 0}%`, // ⭐ [수정] percent가 없을 경우 0으로 처리
                     background: colors?.[i] || '#ccc', // ⭐ [수정] colors[i]가 없을 경우 대비
                     borderTopLeftRadius: i === 0 ? 10 : 0, 
                     borderBottomLeftRadius: i === 0 ? 10 : 0, 
                     borderTopRightRadius: i === percents.length - 1 ? 10 : 0, 
                     borderBottomRightRadius: i === percents.length - 1 ? 10 : 0 
                 }} 
            />
        ))}
    </div>
);

// -- 값과 퍼센트가 같이 나오는 리스트
const ContentsBarValueList = ({ labels, values, percents, colors, unit }) => (
    <ul className="contents-bar-value-list">
        {/* ⭐ [수정] labels가 없을 경우 빈 배열로 처리하여 map 오류 방지 */}
        {(labels || []).map((label, i) => (
            <li key={label || `item-${i}`}> {/* key에 label이 없을 경우 대비 */}
                <span className="contents-bar-value-dot" style={{ background: colors?.[i] || '#ccc' }} />
                <span className="contents-bar-value-label">{label || 'N/A'}</span>
                <span className="contents-bar-value-val">
                    {/* values가 백분율일 경우 소수점 두 자리까지 표시 */}
                    {unit === '%' ? `${(values?.[i] || 0).toFixed(2)}` : (values?.[i] || 0).toLocaleString()}
                </span>
                <span className="contents-bar-value-unit">{unit}</span>
                {/* ⭐ [수정] percents[i]가 없을 경우 0으로 처리 */}
                <span className="contents-bar-value-percent">({(percents?.[i] || 0).toFixed(1)}%)</span>
            </li>
        ))}
    </ul>
);

// -- Bar 차트 x축 라벨 줄바꿈용 함수
function to2line(label) {
    if (!label) return ''; // ⭐ [수정] label이 null 또는 undefined일 경우 빈 문자열 반환
    return label.length > 15 ? `${label.slice(0, 15)}...` : label.replace(' ', '\n');
}

// -- Bar 차트 각 막대 위 숫자 표시 플러그인
const contentsBarLabelPlugin = {
    id: "contentsBarLabelPlugin",
    afterDatasetsDraw: (chart) => {
        const { ctx } = chart;
        ctx.save();
        chart.data.datasets.forEach((dataset, datasetIndex) => {
            // ⭐ [수정] dataset.data가 null 또는 undefined일 경우 빈 배열로 처리
            (dataset.data || []).forEach((val, i) => { 
                const bar = chart.getDatasetMeta(datasetIndex).data[i];
                if (bar && (val != null && val !== 0)) { // ⭐ [수정] bar 객체 존재 여부도 체크
                    ctx.font = 'bold 12px Pretendard, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'bottom';
                    ctx.fillStyle = "#4A5568";
                    ctx.fillText(val.toLocaleString(), bar.x, bar.y - 5);
                }
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
                // contentsApi.js는 변경 없이 모든 영상을 가져옵니다.
                // fetchContentsPageData가 객체를 반환하지 않을 경우를 대비하여 기본값 설정
                const { allVideos: fetchedVideos = [], statistics: fetchedStats = null } = await fetchContentsPageData();
                setAllVideos(fetchedVideos);
                setStatistics(fetchedStats);
                console.log("Actual statistics.avgViewsByLength:", fetchedStats?.avgViewsByLength);
                console.log("Is it an array?", Array.isArray(fetchedStats?.avgViewsByLength));
            } catch (err) {
                console.error("콘텐츠 페이지 데이터 로드 중 오류:", err);
                // 오류 메시지를 좀 더 사용자 친화적으로 변경
                setError("데이터를 불러오는 데 실패했습니다. 잠시 후 다시 시도해주세요. (백엔드 또는 데이터 문제)");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    const processStatData = (statObject) => {
        // ⭐ [수정] statObject가 null 또는 undefined일 경우 빈 객체로 시작
        if (!statObject || typeof statObject !== 'object' || Object.keys(statObject).length === 0) {
            return { labels: [], values: [], percents: [] };
        }
        const labels = Object.keys(statObject);
        const values = Object.values(statObject);
        const total = values.reduce((sum, v) => sum + v, 0) || 1; // 총합이 0일 경우 1로 나누어 0으로 인한 NaN 방지
        const percents = values.map(v => (total === 0 ? 0 : (v / total) * 100)); // total이 0일 경우 0%로 처리
        return { labels, values, percents };
    };

    const processLengthData = (statArray) => {
        // ⭐ [수정] statArray가 배열이 아니거나 비어있으면 빈 데이터를 반환
        if (!Array.isArray(statArray) || statArray.length === 0) {
            return { labels: [], values: [], percents: [] };
        }
        const labels = statArray.map(item => item.lengthSegment || 'N/A'); // ⭐ [수정] item.lengthSegment 없을 경우 대비
        const values = statArray.map(item => item.viewsCount || 0); // ⭐ [수정] item.viewsCount 없을 경우 0으로
        const percents = statArray.map(item => item.percentage || 0); // ⭐ [수정] item.percentage 없을 경우 0으로
        return { labels, values, percents };
    };

    // useMemo 훅 내부에서 statistics가 null일 경우를 대비하여 기본값 {} 또는 [] 제공
    const dayOfWeekData = useMemo(() => processStatData(statistics?.uploadCountByDay || {}), [statistics]);
    const timeZoneData = useMemo(() => processStatData(statistics?.uploadCountByTimeZone || {}), [statistics]);
    const lengthData = useMemo(() => processLengthData(statistics?.avgViewsByLength || []), [statistics]);
    
    const trafficData = useMemo(() => {
        const rawData = statistics?.viewsByTrafficSource || { labels: [], values: [], percents: [] };
        const labels = (rawData.labels || []).map(label => { // ⭐ [수정] rawData.labels가 없을 경우 대비
            switch (label) {
                case 'NO_LINK_OTHER': return '기타 알 수 없음';
                case 'SUBSCRIBER': return '구독자 피드';
                case 'YT_CHANNEL': return '유튜브 채널 페이지';
                case 'YT_SEARCH': return '유튜브 검색';
                case 'RELATED_VIDEO': return '관련 동영상';
                case 'YT_OTHER_PAGE': return '유튜브 다른 페이지';
                case 'EXT_URL': return '외부 URL';
                case 'PLAYLIST': return '재생목록';
                case 'NOTIFICATION': return '알림';
                case 'SHORTS': return '쇼츠 피드';
                default: return label;
            }
        });
        return {
            labels: labels,
            values: rawData.values || [], // ⭐ [수정] values가 없을 경우 빈 배열
            percents: rawData.percents || [] // ⭐ [수정] percents가 없을 경우 빈 배열
        };
    }, [statistics]);

    const deviceData = useMemo(() => {
        const rawData = statistics?.viewsByDevice || { labels: [], values: [], percents: [] };
        const labels = (rawData.labels || []).map(label => { // ⭐ [수정] rawData.labels가 없을 경우 대비
            switch (label) {
                case 'DESKTOP': return '데스크톱';
                case 'TV': return '스마트 TV';
                case 'MOBILE': return '휴대전화';
                case 'TABLET': return '태블릿';
                default: return label;
            }
        });
        return {
            labels: labels,
            values: rawData.values || [], // ⭐ [수정] values가 없을 경우 빈 배열
            percents: rawData.percents || [] // ⭐ [수정] percents가 없을 경우 빈 배열
        };
    }, [statistics]);

    // '영상별 성과 비교' 차트에 사용할 조회수 높은 상위 5개 영상 필터링
    const top5PopularVideosForChart = useMemo(() =>
        [...(allVideos || [])] // ⭐ [수정] allVideos가 없을 경우 빈 배열로 복사
            .sort((a, b) => (b.views || 0) - (a.views || 0)) // 조회수(views) 기준으로 내림차순 정렬
            .slice(0, 5), // 상위 5개만 선택
        [allVideos]
    );

    const latestVideos = useMemo(() =>
        [...(allVideos || [])] // ⭐ [수정] allVideos가 없을 경우 빈 배열로 복사
            .sort((a, b) => new Date(b.uploadDate + 'T' + (b.uploadTime || '00:00')) - new Date(a.uploadDate + 'T' + (a.uploadTime || '00:00')))
            .slice(0, 5),
        [allVideos]);

    // 기존 popularVideos는 그대로 유지 (테이블에서 좋아요 기준으로 인기 영상 표시)
    const popularVideos = useMemo(() =>
        [...(allVideos || [])] // ⭐ [수정] allVideos가 없을 경우 빈 배열로 복사
            .sort((a, b) => (b.likes || 0) - (a.likes || 0))
            .slice(0, 5),
        [allVideos]);

    const renderVideoRow = (v, i) => {
        // ⭐ [추가] 영상 데이터 v가 유효하지 않을 경우 빈 행 반환 또는 로깅
        if (!v || !v.videoId) {
            console.warn("유효하지 않은 영상 데이터:", v);
            return null; // 유효하지 않은 데이터는 렌더링하지 않음
        }
        return (
            <tr key={v.videoId || i}>
                <td><img src={v.thumb || 'placeholder.png'} alt="thumb" className="contents-video-thumb-img" /></td> {/* ⭐ [수정] 썸네일 없을 경우 대비 */}
                <td className="contents-video-title">
                    <a href={v.url || '#'} target="_blank" rel="noopener noreferrer">{v.title || '제목 없음'}</a> {/* ⭐ [수정] URL, 제목 없을 경우 대비 */}
                </td>
                <td>
                    <span>{formatShortDate(v.uploadDate)}<br />{v.uploadTime || '--:--'}</span>
                </td>
                <td>{v.length || 0} 분</td> {/* ⭐ [수정] 길이 없을 경우 대비 */}
                <td>{(v.views || 0).toLocaleString()}</td>
                <td>{(v.likes || 0).toLocaleString()}</td>
                <td>{(v.comments || 0).toLocaleString()}</td>
            </tr>
        );
    };

    // 로딩, 에러, 데이터 없음 상태 메시지 출력
    if (loading) return <p className="contents-loading-message">콘텐츠 데이터를 분석하고 있습니다...</p>;
    if (error) return <p className="contents-error-message">{error}</p>; // ⭐ [수정] 에러 메시지 스타일 변경
    // ⭐ [수정] statistics가 null이고 allVideos도 비어있을 때만 '데이터 없음' 표시
    if (!statistics && allVideos.length === 0) return <p className="contents-loading-message">표시할 콘텐츠 데이터가 없습니다. 채널 정보를 확인하거나 백엔드 데이터를 확인해주세요.</p>;

    // statistics가 부분적으로만 들어왔을 때도 렌더링이 되도록 로직 유지
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
                            {/* ⭐ [추가] top5PopularVideosForChart가 비어있을 경우 차트 대신 메시지 표시 */}
                            {top5PopularVideosForChart.length > 0 ? (
                                <Bar
                                    data={{
                                        labels: top5PopularVideosForChart.map((v) => to2line(v.title)),
                                        datasets: [
                                            { label: '조회수', data: top5PopularVideosForChart.map((v) => v.views || 0), backgroundColor: 'rgba(75,192,192,0.6)', barPercentage: 0.6, },
                                            { label: '좋아요', data: top5PopularVideosForChart.map((v) => v.likes || 0), backgroundColor: 'rgba(153,102,255,0.6)', barPercentage: 0.6, },
                                            { label: '댓글 수', data: top5PopularVideosForChart.map((v) => v.comments || 0), backgroundColor: 'rgba(255,159,64,0.6)', barPercentage: 0.6, },
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
                            ) : (
                                <p className="no-chart-data-message">조회수 데이터를 불러올 수 없거나, 영상이 부족하여 차트를 표시할 수 없습니다.</p>
                            )}
                        </div>
                    </section>
                </div>

                {/* 3분할(요일/시간/길이) 영역 */}
                <div className="contents-grid contents-third">
                    {/* ⭐ [추가] 각 섹션별 데이터가 없을 경우 처리 */}
                    <section className="contents-section">
                        <h2 className="contents-section-title">업로드 요일별 조회수 분포</h2>
                        {dayOfWeekData.labels.length > 0 ? (
                            <ContentsMultiThinBarList labels={dayOfWeekData.labels} values={dayOfWeekData.values} percents={dayOfWeekData.percents} colors={Array(dayOfWeekData.labels.length).fill(barColorDay)} unit="개" />
                        ) : (
                            <p className="no-data-message">데이터 없음</p>
                        )}
                    </section>
                    <section className="contents-section">
                        <h2 className="contents-section-title">업로드 시간대별 조회수 분포</h2>
                        {timeZoneData.labels.length > 0 ? (
                            <ContentsMultiThinBarList labels={timeZoneData.labels} values={timeZoneData.values} percents={timeZoneData.percents} colors={Array(timeZoneData.labels.length).fill(barColorTime)} unit="개" />
                        ) : (
                            <p className="no-data-message">데이터 없음</p>
                        )}
                    </section>
                    <section className="contents-section">
                        <h2 className="contents-section-title">영상 길이별 평균 조회수</h2>
                        {lengthData.labels.length > 0 ? (
                            <ContentsMultiThinBarList labels={lengthData.labels} values={lengthData.values} percents={lengthData.percents} colors={Array(lengthData.labels.length).fill(barColorLen)} unit="회" />
                        ) : (
                            <p className="no-data-message">데이터 없음</p>
                        )}
                    </section>
                </div>

                {/* 유입경로/기기별 분석 영역 */}
                <div className="contents-grid contents-half">
                    <section className="contents-section">
                        <h2 className="contents-section-title">유입경로 분석</h2>
                        {trafficData.labels.length > 0 ? (
                            <>
                                <ContentsStackedBar percents={trafficData.percents} colors={trafficColors} />
                                <ContentsBarValueList labels={trafficData.labels} values={trafficData.values} percents={trafficData.percents} colors={trafficColors} unit="%" />
                            </>
                        ) : (
                            <p className="no-data-message">데이터 없음</p>
                        )}
                    </section>
                    <section className="contents-section">
                        <h2 className="contents-section-title">기기 접속 환경</h2>
                        {deviceData.labels.length > 0 ? (
                            <>
                                <ContentsStackedBar percents={deviceData.percents} colors={deviceColors} />
                                <ContentsBarValueList labels={deviceData.labels} values={deviceData.values} percents={deviceData.percents} colors={deviceColors} unit="회" />
                            </>
                        ) : (
                            <p className="no-data-message">데이터 없음</p>
                        )}
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
                            <tbody>
                                {/* ⭐ [추가] latestVideos가 비어있을 경우 메시지 */}
                                {latestVideos.length > 0 ? (
                                    latestVideos.map(renderVideoRow)
                                ) : (
                                    <tr><td colSpan="7" className="no-data-message">최신 영상 데이터를 불러올 수 없습니다.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </section>
                    <section className="contents-section">
                        <div>
                            <h2 className="contents-section-title" style={{ margin: 0, marginBottom: "1.13rem" }}>인기 영상 목록</h2>
                            <span style={{ display: 'block', textAlign: 'right', fontSize: '0.97rem', color: '#888', fontWeight: 400, marginTop: '-0.7rem', marginBottom: '0.2rem', whiteSpace: 'nowrap' }}>*조회수 상위 5개 영상 기준</span>
                        </div>
                        <table className="contents-video-table">
                            <thead><tr><th>썸네일</th><th>제목</th><th>업로드일</th><th>길이(분)</th><th>조회수</th><th>좋아요</th><th>댓글</th></tr></thead>
                            <tbody>
                                {/* ⭐ [추가] popularVideos가 비어있을 경우 메시지 */}
                                {popularVideos.length > 0 ? (
                                    popularVideos.map(renderVideoRow)
                                ) : (
                                    <tr><td colSpan="7" className="no-data-message">인기 영상 데이터를 불러올 수 없습니다.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </section>
                </div>
            </main>
        </div>
    );
};

export default Contents;