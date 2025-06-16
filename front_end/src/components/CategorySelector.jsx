import React, { useState, useEffect, useRef } from 'react';
// 파일 구조에 맞는 정확한 CSS 경로
import '../styles/components/CategorySelector.css';

const CategorySelector = ({ items, isLoading, selectedItem, onSelect }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    
    // 드롭다운 외부 클릭 시 닫기
    useEffect(() => {
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSelect = (item) => {
        onSelect(item); // 부모 컴포넌트에 선택된 아이템 전달
        setIsOpen(false);
    };

    const formatNumber = (value) => {
        if (!value) return "";
        return `${(value / 10000).toFixed(0)}만`;
    };

    return (
        <div className="custom-dropdown-container" ref={wrapperRef}>
            <div className="dropdown-header" onClick={() => setIsOpen(!isOpen)}>
                {selectedItem ? selectedItem.name : "-- 카테고리 선택 --"}
                <span className={`arrow ${isOpen ? 'up' : 'down'}`}></span>
            </div>
            
            {isOpen && (
                <div className="dropdown-list-container">
                    <ul className="dropdown-list">
                        {isLoading ? (
                            <li className="dropdown-list-item-loading">데이터 불러오는 중...</li>
                        ) : (
                            items.map(item => (
                                // ▼▼▼ 이 li 태그의 className 부분을 수정했습니다 ▼▼▼
                                <li 
                                    key={item.id} 
                                    className={`dropdown-list-item ${selectedItem?.id === item.id ? 'selected' : ''}`} 
                                    onClick={() => handleSelect(item)}
                                >
                                    <span className="item-name">{item.name}</span>
                                    {/* '전체' 카테고리가 아닐 때만 그래프와 조회수 표시 */}
                                    {item.id !== '0' && (
                                        <>
                                            <div className="item-chart">
                                                <div className="bar" style={{ width: `${item.barWidth}%` }}></div>
                                            </div>
                                            <span className="item-views">
                                                {formatNumber(item.views)}
                                            </span>
                                        </>
                                    )}
                                </li>
                            ))
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default CategorySelector;