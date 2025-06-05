import React, { useEffect, useState, useLayoutEffect, useRef } from 'react';
import '../styles/pages/Keyword.css';

// 더미 데이터 (키워드 개수 테스트를 위해 일부 유지 및 추가)
const initialDummyWordCloudData = [
  { text: 'React', value: 90 }, { text: 'Spring Boot', value: 85 },
  { text: 'JavaScript', value: 75 }, { text: 'Java', value: 72 },
  { text: '프로젝트', value: 60 }, { text: 'API', value: 65 },
  { text: '데이터베이스', value: 50 }, { text: 'JPA', value: 55 },
  { text: '보안', value: 40 }, { text: '인증', value    : 42 },
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
  { id: 1, title: '실전! React와 Spring Boot 연동 프로젝트 구축하기', channel: 'Dev Mentor', views: '12.5만회', date: '25.05.21', thumbnailText: 'R+S', hreflink:"https://www.youtube.com/"},
  { id: 2, title: '유튜브 인기 키워드 분석 및 콘텐츠 전략 2025', channel: '트렌드 분석가', views: '8.9만회', date: '25.05.17', thumbnailText: 'Trend' ,hreflink:"https://www.google.com/"},
  { id: 3, title: 'Next.js 14 풀스택 앱 개발 완벽 가이드', channel: '코딩천재', views: '6.1만회', date: '25.05.10', thumbnailText: 'Next' ,hreflink:"https://chatgpt.com/"},
  { id: 4, title: 'Java 백엔드 개발자를 위한 Spring Security 심층 분석', channel: '보안전문가', views: '4.3만회', date: '25.05.01', thumbnailText: 'Java' ,hreflink:"https://www.naver.com/"},
];

const dummyContentIdeas = [
    '주니어 개발자를 위한 React 상태 관리 라이브러리 비교 분석 (Redux vs Zustand vs Recoil)',
    'Spring Boot + QueryDSL을 활용한 동적 검색 기능 구현 실전 예제',
    'OAuth 2.0과 JWT를 이용한 안전한 API 인증 시스템 설계 및 구현',
    '대규모 트래픽 처리를 위한 Spring WebFlux 기반 반응형 API 서버 만들기',
    '사용자 경험을 극대화하는 UI 애니메이션 적용 가이드 (Framer Motion 활용)',
];

const getInitialWordStyle = (wordData, maxValue, minValue, index, totalWords) => {
  const { value } = wordData;
  const minFontSize = 10;
  const maxFontSize = 85; // 최대 폰트 크기 상향
  const normalizedValue = maxValue === minValue ? 0.5 : (value - minValue) / (maxValue - minValue);
  const scaleFactor = Math.pow(normalizedValue, 3.0); // 크기 차이 더 명확하게
  let fontSize = minFontSize + scaleFactor * (maxFontSize - minFontSize);
  fontSize = Math.max(minFontSize, Math.min(fontSize, maxFontSize));

  let color;
  let fontWeight = 400;
  let textStroke = '';
  let zIndex = Math.floor(normalizedValue * 20); // z-index 범위

  const colorThreshold = maxValue * 0.30; // 상위 약 70% 빈도수 키워드에만 색상 적용

  if (value >= colorThreshold) {
    const hue = (index * 137.508 + 60) % 360; // 시작 hue 및 골든앵글
    const saturation = 60 + normalizedValue * 35; // 채도 범위 조정
    const lightness = 50 - normalizedValue * 10;  // 빈도 높을수록 약간 어둡게
    color = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
    fontWeight = fontSize > maxFontSize * 0.45 ? 600 : 500;

    if (value >= maxValue * 0.75) { // 상위 25%에 외곽선
      textStroke = `1.5px rgba(0, 0, 0, 0.35)`; // 외곽선 색상 및 두께 조정
      fontWeight = 700;
      zIndex = 30 + index;
    }
  } else {
    color = '#9e9e9e'; // 빈도 낮은 키워드는 더 연한 회색 (가독성 고려)
    fontWeight = 300;
    fontSize = Math.max(minFontSize, fontSize * 0.85); // 더 작지만 너무 작지 않게
  }

  return {
    fontSize: `${fontSize}px`,
    color: color,
    fontWeight: fontWeight,
    padding: `${Math.min(fontSize / 12, 3)}px ${Math.min(fontSize / 7, 6)}px`, // 패딩 미세조정
    margin: '1px',
    display: 'inline-block',
    borderRadius: '4px', // 모서리 약간 덜 둥글게
    lineHeight: '1',
    whiteSpace: 'nowrap',
    WebkitTextStroke: textStroke,
    textShadow: textStroke ? `0px 0px 2px hsla(${ (index * 137.508 + 60) % 360}, 100%, 80%, 0.3)`: 'none', // 부드러운 텍스트 그림자
    opacity: 0,
    transition: 'opacity 0.7s ease-out, transform 0.7s cubic-bezier(0.23, 1, 0.32, 1)', // 부드러운 등장
    zIndex: zIndex,
    transform: 'scale(0.6) translateY(15px)', // 초기 애니메이션 상태
  };
};

