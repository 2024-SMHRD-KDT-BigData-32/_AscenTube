import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/components/TopBar.css';
import ProfileDropdown from './ProfileDropdown';

const logoPath = process.env.PUBLIC_URL + '/logo.png';

// --- 1. 검색 가능한 페이지 목록 정의 ---
const searchableDestinations = [
  { name: '대시보드', keywords: ['대시보드', '메인', '홈', 'dashboard'], path: '/dashboard' },
  { name: '영상 분석', keywords: ['영상', '개별 영상', '분석', 'vidanalysis'], path: '/vidanalysis' },
  { name: '댓글 분석', keywords: ['댓글', '코멘트', 'comment', '화행', '감정'], path: '/comment' },
  { name: 'AI 전략 코칭', keywords: ['ai', '전략', '코칭', '인사이트'], path: '/ai' },
  { name: '관심 채널 관리', keywords: ['관심', '채널', 'favorite', '즐겨찾기'], path: '/favorite-channels' },
  // 나중에 페이지가 추가되면 여기에 계속 추가하면 됩니다.
];


const TopBar = ({ onToggleSidebar }) => {
  const [user, setUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // --- 2. 전역 검색을 위한 상태 추가 ---
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  
  const dropdownRef = useRef(null);
  const avatarRef = useRef(null);
  const searchContainerRef = useRef(null); // 검색창 영역 참조 추가
  const navigate = useNavigate();

  useEffect(() => {
    // (사용자 정보 로딩 로직 - 기존과 동일)
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
      // 프로필 드롭다운 닫기 로직
      if (dropdownRef.current && !dropdownRef.current.contains(event.target) &&
          avatarRef.current && !avatarRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      // 검색 추천 드롭다운 닫기 로직
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target)) {
        setSuggestions([]);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    Object.keys(localStorage).forEach(key => {
        if (key.startsWith('google_') || key.startsWith('user_') || key.startsWith('vidAnalysis_') || key === 'access_token' || key === 'token') {
            localStorage.removeItem(key);
        }
    });
    
    setUser(null);
    setIsDropdownOpen(false);
    navigate('/login');
  };

  // --- 3. 검색 로직 구현 ---
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);

    if (value.trim() === '') {
      setSuggestions([]);
      return;
    }

    const lowerCaseValue = value.toLowerCase();
    const filteredSuggestions = searchableDestinations.filter(dest => 
      dest.name.toLowerCase().includes(lowerCaseValue) ||
      dest.keywords.some(kw => kw.toLowerCase().includes(lowerCaseValue))
    );
    setSuggestions(filteredSuggestions);
  };
  
  const handleSearchSubmit = (path) => {
    if (path) {
      navigate(path);
    } else {
      // 엔터키 입력 시 가장 첫번째 추천 항목으로 이동
      if (suggestions.length > 0) {
        navigate(suggestions[0].path);
      }
    }
    setSearchTerm('');
    setSuggestions([]);
  };

  return (
    <header className="topbar">
      <div className="topbar-left">
        {/* ... (좌측 로고 및 사이드바 토글 버튼 - 기존과 동일) ... */}
        <button onClick={onToggleSidebar} className="sidebar-toggle-button" aria-label="Toggle sidebar">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
        </button>
        <div className="topbar-logo-container">
            <img src={logoPath} alt="AscenTube 로고" className="topbar-logo-img" />
            <span className="topbar-logo-text">AscenTube</span>
        </div>
      </div>

      {/* ▼▼▼ [수정됨] 검색창 섹션 ▼▼▼ */}
      <div className="topbar-center">
        <div className="topbar-search-container">
          <input 
            type="search" 
            placeholder="검색" 
            className="topbar-search-input"
            value={searchTerm}
            onChange={handleSearchChange}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSearchSubmit(); }}
          />
          <button 
            className="topbar-search-button" 
            aria-label="검색"
            onClick={() => handleSearchSubmit()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
          </button>

          {suggestions.length > 0 && (
            <ul className="search-suggestions-dropdown">
              {suggestions.map(suggestion => (
                <li key={suggestion.path} onClick={() => handleSearchSubmit(suggestion.path)}>
                  {suggestion.name}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="topbar-right">
        {/* ... (우측 프로필 섹션 - 기존과 동일) ... */}
        {user && (
          <div className="profile-section" ref={avatarRef}>
            <button onClick={toggleDropdown} className="topbar-profile-avatar-button">
              <img src={user.thumbnailUrl || 'https://placehold.co/32x32/7E57C2/FFFFFF?text=A&font=roboto'} alt="User Avatar" />
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