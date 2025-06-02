import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import '../styles/pages/Keyword.css';

// 더미 데이터는 변경없이 그대로 유지됩니다.
const initialDummyWordCloudData = [
    { text: 'React', value: 90 }, { text: 'Spring Boot', value: 85 },
    { text: 'JavaScript', value: 75 }, { text: 'Java', value: 72 },
    { text: '프로젝트', value: 60 }, { text: 'API', value: 65 },
    { text: '데이터베이스', value: 50 }, { text: 'JPA', value: 55 },
    { text: '보안', value: 40 }, { text: '인증', value: 42 },
    { text: '프론트엔드', value: 35 }, { text: '백엔드', value: 38 },
    { text: 'UI/UX', value: 25 }, { text: '테스트', value: 30 },
    { text: '배포', value: 28 }, { text: '클라우드', value: 22 },
    { text: '성능최적화', value: 18 }, { text: 'TypeScript', value: 48 },
    { text: 'Next.js', value: 33 }, { text: 'QueryDSL', value: 26 },
    { text: 'CSS', value: 15 }, { text: 'HTML', value: 12 }, { text: 'Node.js', value: 20 },
    { text: 'Express', value: 17 }, { text: '데이터분석', value: 23 }, { text: '머신러닝', value: 19 },
    { text: 'useEffect', value: 16 }, { text: 'useState', value: 14 }, { text: 'Redux', value: 21 },
    { text: 'MSA', value: 27 }, { text: 'Docker', value: 24 }, { text: 'Kubernetes', value: 20 },
    { text: 'Git', value: 17 }, { text: 'Agile', value: 13 },
];
const dummyRelatedVideos = [
    { id: 1, title: '실전! React와 Spring Boot 연동 프로젝트 구축하기', channel: 'Dev Mentor', views: '12.5만회', date: '25.05.21', thumbnailText: 'R+S', hreflink: "https://www.youtube.com/" },
    { id: 2, title: '유튜브 인기 키워드 분석 및 콘텐츠 전략 2025', channel: '트렌드 분석가', views: '8.9만회', date: '25.05.17', thumbnailText: 'Trend', hreflink: "https://www.google.com/" },
    { id: 3, title: 'Next.js 14 풀스택 앱 개발 완벽 가이드', channel: '코딩천재', views: '6.1만회', date: '25.05.10', thumbnailText: 'Next', hreflink: "https://chatgpt.com/" },
    { id: 4, title: 'Java 백엔드 개발자를 위한 Spring Security 심층 분석', channel: '보안전문가', views: '4.3만회', date: '25.05.01', thumbnailText: 'Java', hreflink: "https://www.naver.com/" },
];
const dummyContentIdeas = [
    '주니어 개발자를 위한 React 상태 관리 라이브러리 비교 분석 (Redux vs Zustand vs Recoil)',
    'Spring Boot + QueryDSL을 활용한 동적 검색 기능 구현 실전 예제',
    'OAuth 2.0과 JWT를 이용한 안전한 API 인증 시스템 설계 및 구현',
    '대규모 트래픽 처리를 위한 Spring WebFlux 기반 반응형 API 서버 만들기',
    '사용자 경험을 극대화하는 UI 애니메이션 적용 가이드 (Framer Motion 활용)',
];

// 단어의 '스타일'만 계산하는 함수는 그대로 활용합니다.
const getWordStyle = (wordData, maxValue, minValue, index) => {
    const { value } = wordData;
    const minFontSize = 12;
    const maxFontSize = 60;
    const normalizedValue = maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue);
    const scaleFactor = Math.pow(normalizedValue, 2.0);
    let fontSize = minFontSize + scaleFactor * (maxFontSize - minFontSize);

    let color;
    let fontWeight = 500;
    const colorThreshold = maxValue * 0.30;

    if (value >= colorThreshold) {
        const hue = (index * 137.508 + 180) % 360;
        const saturation = 50 + normalizedValue * 40;
        const lightness = 45 - normalizedValue * 15;
        color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
        fontWeight = fontSize > maxFontSize * 0.5 ? 700 : 600;
    } else {
        color = '#6b7280';
        fontWeight = 400;
    }

    return {
        fontSize: `${fontSize}px`,
        color: color,
        fontWeight: fontWeight,
        padding: `${fontSize / 8}px ${fontSize / 4}px`,
        margin: '5px',
        display: 'inline-block',
        borderRadius: '8px',
        lineHeight: '1',
        whiteSpace: 'nowrap',
        transition: 'transform 0.2s ease',
        cursor: 'pointer',
    };
};

const WordCloudComponent = ({ wordsData, containerId }) => {
    if (!wordsData || wordsData.length === 0) {
        return null;
    }

    const values = wordsData.map(w => w.value);
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, 0);

    return (
        <div className="cloud-box-js">
            {wordsData.map((word, index) => {
                const style = getWordStyle(word, maxValue, minValue, index);
                return (
                    <span key={`${containerId}-${index}`} className="word-item-js" style={style}>
                        {word.text}
                    </span>
                );
            })}
        </div>
    );
};

const Keyword = () => {
    const [sortedChannelWords, setSortedChannelWords] = useState([]);
    const [sortedVideoWords, setSortedVideoWords] = useState([]);

    useEffect(() => {
        const allWords = [...initialDummyWordCloudData].sort((a, b) => b.value - a.value);
        setSortedChannelWords(allWords.slice(0, 10));
        setSortedVideoWords(allWords.slice(0, 10));
    }, []);

    return (
        <div className="keyword-container">
            {/* ▼▼▼ [수정됨] 다른 페이지와 구조를 맞추기 위한 래퍼(wrapper) 추가 ▼▼▼ */}
            <div className="main-content-area">
                <header>
                    <h1>키워드 분석</h1>
                    <input type="text" placeholder="분석할 키워드를 입력하세요..." />
                </header>
                <main className="keyword-main">
                    <section className='keyword-section-lable'>
                        <h2>채널 영상 키워드</h2>
                        <section className="keyword-section-wordcloud">
                            <WordCloudComponent wordsData={sortedVideoWords} containerId="video-cloud" />
                        </section>
                    </section>
                    <section className='keyword-section-lable'>
                        <h2>채널 키워드</h2>
                        <section className="keyword-section-wordcloud">
                            <WordCloudComponent wordsData={sortedChannelWords} containerId="channel-cloud" />
                        </section>
                    </section>
                    <section className="keyword-section keyword-section1">
                        <h2>연관 인기 동영상</h2>
                        <div className="list-box video-list-box">
                            {dummyRelatedVideos.map(video => (
                                <a key={video.id} className="list-card video-card" href={video.hreflink}>
                                    <div className="video-thumbnail-placeholder">
                                        <span>{video.thumbnailText || video.title.substring(0, 2)}</span>
                                    </div>
                                    <div className="list-card-content">
                                        <h4 className="list-card-title">{video.title}</h4>
                                        <p className="list-card-meta">{video.channel}</p>
                                        <p className="list-card-meta secondary">조회수 {video.views}</p>
                                        <p className="list-card-meta secondary">게시일 {video.date}</p>
                                    </div>
                                </a>
                            ))}
                        </div>
                    </section>
                    <section className="keyword-section keyword-section2">
                        <h2>추천 콘텐츠 아이디어</h2>
                        <div className="list-box idea-list-box">
                            {dummyContentIdeas.map((idea, idx) => (
                                <div key={idx} className="list-card idea-card">
                                    <div className="idea-icon-placeholder"><span>💡</span></div>
                                    <div className="list-card-content">
                                        <p className="idea-text">{idea}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                </main>
            </div>
        </div>
    );
};

export default Keyword;
