import React, { useEffect, useRef } from 'react';
import '../styles/pages/Ai.css';

// ✅ 재사용 가능한 애니메이션 막대그래프
const AnimatedBar = ({ percentage, color = '#6366f1' }) => {
  const barRef = useRef();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (barRef.current) {
        barRef.current.style.width = `${percentage}%`;
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [percentage]);

  return (
    <div className="progress-bar-container">
      <div
        className="progress-bar"
        ref={barRef}
        style={{ backgroundColor: color }}
      ></div>
    </div>
  );
};

const Ai = () => {
  return (
    <div className="ai-container" id="ai-page">
      <header className="ai-header">
        <h1>AI 콘텐츠 전략 코치</h1>
        <input type="text" placeholder="전략 검색..." />
      </header>

      <main className="ai-main">
        <section className="ai-section">
          <h2>콘텐츠 인사이트 요약</h2>
          <div className="insight-grid">
            <div className="insight-box">
              <h3>인기 키워드</h3>
              <ul>
                <li><strong>일상 브이로그</strong>: 17회 등장</li>
                <li><strong>힐링</strong>: 13회</li>
                <li><strong>공감</strong>: 11회</li>
                <li><strong>루틴</strong>: 9회</li>
              </ul>
            </div>

            <div className="insight-box">
              <h3>감정 반응 비율</h3>
              <ul>
                <li>
                  긍정: <AnimatedBar percentage={78} color="#22c55e" /> <span className="positive">78%</span>
                </li>
                <li>
                  중립: <AnimatedBar percentage={12} color="#facc15" /> <span className="neutral">12%</span>
                </li>
                <li>
                  부정: <AnimatedBar percentage={10} color="#ef4444" /> <span className="negative">10%</span>
                </li>
              </ul>
              <p className="note">* 댓글 감정 분석 기반</p>
            </div>

            <div className="insight-box">
              <h3>성과 요약</h3>
              <ul>
                <li>
                  평균 조회수: <AnimatedBar percentage={67} /> <strong>1,350회</strong>
                </li>
                <li>
                  시청 유지율: <AnimatedBar percentage={47} /> <strong>47%</strong>
                </li>
                <li>
                  썸네일 클릭률: <AnimatedBar percentage={56} /> <strong>5.6%</strong>
                </li>
              </ul>
              <p className="note">* 최근 5개 영상 기준</p>
            </div>
          </div>

          <div className="summary-box">
            최근 영상에서 <strong>‘힐링·공감형 콘텐츠’</strong>가 높은 반응을 유도하고 있으며,
            특히 <span>직장인 대상 루틴 브이로그</span>에서
            <span className="highlight">긍정 반응 비율 80% 이상</span>으로 우세한 성과를 보였습니다.
            클릭률 또한 해당 콘텐츠에서 평균보다 <span className="highlight">+2.3%</span> 높게 나타났습니다.
          </div>
        </section>

        <section className="ai-section">
          <h2>GPT 기반 전략 제안</h2>
          <div className="strategy-grid">
            <div className="strategy-box">
              <h3>콘텐츠 기획 전략</h3>
              <ul>
                <li>공감 스토리 기반의 브이로그 추천 (직장인 대상)</li>
                <li>루틴 소개 콘텐츠: 아침 루틴 / 퇴근 후 브이로그</li>
                <li>실생활 팁 공유: ‘오늘 뭐먹지’, ‘하루 루틴’ 등</li>
              </ul>
            </div>
            <div className="strategy-box">
              <h3>업로드 최적 시간</h3>
              <ul>
                <li>화요일 오후 6시 ~ 8시: 조회수 상승 타이밍</li>
                <li>금요일 오전 11시: 노출률 증가 경향</li>
                <li>일요일 오전은 휴식 콘텐츠 집중 추천</li>
              </ul>
            </div>
            <div className="strategy-box">
              <h3>감성 편집 전략</h3>
              <ul>
                <li>잔잔한 브금 사용 시 댓글 반응 20%↑</li>
                <li>따뜻한 색감 / 부드러운 전환 효과 활용</li>
                <li>자막에 감성 키워드 삽입 (“포근함”, “위로” 등)</li>
              </ul>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Ai;
