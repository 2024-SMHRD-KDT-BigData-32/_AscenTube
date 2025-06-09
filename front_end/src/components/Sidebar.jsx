// src/components/Sidebar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components/Sidebar.css'; // Sidebar 스타일

// react-icons에서 아이콘을 가져옵니다.
import {
  MdDashboard,         // 대시보드 아이콘 예시
  MdVideoLibrary,      // 콘텐츠 아이콘 예시
  MdSearch,            // 키워드 아이콘 예시
  MdComment,           // 댓글 아이콘 예시
  MdSmartToy,          // AI 아이콘 예시
  MdCategory           // 카테고리 분석용 아이콘
} from 'react-icons/md'; // Material Design 아이콘 사용 (다른 아이콘 세트도 가능)

const Sidebar = ({ isOpen }) => {
  const location = useLocation();

  const navItems = [
    // App.js의 Dashboard 경로가 '/index'이므로 여기도 '/index'로 맞춰줍니다.
    { to: '/index', label: '대시보드', icon: <MdDashboard /> },
    { to: '/contents', label: '콘텐츠', icon: <MdVideoLibrary /> },
    { to: '/keyword', label: '키워드', icon: <MdSearch /> },
    { to: '/comment', label: '댓글', icon: <MdComment /> },
    { to: '/ai', label: 'AI', icon: <MdSmartToy /> },
    { to: '/category-analysis', label: '카테고리 분석', icon: <MdCategory /> }, // ✅ 새 메뉴 항목 추가
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <nav className="sidebar-nav"> {/* CSS와 일치시키기 위해 클래스명 변경 및 ul 추가 */}
        <ul> {/* <ul> 태그 추가 */}
          {navItems.map(item => (
            <li key={item.to}> {/* <li> 태그 추가 */}
              <Link
                to={item.to}
                // CSS에 정의된 클래스명(.nav-item, .active)을 사용하도록 수정
                className={`nav-item ${location.pathname === item.to ? 'active' : ''}`}
                title={!isOpen ? item.label : ''} // 축소 시 툴팁으로 라벨 표시
              >
                {/* CSS에 정의된 클래스명(.nav-icon)을 사용 */}
                <span className="nav-icon">{item.icon}</span>
                {/* CSS에 정의된 클래스명(.nav-label)을 사용 */}
                {/* isOpen 상태에 따라 nav-label을 조건부 렌더링하거나 CSS에서 처리 */}
                {isOpen && <span className="nav-label">{item.label}</span>}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;