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
  MdAnalytics
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
    { to: '/vidanalysis', label: '영상분석', icon: <MdAnalytics /> }, // ✅ 경로에서 하이픈 제거
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
    <div className="sidebar-profile">
        <img
          src="글씨만.png" // public 폴더 기준 상대경로
          alt="프로필"
          className="profile-image"
        />
        <span className={`profile-name ${isOpen ? 'show' : 'hide'}`}>야비킴</span>
      </div>
    </aside>
  );
};

export default Sidebar;