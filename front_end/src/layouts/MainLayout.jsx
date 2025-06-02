import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import '../styles/layouts/MainLayout.css'; // MainLayout 스타일
import { CategoryProvider } from '../contexts/CategoryContext'; // 🚀 CategoryProvider import

const MainLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const toggleSidebar = () => {
    setIsSidebarOpen(prev => !prev);
  };

  // 화면 크기에 따라 사이드바 초기 상태 설정 (선택 사항)
  useEffect(() => {
    const handleResize = () => {
      // 예: 너비가 1024px 미만이면 사이드바를 기본적으로 닫음
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    handleResize(); // 초기 로드 시 실행
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    // 🚀 CategoryProvider로 MainLayout의 전체 내용을 감싸줍니다.
    <CategoryProvider>
      <div className={`app-container ${isSidebarOpen ? 'sidebar-expanded' : 'sidebar-collapsed'}`}>
        <TopBar onToggleSidebar={toggleSidebar} />
        <div className="app-body">
          <Sidebar isOpen={isSidebarOpen} />
          <main className="app-content">
            {/* 기존 MainLayout의 콘텐츠 영역 스타일을 여기에 적용할 수 있습니다. */}
            <div className="content-wrapper">
              <Outlet /> {/* 중첩된 자식 라우트가 여기서 렌더링됩니다 */}
            </div>
          </main>
        </div>
      </div>
    </CategoryProvider>
  );
};

export default MainLayout;