const WordCloudComponent = ({ wordsData, containerId }) => {
  const [positionedWords, setPositionedWords] = useState([]);
  const containerRef = useRef(null);

  useEffect(() => {
    const values = wordsData.map(w => w.value);
    const maxValue = Math.max(...values, 0);
    const minValue = Math.min(...values, 0);

    const wordsWithStyleAndMeasure = wordsData.map((word, index) => {
      const style = getInitialWordStyle(word, maxValue, minValue, index, wordsData.length);

      const el = document.createElement('span');
      Object.assign(el.style, style);
      el.style.opacity = '0';
      el.style.position = 'absolute';
      el.style.left = '-9999px';
      el.style.visibility = 'hidden';
      el.innerText = word.text;
      document.body.appendChild(el);
      const measuredWidth = el.offsetWidth;
      const measuredHeight = el.offsetHeight;
      document.body.removeChild(el);

      return {
        ...word,
        id: `${containerId}-word-${index}`,
        initialStyle: style,
        finalStyle: {},
        measuredWidth,
        measuredHeight,
      };
    });

    setPositionedWords(wordsWithStyleAndMeasure);
  }, [wordsData, containerId]);

  useLayoutEffect(() => {
    if (!containerRef.current || positionedWords.length === 0 || positionedWords.some(pw => !pw.measuredWidth)) {
      return;
    }

    const container = containerRef.current;
    const containerWidth = container.offsetWidth;
    const containerHeight = container.offsetHeight;
    const centerX = containerWidth / 2;
    const centerY = containerHeight / 2;

    const finalPlacedWords = [];
    let currentGlobalAngle = Math.random() * Math.PI * 2;
    const spiralDensity = 0.7;
    const radiusStepGrowth = Math.min(containerWidth, containerHeight) * 0.015;

    const wordsToPlace = [...positionedWords];

    for (let i = 0; i < wordsToPlace.length; i++) {
      const word = wordsToPlace[i];
      let attempt = 0;
      const MAX_ATTEMPTS = 80;
      let placed = false;
      let x = 0, y = 0;

      let attemptAngle = currentGlobalAngle;

      const allValues = wordsData.map(w => w.value);
      const overallMinValue = Math.min(...allValues, 0);
      const overallMaxValue = Math.max(...allValues, 1);
      const normalizedValue = (word.value - overallMinValue) / (overallMaxValue - overallMinValue || 1);

      let currentWordRadius = (Math.sqrt(i + 1) * radiusStepGrowth * (1 + (1 - normalizedValue) * 1.5));

      if (i === 0) currentWordRadius = word.measuredHeight * 0.3;
      else if (i === 1) currentWordRadius = word.measuredHeight * 0.8;
      else if (i === 2) currentWordRadius = word.measuredHeight * 1.2;

      while (attempt < MAX_ATTEMPTS && !placed) {
        x = centerX + currentWordRadius * Math.cos(attemptAngle) - word.measuredWidth / 2;
        y = centerY + currentWordRadius * Math.sin(attemptAngle) - word.measuredHeight / 2;

        const R_PADDING = 10;
        const hitBoundary = (
          x < R_PADDING || x + word.measuredWidth > containerWidth - R_PADDING ||
          y < R_PADDING || y + word.measuredHeight > containerHeight - R_PADDING
        );

        let overlapping = false;
        if (!hitBoundary) {
          for (const placedWord of finalPlacedWords) {
            if (
              x < placedWord.x + placedWord.width &&
              x + word.measuredWidth > placedWord.x &&
              y < placedWord.y + placedWord.height &&
              y + word.measuredHeight > placedWord.y
            ) {
              overlapping = true;
              break;
            }
          }
        }

        if (!overlapping && !hitBoundary) {
          finalPlacedWords.push({
            ...word, x, y, width: word.measuredWidth, height: word.measuredHeight,
            finalStyle: {
              ...word.initialStyle,
              position: 'absolute',
              left: `${x}px`,
              top: `${y}px`,
              opacity: 1,
              transform: 'scale(1) rotate(0deg)',
            },
          });
          placed = true;
        } else {
          attemptAngle += 0.15 + Math.random() * 0.2;
          currentWordRadius += radiusStepGrowth * (0.1 + Math.random() * 0.25 + (attempt / MAX_ATTEMPTS));
          if (currentWordRadius > Math.min(containerWidth, containerHeight) * 0.7) {
            currentWordRadius = Math.min(containerWidth, containerHeight) * (0.05 + Math.random() * 0.15) * (i < 5 ? 1 : 2);
            attemptAngle += Math.PI / (2 + Math.random() * 2);
          }
        }
        attempt++;
      }

      if (!placed) {
        const fallbackX = centerX - word.measuredWidth / 2 + (Math.random() - 0.5) * 20;
        const fallbackY = centerY - word.measuredHeight / 2 + (Math.random() - 0.5) * 20;
        finalPlacedWords.push({
          ...word, x: fallbackX, y: fallbackY, width: word.measuredWidth, height: word.measuredHeight,
          finalStyle: {
            ...word.initialStyle,
            position: 'absolute',
            left: `${fallbackX}px`,
            top: `${fallbackY}px`,
            opacity: 1,
            transform: 'scale(1) rotate(0deg)',
          },
        });
      }

      currentGlobalAngle += (spiralDensity / (currentWordRadius * 0.08 + 1)) + (Math.random() - 0.5) * 0.1;
    }

    setPositionedWords(finalPlacedWords);
  }, [JSON.stringify(positionedWords.map(p => p.id))]);

  return (
    <div ref={containerRef} className="cloud-box-js">
      {positionedWords.map((word) => (
        <span
          key={word.id}
          className="word-item-js"
          style={word.finalStyle.left ? word.finalStyle : word.initialStyle}
        >
          {word.text}
        </span>
      ))}
    </div>
  );
};




