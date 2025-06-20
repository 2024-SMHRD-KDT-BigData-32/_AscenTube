import React, { useEffect, useRef, useState } from 'react';
import '../styles/pages/Comment.css';

const allComments = [];

const CommentListModal = ({ category, categoryLabel, comments, onClose }) => {
  if (!category) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-header cat-${category}`}>
          <h3>{categoryLabel} 댓글 전체 보기 ({comments.length}개)</h3>
          <button onClick={onClose} className="modal-close-button">&times;</button>
        </div>
        <div className="modal-body">
          {comments.length > 0 ? (
            <ul>
              {comments.map(comment => (
                <li key={comment.id}>{comment.text}</li>
              ))}
            </ul>
          ) : (
            <p className="no-comments">해당 카테고리의 댓글이 없습니다.</p>
          )}
        </div>
      </div>
    </div>
  );
};


const AnimatedSentimentBar = ({ percentages, categoryLabels, onBarHover, onBarLeave, onBarClick }) => {
  const refs = {
    praise: useRef(null), criticism: useRef(null), info: useRef(null),
    question: useRef(null), emotion: useRef(null), request: useRef(null), etc: useRef(null),
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
        if (percentage > 15) { labelText = `${categoryLabels[cat]} ${percentage}%`; }
        else if (percentage > 5) { labelText = `${percentage}%`; }
        else { labelText = ''; }
        return (
          <div
            key={cat} ref={refs[cat]} className={`bar cat-${cat}`} style={{ width: '0%' }}
            title={`${categoryLabels[cat]} ${percentage}%`}
            onMouseEnter={(e) => onBarHover(cat, e)}
            onMouseLeave={onBarLeave}
            onClick={() => onBarClick(cat)}
          >
            <span>{labelText}</span>
          </div>
        );
      })}
    </div>
  );
};


const Comment = () => {
  const categoryLabels = {
    praise: '칭찬', criticism: '비판', info: '정보', question: '질문',
    emotion: '감정', request: '요청', etc: '기타',
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
    commentList: [],
    keywords: [],
    // ✅ 추가: 인기 댓글 분석을 위한 데이터 항목 추가
    popularComments: [],
  };

  const [tooltipContent, setTooltipContent] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0, opacity: 0 });
  const tooltipSectionRef = useRef(null);

  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryComments, setCategoryComments] = useState([]);

  const handleBarHover = (category, event) => {
    const representativeComment = analysisData.representativeComments.find(c => c.category === category);
    if (representativeComment && tooltipSectionRef.current) {
      const barRect = event.currentTarget.getBoundingClientRect();
      const sectionRect = tooltipSectionRef.current.getBoundingClientRect();
      const left = (barRect.left + barRect.width / 2) - sectionRect.left;
      const top = barRect.bottom - sectionRect.top + 15;
      setTooltipContent(representativeComment);
      setTooltipPosition({ top, left, opacity: 1 });
    }
  };

  const handleBarLeave = () => {
    setTooltipPosition(prev => ({ ...prev, opacity: 0 }));
  };

  const handleBarClick = (category) => {
    const filteredComments = allComments.filter(comment => comment.category === category);
    setCategoryComments(filteredComments);
    setSelectedCategory(category);
  };

  const handleCloseModal = () => {
    setSelectedCategory(null);
    setCategoryComments([]);
  };

  return (
    <div className="comment-container">
      <header className="comment-header">
        <h1>댓글 상세 분석</h1>
        <input type="text" placeholder="댓글 내용, 작성자 등으로 검색" />
      </header>

      <main className="comment-main">
        <section
          className="comment-section"
          ref={tooltipSectionRef}
          style={{ zIndex: tooltipContent ? 20 : 'auto' }}
        >
          <h2>댓글 유형 비율</h2>
          <AnimatedSentimentBar
            percentages={analysisData.percentages}
            categoryLabels={categoryLabels}
            onBarHover={handleBarHover}
            onBarLeave={handleBarLeave}
            onBarClick={handleBarClick}
          />
          {tooltipContent && (
            <div className="representative-comment-tooltip" style={tooltipPosition}>
              <p className="tooltip-title">{tooltipContent.title}</p>
              <p className="tooltip-text">"{tooltipContent.text}"</p>
            </div>
          )}
        </section>

        {/* ✅ 수정: '핵심 키워드 분석' 섹션을 위로 이동 */}
        <section className="comment-section">
          <h2>핵심 키워드 분석</h2>
          {analysisData.keywords.length > 0 ? (
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
          ) : (
            <p className="no-comments">분석된 키워드가 없습니다.</p>
          )}
        </section>
        
        {/* ✅ 추가: '최근 댓글'과 '인기 댓글'을 나란히 배치하기 위한 wrapper div */}
        <div className="side-by-side-sections">
            <section className="comment-section">
                <h2>최근 댓글 분석</h2>
                {analysisData.commentList.length > 0 ? (
                    <ul className="comment-list">
                    {analysisData.commentList.map((comment, index) => (
                        <li key={index}>
                        <span className={`tag cat-${comment.category}`}>[{categoryLabels[comment.category]}]</span>
                        <p>{comment.text}</p>
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p className="no-comments">최근 분석된 댓글이 없습니다.</p>
                )}
            </section>

            {/* ✅ 추가: '인기 댓글 분석' 섹션 새로 생성 */}
            <section className="comment-section">
                <h2>인기 댓글 분석</h2>
                {analysisData.popularComments.length > 0 ? (
                    <ul className="comment-list">
                    {analysisData.popularComments.map((comment, index) => (
                        <li key={index}>
                        {/* 인기 댓글에 맞는 데이터 구조를 나중에 정의하면 됩니다. */}
                        <p>{comment.text}</p> 
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p className="no-comments">인기 댓글이 없습니다.</p>
                )}
            </section>
        </div>
      </main>

      <CommentListModal
        category={selectedCategory}
        categoryLabel={selectedCategory ? categoryLabels[selectedCategory] : ''}
        comments={categoryComments}
        onClose={handleCloseModal}
      />
    </div>
  );
};

export default Comment;