import React, { useEffect, useRef, useState } from 'react';
import { fetchCommentAnalysisSummary } from '../api/CommentApi';
import PageLayout from '../layouts/PageLayout';
import '../styles/pages/Comment.css';

// ============================================
// 🟦 상수 및 라벨
// ============================================

const SPEECH_ACT_LABELS = {
    PRAISE: '칭찬', CRITICISM: '비판', INFO: '정보제공',
    QUESTION: '질문', EMOTION: '감정표현', REQUEST: '요청', ETC: '기타'
};

const SENTIMENT_LABELS = {
    POSITIVE: '긍정', NEUTRAL: '중립', NEGATIVE: '부정'
};

// ============================================
// 🟦 헬퍼 컴포넌트
// ============================================

const CommentListModal = ({ category, categoryLabel, comments, onClose }) => {
    // ... (변경 없음)
    if (!category) return null;
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                <div className={`modal-header cat-${category.toLowerCase()}`}>
                    <h3>{categoryLabel} 댓글 전체 보기 ({comments.length}개)</h3>
                    <button onClick={onClose} className="modal-close-button">&times;</button>
                </div>
                <div className="modal-body">
                    {comments.length > 0 ? (
                        <ul className="modal-comment-list">{comments.map((comment, index) =>
                            <li key={comment.commentId || index}>
                                <p>{comment.commentContent}</p>
                                <span>- {comment.commentWriterName}</span>
                            </li>
                        )}</ul>
                    ) : <p className="no-comments">해당 카테고리의 댓글이 없습니다.</p>}
                </div>
            </div>
        </div>
    );
};