const Keyword = () => {
  const [sortedChannelWords, setSortedChannelWords] = useState([]);
  const [sortedVideoWords, setSortedVideoWords] = useState([]);

  useEffect(() => {
    const allWords = [...initialDummyWordCloudData].sort((a, b) => b.value - a.value);
    setSortedChannelWords(allWords.slice(0, 15)); // 채널 전체: 상위 15개
    setSortedVideoWords(allWords.slice(0, 10));   // 영상별: 상위 10개
  }, []);


  return (
    <div className="keyword-container">
      <header className="keyword-header">
        <h1>키워드 분석</h1>
        <div className="keyword-search-wrapper">
          <input type="text" placeholder="분석할 키워드를 입력하세요..." />
          <button className="search-button">분석</button>
        </div>
      </header>

      <main className="keyword-main">

        <section className='keyword-section-lable'>
          <h2>Video Keywords</h2>
          <section className="keyword-section-wordcloud">
            {/* <p>설명글 제거</p> */}
            {sortedVideoWords.length > 0 &&
              <WordCloudComponent wordsData={sortedVideoWords} containerId="video-cloud"  />}
          </section>
        </section>
          <section className='keyword-section-lable'>
            <h2>Channel Keyword</h2>
            <section className="keyword-section-wordcloud">
            {/* <p>설명글 제거</p> */}
            {sortedChannelWords.length > 0 &&
              <WordCloudComponent wordsData={sortedChannelWords} containerId="channel-cloud"/>}
          </section>
        </section>
        

        

        <section className="keyword-section keyword-section1">
          <h2>연관 인기 동영상</h2>
          {/* <p>설명글 제거</p> */}
          <div className="list-box video-list-box">
            {dummyRelatedVideos.map(video => (
              <a key={video.id} className="list-card video-card" href ={video.hreflink}>
                <div className="video-thumbnail-placeholder">
                  <span>{video.thumbnailText || video.title.substring(0,2)}</span>
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
          {/* <p>설명글 제거</p> */}
          <div className="list-box idea-list-box">
            {dummyContentIdeas.map((idea, idx, hreflink) => (
              <div key={idx} className="list-card idea-card">
                <div className="idea-icon-placeholder">
                  <span>💡</span>
                </div>
                <div className="list-card-content">
                  <p className="idea-text">{idea}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Keyword;