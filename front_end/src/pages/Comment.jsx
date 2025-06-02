import React, { useEffect, useRef } from 'react';
import '../styles/pages/Comment.css';

// 1. AnimatedSentimentBar는 이제 categoryLabels를 props로 전달받습니다.
const AnimatedSentimentBar = ({ percentages, categoryLabels }) => {
  const refs = {
    praise: useRef(null),
    criticism: useRef(null),
    info: useRef(null),
    question: useRef(null),
    emotion: useRef(null),
    request: useRef(null),
    etc: useRef(null),
  };

  useEffect(() => {
    requestAnimationFrame(() => {
      for (const key in percentages) {
        if (refs[key].current) {
          refs[key].current.style.width = `${percentages[key]}%`;
        }
      }
    });
  }, [percentages, refs]);

  const categoryOrder = ['praise', 'criticism', 'info', 'question', 'emotion', 'request', 'etc'];

  return (
    <div className="sentiment-bar-container">
      {categoryOrder.map(cat => {
        const percentage = percentages[cat];
        let labelText;
        if (percentage > 15) {
          labelText = `${categoryLabels[cat]} ${percentage}%`;
        } else if (percentage > 5) {
          labelText = `${percentage}%`;
        } else {
          labelText = '';
        }
        return (
          <div
            key={cat}
            ref={refs[cat]}
            className={`bar cat-${cat}`}
            style={{ width: '0%' }}
            title={`${categoryLabels[cat]} ${percentage}%`}
          >
            <span>{labelText}</span>
          </div>
        );
      })}
    </div>
  );
};


const Comment = () => {
  // 2. categoryLabels 객체를 Comment 컴포넌트에서 정의합니다.
  const categoryLabels = {
    praise: '칭찬',
    criticism: '비판',
    info: '정보',
    question: '질문',
    emotion: '감정',
    request: '요청',
    etc: '기타',
  };

  const analysisData = {
    percentages: { praise: 30, criticism: 15, info: 20, question: 10, emotion: 10, request: 10, etc: 5, },
    representativeComments: [
      { category: 'praise', icon: '👍', title: '대표 칭찬 댓글', text: '설명이 귀에 쏙쏙 들어와요! 구독하고 갑니다~' },
      { category: 'criticism', icon: '🤔', title: '대표 비판 댓글', text: '이전 영상이랑 내용이 거의 비슷한 것 같아요. 좀 아쉽네요.' },
      { category: 'info', icon: '💡', title: '대표 정보 댓글', text: '영상에 나온 제품 정보는 더보기란에 있습니다.' },
      { category: 'question', icon: '❓', title: '대표 질문 댓글', text: '혹시 BGM 정보 알 수 있을까요?' },
      { category: 'emotion', icon: '😄', title: '대표 감정표현 댓글', text: 'ㅋㅋㅋㅋㅋ 너무 웃겨요!!' },
      { category: 'request', icon: '🙏', title: '대표 요청 댓글', text: '다음엔 OO도 한번 다뤄주세요!' },
      { category: 'etc', icon: '📋', title: '대표 기타 댓글', text: '영상 잘 보고 갑니다.' },
    ],
    commentList: [
        { category: 'praise', text: '늘 좋은 영상 감사합니다. 덕분에 많이 배우고 있어요.' },
        { category: 'info', text: '참고로 저건 OOO이라고 합니다. 찾아보시면 좋을 듯!' },
        { category: 'question', text: '영상에서 사용하신 폰트가 뭔가요? 너무 예뻐요.' },
        { category: 'criticism', text: '광고가 너무 많아서 흐름이 끊기는 느낌이에요.' },
        { category: 'request', text: '시간 괜찮으시면 자막도 추가해주실 수 있을까요?' },
    ],
    keywords: [
      { text: '구독', value: 80, category: 'praise' }, { text: '설명', value: 70, category: 'praise' },
      { text: '아쉽다', value: 65, category: 'criticism' }, { text: '정보', value: 75, category: 'info' },
      { text: 'BGM', value: 60, category: 'question' }, { text: 'ㅋㅋㅋ', value: 85, category: 'emotion' },
      { text: '다음편', value: 68, category: 'request' }, { text: '자막', value: 55, category: 'request' },
      { text: '광고', value: 72, category: 'criticism' }, { text: '감사합니다', value: 90, category: 'praise' },
    ],
  };

  return (
    <div className="comment-container">
      <header className="comment-header">
        <h1>댓글 상세 분석</h1>
        <input type="text" placeholder="댓글 내용, 작성자 등으로 검색" />
      </header>

      <main className="comment-main">
        <section className="comment-section">
          <h2>📊 댓글 유형 비율</h2>
          {/* 3. AnimatedSentimentBar에 props로 categoryLabels를 전달합니다. */}
          <AnimatedSentimentBar percentages={analysisData.percentages} categoryLabels={categoryLabels} />
        </section>

        <div className="card-grid">
          {analysisData.representativeComments.map(comment => (
            <div key={comment.category} className={`card cat-${comment.category}`}>
              <h3>{comment.icon} {comment.title}</h3>
              <p>“{comment.text}”</p>
            </div>
          ))}
        </div>

        <section className="comment-section">
          <h2>📝 최근 댓글 분석</h2>
          <ul className="comment-list">
             {/* --- ▼▼▼ 바로 이 부분을 수정했습니다 ▼▼▼ --- */}
            {analysisData.commentList.map((comment, index) => (
                <li key={index}>
                    {/* 4. categoryLabels 객체를 사용하여 영문 key를 한글 이름으로 변환합니다. */}
                    <span className={`tag cat-${comment.category}`}>[{categoryLabels[comment.category]}]</span>
                    <p>{comment.text}</p>
                </li>
            ))}
          </ul>
        </section>

        <section className="comment-section">
          <h2>🧠 핵심 키워드 분석</h2>
          <div className="cloud-box">
            {analysisData.keywords.map((keyword, index) => {
              const keywordStyle = {
                fontSize: `${12 + keyword.value * 0.45}px`,
                fontWeight: 400 + Math.round(keyword.value / 100 * 5) * 100,
              };
              return (
                <span key={index} className={`cloud-word cat-${keyword.category}`} style={keywordStyle}>
                  {keyword.text}
                </span>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
};

export default Comment;
