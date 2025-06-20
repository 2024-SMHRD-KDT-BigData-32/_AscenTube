// src/components/Sidebar.js
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import '../styles/components/Sidebar.css'; // Sidebar 스타일

// react-icons에서 아이콘을 가져옵니다.
import {
  MdDashboard,
  MdVideoLibrary,
  MdSearch,
  MdComment,
  MdSmartToy,
  MdCategory,
  MdAnalytics,
  MdStar, // ✅ MdStar 아이콘 추가
} from 'react-icons/md';

const Sidebar = ({ isOpen }) => {
  const location = useLocation();

  const navItems = [
    { to: '/index', label: '대시보드', icon: <MdDashboard /> },
    { to: '/contents', label: '콘텐츠', icon: <MdVideoLibrary /> },
    { to: '/keyword', label: '키워드', icon: <MdSearch /> },
    { to: '/comment', label: '댓글', icon: <MdComment /> },
    { to: '/ai', label: 'AI', icon: <MdSmartToy /> },
    { to: '/category-analysis', label: '카테고리 분석', icon: <MdCategory /> },
    { to: '/vidanalysis', label: '영상분석', icon: <MdAnalytics /> },
    { to: '/favorite-channels', label: '관심채널', icon: <MdStar /> }, // ✅ 관심채널 메뉴 추가
  ];

  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'closed'}`}>
      <nav className="sidebar-nav">
        <ul>
          {navItems.map(item => (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`nav-item ${location.pathname === item.to ? 'active' : ''}`}
                title={!isOpen ? item.label : ''}
              >
                <span className="nav-icon">{item.icon}</span>
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