// src/pages/Comment.jsx

import React, { useEffect, useRef, useState } from 'react';
// import PageLayout from '../layouts/PageLayout'; //  문제의 원인으로 추정되는 부분을 임시로 주석 처리합니다.
import '../styles/pages/Comment.css';
import '../styles/layouts/PageLayout.css'; // PageLayout의 CSS는 임시로 직접 가져와서 사용합니다.

// --- Helper Components ---
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
                        <ul>{comments.map((comment, index) => <li key={index}>{comment.text}</li>)}</ul>
                    ) : <p className="no-comments">해당 카테고리의 댓글이 없습니다.</p>}
                </div>
            </div>
        </div>
    );
};

const AnimatedSentimentBar = ({ percentages, categoryLabels, onBarHover, onBarLeave, onBarClick }) => {
    const refs = { praise: useRef(null), criticism: useRef(null), info: useRef(null), question: useRef(null), emotion: useRef(null), request: useRef(null), etc: useRef(null) };
    useEffect(() => {
        requestAnimationFrame(() => {
            for (const key in percentages) {
                if (refs[key]?.current) {
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
                let labelText = '';
                if (percentage > 15) { labelText = `${categoryLabels[cat]} ${percentage}%`; }
                else if (percentage > 5) { labelText = `${percentage}%`; }
                return (
                    <div key={cat} ref={refs[cat]} className={`bar cat-${cat}`} style={{ width: '0%' }} title={`${categoryLabels[cat]} ${percentage}%`} onMouseEnter={(e) => onBarHover(cat, e)} onMouseLeave={onBarLeave} onClick={() => onBarClick(cat)}>
                        <span>{labelText}</span>
                    </div>
                );
            })}
        </div>
    );
};


// --- Main Component ---
const Comment = () => {
    const categoryLabels = { praise: '칭찬', criticism: '비판', info: '정보', question: '질문', emotion: '감정', request: '요청', etc: '기타' };
    
    // (실제로는 API로 받아올 더미 데이터)
    const analysisData = {
        percentages: { praise: 30, criticism: 15, info: 20, question: 10, emotion: 10, request: 10, etc: 5 },
        representativeComments: [
             { category: 'praise', title: '대표 칭찬 댓글', text: '설명이 귀에 쏙쏙 들어와요! 구독하고 갑니다~' }, { category: 'criticism', title: '대표 비판 댓글', text: '이전 영상이랑 내용이 거의 비슷한 것 같아요. 좀 아쉽네요.' },
            { category: 'info', title: '대표 정보 댓글', text: '영상에 나온 제품 정보는 더보기란에 있습니다.' }, { category: 'question', title: '대표 질문 댓글', text: '혹시 BGM 정보 알 수 있을까요?' },
            { category: 'emotion', title: '대표 감정표현 댓글', text: 'ㅋㅋㅋㅋㅋ 너무 웃겨요!!' }, { category: 'request', title: '대표 요청 댓글', text: '다음엔 OO도 한번 다뤄주세요!' },
            { category: 'etc', title: '대표 기타 댓글', text: '영상 잘 보고 갑니다.' },
        ],
        commentList: [{category: 'praise', text: '정말 유익해요!'}, {category: 'question', text: '이거 어떻게 하는 건가요?'}],
        popularComments: [{text: '모두가 공감하는 댓글입니다.'}],
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
            // ✨ PageLayout이 없으므로, .page-layout-main 대신 .page-layout-container 기준으로 위치를 잡습니다.
            const containerRect = event.currentTarget.closest('.page-layout-main').getBoundingClientRect();
            const left = barRect.left + barRect.width / 2 - containerRect.left;
            const top = barRect.bottom - containerRect.top;
            setTooltipContent(representativeComment);
            setTooltipPosition({ top, left, opacity: 1 });
        }
    };

    const handleBarLeave = () => setTooltipPosition(prev => ({ ...prev, opacity: 0 }));
    
    const handleBarClick = (category) => {
        const allComments = [
            {id: 1, category: 'praise', text: '너무 좋은 영상이에요!'}, {id: 2, category: 'praise', text: '구독하고 갑니다!'},
            {id: 3, category: 'question', text: '혹시 BGM 알 수 있을까요?'},
        ];
        const filteredComments = allComments.filter(comment => comment.category === category);
        setCategoryComments(filteredComments);
        setSelectedCategory(category);
    };

    const handleCloseModal = () => setSelectedCategory(null);

    return (
        // ✨ PageLayout 대신 일반 div와 클래스를 사용하여 동일한 구조를 흉내 냅니다.
        <div className="page-layout-container">
            <header className="page-layout-header">
                <h1>댓글 상세 분석</h1>
                <input type="text" placeholder="페이지 내 검색..." />
            </header>
            <main className="page-layout-main">
                <section className="page-section" ref={tooltipSectionRef} style={{ position: 'relative' }}>
                    <h2>댓글 유형 비율</h2>
                    <AnimatedSentimentBar percentages={analysisData.percentages} categoryLabels={categoryLabels} onBarHover={handleBarHover} onBarLeave={handleBarLeave} onBarClick={handleBarClick} />
                    {tooltipContent && (
                        <div className="representative-comment-tooltip" style={tooltipPosition}>
                            <p className="tooltip-title">{tooltipContent.title}<span> ({analysisData.percentages[tooltipContent.category]}%)</span></p>
                            <p className="tooltip-text">"{tooltipContent.text}"</p>
                        </div>
                    )}
                </section>
                
                <div className="grid-2-col">
                    <section className="page-section">
                        <h2>최근 댓글 분석</h2>
                        {analysisData.commentList.length > 0 ? (
                            <ul className="comment-list">
                                {analysisData.commentList.map((comment, index) => (
                                    <li key={index}><span className={`tag cat-${comment.category}`}>{categoryLabels[comment.category]}</span><p>{comment.text}</p></li>
                                ))}
                            </ul>
                        ) : <p className="no-comments">최근 분석된 댓글이 없습니다.</p>}
                    </section>
                    <section className="page-section">
                        <h2>인기 댓글 분석</h2>
                        {analysisData.popularComments.length > 0 ? (
                             <ul className="comment-list">
                                {analysisData.popularComments.map((comment, index) => <li key={index}><p>{comment.text}</p></li>)}
                            </ul>
                        ) : <p className="no-comments">인기 댓글이 없습니다.</p>}
                    </section>
                </div>

                <CommentListModal category={selectedCategory} categoryLabel={selectedCategory ? categoryLabels[selectedCategory] : ''} comments={categoryComments} onClose={handleCloseModal} />
            </main>
        </div>
    );
};

export default Comment;
