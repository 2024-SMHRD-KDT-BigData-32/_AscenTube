import React, { useEffect, useRef } from 'react';
import '../styles/pages/Comment.css';

const AnimatedSentimentBar = ({ positive, neutral, negative }) => {
  const posRef = useRef();
  const neuRef = useRef();
  const negRef = useRef();

  useEffect(() => {
    requestAnimationFrame(() => {
      if (posRef.current) posRef.current.style.width = `${positive}%`;
      if (neuRef.current) neuRef.current.style.width = `${neutral}%`;
      if (negRef.current) negRef.current.style.width = `${negative}%`;
    });
  }, [positive, neutral, negative]);

  return (
    <div className="sentiment-bar-container">
      <div
        className="bar positive-bar"
        ref={posRef}
        style={{ width: 0 }}
      >
        <span className="bar-label">{positive}%</span>
      </div>
      <div
        className="bar neutral-bar"
        ref={neuRef}
        style={{ width: 0 }}
      >
        <span className="bar-label">{neutral}%</span>
      </div>
      <div
        className="bar negative-bar"
        ref={negRef}
        style={{ width: 0 }}
      >
        <span className="bar-label">{negative}%</span>
      </div>
    </div>
  );
};

const Comment = () => {
  return (
    <div className="comment-container">
      <header className="comment-header">
        <h1>댓글 감성 분석</h1>
        <input type="text" placeholder="댓글 검색" />
      </header>

      <main className="comment-main">
        {/* 감성 비율 */}
        <section className="comment-section">
          <h2>감성 비율</h2>
          <AnimatedSentimentBar positive={72} neutral={10} negative={18} />
        </section>

        {/* 대표 댓글 카드 */}
        <section className="card-grid">
          <div className="card positive">
            <h3>😊 대표 긍정 댓글</h3>
            <p>“이번 영상 너무 힐링됐어요! 다음 편도 기대할게요!”</p>
          </div>
          <div className="card neutral">
            <h3>😐 대표 중립 댓글</h3>
            <p>“그냥 그랬어요. 무난한 편이네요.”</p>
          </div>
          <div className="card negative">
            <h3>😠 대표 부정 댓글</h3>
            <p>“편집이 너무 어수선해서 보기 불편했어요...”</p>
          </div>
        </section>

        {/* 댓글 목록 */}
        <section className="comment-section">
          <h2>댓글 목록 (최근 분석)</h2>
          <ul className="comment-list">
            <li>
              <span className="tag tag-positive">[긍정]</span>
              <p>진짜 유익한 영상이네요. 요약도 잘 되어 있고 최고입니다!</p>
            </li>
            <li>
              <span className="tag tag-neutral">[중립]</span>
              <p>그럭저럭 봐줄만 했습니다. 추천까지는 애매해요.</p>
            </li>
            <li>
              <span className="tag tag-negative">[부정]</span>
              <p>목소리가 너무 작아서 잘 안 들려요. 자막이라도 넣어주세요.</p>
            </li>
          </ul>
        </section>

        {/* 감성 키워드 시각화 */}
        <section className="comment-section">
          <h2>🧠 감정 키워드 분석</h2>
          <div className="cloud-box">
            [감성 키워드 워드클라우드 또는 빈도 시각화]
          </div>
        </section>

      </main>
    </div>
  );
};

export default Comment;