const AnalysisBarChart = ({ title, distributionData, labelMap, colorPrefix, onBarHover, onBarLeave, onBarClick }) => {
    // ... (변경 없음, 이미 가장 정확한 방식으로 구현됨)
    const refs = useRef({});
    
    const calculatedTotal = React.useMemo(() => {
        return distributionData?.reduce((sum, item) => sum + item.count, 0) || 0;
    }, [distributionData]);

    const percentages = React.useMemo(() => {
        if (!distributionData || calculatedTotal === 0) return {};
        return distributionData.reduce((acc, item) => {
            const percentage = (item.count / calculatedTotal) * 100;
            acc[item.type] = { percentage, count: item.count };
            refs.current[item.type] = React.createRef();
            return acc;
        }, {});
    }, [distributionData, calculatedTotal]);
    
    useEffect(() => {
        requestAnimationFrame(() => {
            for (const key in percentages) {
                if (refs.current[key]?.current) {
                    refs.current[key].current.style.width = `${percentages[key].percentage}%`;
                }
            }
        });
    }, [percentages]);

    const orderedTypes = Object.keys(labelMap);

    return (
        <div className="analysis-chart-container">
            <h3>{title}</h3>
            <div className="sentiment-bar-container">
                {orderedTypes.map(type => {
                    const data = percentages[type];
                    if (!data || data.percentage <= 0) return null;

                    const percentage = data.percentage.toFixed(1);
                    const categoryLabel = labelMap[type];
                    
                    let labelText = '';
                    if (data.percentage > 15) { labelText = `${categoryLabel} ${percentage}%`; }
                    else if (data.percentage > 5) { labelText = `${percentage}%`; }

                    return (
                        <div 
                            key={type} 
                            ref={refs.current[type]} 
                            className={`bar ${colorPrefix}${type.toLowerCase()}`} 
                            style={{ width: '0%' }} 
                            title={`${categoryLabel} ${percentage}% `} 
                            onMouseEnter={(e) => onBarHover && onBarHover(type, e)} 
                            onMouseLeave={onBarLeave} 
                            onClick={() => onBarClick && onBarClick(type)}
                        >
                            <span>{labelText}</span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

// ============================================
// 🟦 메인 컴포넌트
// ============================================
const Comment = () => {
    const [analysisData, setAnalysisData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const [tooltip, setTooltip] = useState({ content: null, position: { top: 0, left: 0, opacity: 0 } });
    const tooltipSectionRef = useRef(null);
    
    const [modal, setModal] = useState({ category: null, comments: [] });
    
    const [openAccordion, setOpenAccordion] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            setError(null);
            
            const loggedInChannelId = localStorage.getItem('user_youtube_channel_id');
            if (!loggedInChannelId) {
                setError("로그인 정보에서 채널 ID를 찾을 수 없습니다. 다시 로그인해주세요.");
                setLoading(false);
                return;
            }

            try {
                const period = 'quarter';
                const data = await fetchCommentAnalysisSummary(loggedInChannelId, period);

                if (data) {
                    const standardize = (text) => text?.toUpperCase() || null;
                    const standardizedData = {
                        ...data,
                        speechActDistribution: data.speechActDistribution?.map(item => ({...item, type: standardize(item.type) })),
                        sentimentDistribution: data.sentimentDistribution?.map(item => ({...item, type: standardize(item.type) })),
                        latestComments: data.latestComments?.map(c => ({...c, speechAct: standardize(c.speechAct), sentimentType: standardize(c.sentimentType) })),
                        topLikedComments: data.topLikedComments?.map(c => ({...c, speechAct: standardize(c.speechAct), sentimentType: standardize(c.sentimentType) })),
                        representativeCommentsBySpeechAct: data.representativeCommentsBySpeechAct?.map(c => ({...c, speechAct: standardize(c.speechAct) })),
                        // [수정 3] 백엔드에서 이 데이터가 온다고 가정
                        representativeCommentsBySentiment: data.representativeCommentsBySentiment?.map(c => ({...c, sentimentType: standardize(c.sentimentType) })),
                    };
                    setAnalysisData(standardizedData);
                } else {
                    setError("데이터를 불러오는 데 실패했습니다.");
                }
            } catch (err) {
                setError("데이터 로딩 중 오류가 발생했습니다.");
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    // [수정 2] 화행 그래프 클릭 시, 페이지에 있는 모든 댓글을 대상으로 필터링
    const allComments = React.useMemo(() => {
        if (!analysisData) return [];
        const combined = [...(analysisData.latestComments || []), ...(analysisData.topLikedComments || [])];
        // 중복 제거
        const uniqueComments = Array.from(new Map(combined.map(c => [c.commentId, c])).values());
        return uniqueComments;
    }, [analysisData]);

    const handleBarClick = (category) => {
        const filteredComments = allComments.filter(comment => comment.speechAct === category);
        setModal({
            category: category,
            comments: filteredComments
        });
    };
    
    const showTooltip = (content, event) => {
        if (content && tooltipSectionRef.current) {
            const barRect = event.currentTarget.getBoundingClientRect();
            const containerRect = tooltipSectionRef.current.getBoundingClientRect();
            const left = barRect.left + barRect.width / 2 - containerRect.left;
            const top = barRect.bottom - containerRect.top + 10;
            setTooltip({ content, position: { top, left, opacity: 1 } });
        }
    };
    
    const handleBarHover = (category, event) => {
        const repComment = analysisData.representativeCommentsBySpeechAct?.find(c => c.speechAct === category);
        if (repComment) {
            showTooltip({
                title: `대표 ${SPEECH_ACT_LABELS[category]} 댓글`,
                text: repComment.commentContent
            }, event);
        }
    };

    // [수정 3] 긍부정 그래프 툴팁 핸들러
    const handleSentimentBarHover = (category, event) => {
        // 현재 백엔드에서 `representativeCommentsBySentiment`를 보내주지 않지만,
        // 나중에 추가될 것을 대비하여 로직을 미리 구현합니다.
        const repComment = analysisData.representativeCommentsBySentiment?.find(c => c.sentimentType === category);
        if (repComment) {
            showTooltip({
                title: `대표 ${SENTIMENT_LABELS[category]} 댓글`,
                text: repComment.commentContent
            }, event);
        }
    };

    const handleBarLeave = () => setTooltip(prev => ({ ...prev, position: { ...prev.position, opacity: 0 } }));
    
    const handleAccordionClick = (speechAct) => {
        setOpenAccordion(prevOpen => (prevOpen === speechAct ? null : speechAct));
    };

    const renderContent = () => {
        if (loading) return <p className="message-center">데이터를 분석하고 있습니다...</p>;
        if (error) return <p className="message-center error">{error}</p>;
        if (!analysisData || !analysisData.totalComments) return <p className="message-center">분석할 댓글 데이터가 없습니다.</p>;

        return (
            <>
                <section className="page-section" ref={tooltipSectionRef} style={{ position: 'relative' }}>
                    <h2>댓글 유형 분석</h2>
                    <AnalysisBarChart
                        title="댓글 화행 비율"
                        distributionData={analysisData.speechActDistribution}
                        labelMap={SPEECH_ACT_LABELS}
                        colorPrefix="cat-"
                    />
                    <AnalysisBarChart
                        title="댓글 긍·부정 비율"
                        distributionData={analysisData.sentimentDistribution}
                        labelMap={SENTIMENT_LABELS}
                        colorPrefix="sentiment-"
                    />
                    {tooltip.content && (
                        <div className="representative-comment-tooltip" style={tooltip.position}>
                            <p className="tooltip-title">{tooltip.content.title}</p>
                            <p className="tooltip-text">"{tooltip.content.text}"</p>
                        </div>
                    )}
                </section>
                
                {analysisData.representativeCommentsBySpeechAct?.length > 0 && (
                    <section className="page-section">
                        <h2>화행별 대표 댓글</h2>
                        <div className="accordion-container">
                            {Object.keys(SPEECH_ACT_LABELS).map(speechActKey => {
                                const comment = analysisData.representativeCommentsBySpeechAct.find(c => c.speechAct === speechActKey);
                                if (!comment) return null;
                                const isOpen = openAccordion === speechActKey;
                                return (
                                    <div key={speechActKey} className="accordion-item">
                                        <button className={`accordion-header ${isOpen ? 'active' : ''}`} onClick={() => handleAccordionClick(speechActKey)}>
                                            <span className={`tag cat-${speechActKey.toLowerCase()}`}>{SPEECH_ACT_LABELS[speechActKey]}</span>
                                            <span className="accordion-title">"{comment.commentContent}"</span>
                                            <span className={`accordion-icon ${isOpen ? 'open' : ''}`}>▼</span>
                                        </button>
                                        {isOpen && (
                                            <div className="accordion-content">
                                                <p><b>작성자:</b> {comment.commentWriterName}</p>
                                                <p><b>영상:</b> {comment.videoTitle}</p>
                                                <p><b>작성일:</b> {new Date(comment.commentWriteAt).toLocaleString()}</p>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </section>
                )}

                <div className="grid-2-col">
                    <section className="page-section">
                        <h2>최신 댓글</h2>
                        {analysisData.latestComments?.length > 0 ? (
                            <ul className="comment-list">
                                {analysisData.latestComments.map(comment => (
                                    <li key={comment.commentId}>
                                        <div className="comment-tags">
                                            {/* [수정 1] 화행과 긍부정 태그 모두 표시 */}
                                            {comment.speechAct && <span className={`tag cat-${comment.speechAct.toLowerCase()}`}>{SPEECH_ACT_LABELS[comment.speechAct]}</span>}
                                            {comment.sentimentType && <span className={`tag sentiment-${comment.sentimentType.toLowerCase()}`}>{SENTIMENT_LABELS[comment.sentimentType]}</span>}
                                        </div>
                                        <p>{comment.commentContent}</p>
                                    </li>
                                ))}
                            </ul>
                        ) : <p className="no-comments">최근 분석된 댓글이 없습니다.</p>}
                    </section>
                    
                    <section className="page-section">
                        <h2>'좋아요' 많은 댓글</h2>
                        {analysisData.topLikedComments?.length > 0 ? (
                            <ul className="comment-list">
                                {analysisData.topLikedComments.map(comment => 
                                    <li key={comment.commentId}>
                                        <div className="comment-body">
                                            <div className="comment-tags">
                                                {/* [수정 1] 화행과 긍부정 태그 모두 표시 */}
                                                {comment.speechAct && <span className={`tag cat-${comment.speechAct.toLowerCase()}`}>{SPEECH_ACT_LABELS[comment.speechAct]}</span>}
                                                {comment.sentimentType && <span className={`tag sentiment-${comment.sentimentType.toLowerCase()}`}>{SENTIMENT_LABELS[comment.sentimentType]}</span>}
                                            </div>
                                            <p>{comment.commentContent}</p>
                                        </div>
                                        <span className="like-count">👍 {comment.commentLikeCount}</span>
                                    </li>
                                )}
                            </ul>
                        ) : <p className="no-comments">인기 댓글이 없습니다.</p>}
                    </section>
                </div>

                <CommentListModal 
                    category={modal.category} 
                    categoryLabel={modal.category ? SPEECH_ACT_LABELS[modal.category] : ''} 
                    comments={modal.comments} 
                    onClose={() => setModal({ category: null, comments: [] })}
                />
            </>
        );
    };

    return (
        <PageLayout title="댓글 상세 분석">
            {renderContent()}
        </PageLayout>
    );
};

export default Comment;