import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/components/TopBar.css';
import ProfileDropdown from './ProfileDropdown';

const logoPath = process.env.PUBLIC_URL + '/logo.png';

const TopBar = ({ onToggleSidebar }) => {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userName = localStorage.getItem('user_name');
    const userThumbnail = localStorage.getItem('user_thumbnail');
    const userEmail = localStorage.getItem('user_email');
    const userChannelName = localStorage.getItem('user_channel_name');

    if (token) {
      setUser({
        name: userName,
        channelId: '@' + userChannelName,
        thumbnailUrl: userThumbnail,
        email: userEmail
      });
    } else {
      setUser(null);
    }
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          avatarRef.current && !avatarRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    // LocalStorage의 모든 관련 항목 삭제
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('user_') || key.startsWith('vidAnalysis_') || key === 'access_token' || key === 'token') {
            localStorage.removeItem(key);
        }
    });
    
    setUser(null);
    setIsDropdownOpen(false);
    navigate('/login');
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button 
          onClick={onToggleSidebar} 
          className="sidebar-toggle-button" 
          aria-label="Toggle sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>
        </button>
        <div className="topbar-logo-container">
          <img src={logoPath} alt="AscenTube 로고" className="topbar-logo-img" />
          <span className="topbar-logo-text">AscenTube</span>
        </div>
      </div>

      {/* ▼▼▼ [수정됨] 검색창 섹션 ▼▼▼ */}
      <div className="topbar-center">
        <div className="topbar-search-container">
          <input type="search" placeholder="채널에서 검색하기" className="topbar-search-input" />
          <button className="topbar-search-button" aria-label="검색">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
          </button>
        </div>
      </div>

      <div className="topbar-right">
        <button className="topbar-action-icon" aria-label="만들기">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6m0-6V2m-6 12H0m6 0h6m6 0h6m-6-6V0m0 6v6m0 6v6"/></svg>
        </button>
        <button className="topbar-action-icon" aria-label="알림">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
        
        {user && (
          <div className="profile-section" ref={avatarRef}>
            <button onClick={toggleDropdown} className="topbar-profile-avatar-button">
              <img 
                src={user.thumbnailUrl || 'https://placehold.co/32x32/7E57C2/FFFFFF?text=A&font=roboto'} 
                alt="User Avatar" 
              />
            </button>
            {isDropdownOpen && (
              <div ref={dropdownRef}>
                <ProfileDropdown user={user} onLogout={handleLogout} />
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default TopBar;