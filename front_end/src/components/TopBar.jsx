import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'; // 로그아웃 시 필요
import '../styles/components/TopBar.css'; // TopBar 스타일
import ProfileDropdown from './ProfileDropdown'; // 드롭다운 컴포넌트 임포트

const logoPath = process.env.PUBLIC_URL + '/logo.png';

// 가상 사용자 정보 (실제로는 로그인 시 API 등에서 받아와야 함)
const dummyUser = {
  name: localStorage.getItem('user_name'), // 표시될 이름
  channelId: '@ascen_tube_user', // 표시될 채널 ID
  // 실제 유튜브 채널 썸네일 URL을 사용하거나, 없다면 플레이스홀더 사용
  thumbnailUrl: localStorage.getItem('user_thumbnail')
  // thumbnailUrl: '', // 비워두면 ProfileDropdown에서 플레이스홀더 사용
};


const TopBar = ({ onToggleSidebar }) => {
  const [user, setUser] = useState(null); // 사용자 정보 상태
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null); // 드롭다운 DOM 참조
  const avatarRef = useRef(null); // 아바타 DOM 참조
  const navigate = useNavigate();

  // 컴포넌트 마운트 시 사용자 정보 설정 (가상) 및 토큰 확인
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    const userName = localStorage.getItem('user_name');
    const userThumbnail = localStorage.getItem('user_thumbnail');
    const userEmail = localStorage.getItem('user_email');
    const userChannelName = localStorage.getItem('user_channel_name');

    if (token) {
      setUser({
        name: userName,
        channelId: userChannelName, // 필요에 따라 동적으로 설정
        thumbnailUrl: userThumbnail,
        email: userEmail // 이메일도 user 객체에 포함
      });
    } else {
      setUser(null);
    }
  }, []);

  const toggleDropdown = () => {
    setIsDropdownOpen(prev => !prev);
  };

  // 드롭다운 외부 클릭 시 닫기
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
    localStorage.removeItem('access_token'); // 토큰 제거
    localStorage.removeItem('user_name'); 
    localStorage.removeItem('user_thumbnail'); 
    localStorage.removeItem('user_email'); 
    setUser(null); // 사용자 상태 null로
    setIsDropdownOpen(false); // 드롭다운 닫기
    navigate('/login'); // 로그인 페이지로 이동
    // 필요하다면 window.location.reload(); 등으로 페이지를 완전히 새로고침
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

      <div className="topbar-center">
        <input type="search" placeholder="채널에서 검색하기" className="topbar-search-input" />
      </div>

      <div className="topbar-right">
        <button className="topbar-action-icon" aria-label="만들기">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20v-6m0-6V2m-6 12H0m6 0h6m6 0h6m-6-6V0m0 6v6m0 6v6"/></svg>
        </button>
        <button className="topbar-action-icon" aria-label="알림">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
        </button>
        
        {user && ( /* 로그인한 경우에만 프로필 아바타 표시 */
          <div className="profile-section" ref={avatarRef}> {/* ref 추가 */}
            <button onClick={toggleDropdown} className="topbar-profile-avatar-button">
              <img 
                src={user.thumbnailUrl || 'https://placehold.co/32x32/7E57C2/FFFFFF?text=A&font=roboto'} 
                alt="User Avatar" 
              />
            </button>
            {isDropdownOpen && (
              <div ref={dropdownRef}> {/* ref 추가 */}
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
