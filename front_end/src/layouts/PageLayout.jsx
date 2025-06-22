// src/layouts/PageLayout.jsx

import React from 'react';
import '../styles/layouts/PageLayout.css'; // PageLayout 전용 CSS

/**
 * 모든 페이지의 공통 레이아웃을 제공하는 컴포넌트
 * @param {object} props
 * @param {string} props.title - 페이지의 제목
 * @param {React.ReactNode} props.children - 페이지의 실제 콘텐츠
 */
const PageLayout = ({ title, children }) => {
    return (
        <div className="page-layout-container">
            <header className="page-layout-header">
                <h1>{title}</h1>
                <input type="text" placeholder="페이지 내 검색..." />
            </header>
            <main className="page-layout-main">
                {children}
            </main>
        </div>
    );
};

// 이 부분이 가장 중요합니다. 컴포넌트를 default로 내보냅니다.
export default PageLayout;
