import React from 'react';
import { Link, useNavigate } from 'react-router-dom'; // 로그아웃 후 페이지 이동을 위해 useNavigate 사용
import '../styles/components/ProfileDropdown.css'; // 드롭다운 스타일

// 아이콘 SVG 예시 (필요에 따라 react-icons 등으로 교체)
const UserIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"></path></svg>;
const YouTubeIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M10 15l5.19-3L10 9v6zm11.56-7.83c.13.47.22 1.1.28 1.9.07.8.1 1.49.1 2.09L22 12c0 2.19-.16 3.8-.44 4.83-.25.9-.83 1.48-1.73 1.73-.47.13-1.33.22-2.65.28H6.82c-.9 0-1.75-.05-2.34-.11-.9-.08-1.57-.44-2.09-.96-.52-.52-.88-1.19-.96-2.09-.06-.59-.11-1.44-.11-2.59v-.4L1 12c0-2.19.16-3.8.44-4.83.25-.9.83-1.48 1.73-1.73.47-.13 1.33.22 2.65.28H17.18c.9 0 1.75.05 2.34.11.9.08 1.57.44 2.09.96.52.52.88 1.19.96 2.09z"></path></svg>;
const SwitchAccountIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.97-4.03-9-9-9-1.5 0-2.91.37-4.15 1.01l1.51 1.51C10.36 5.2 11.44 5 12.5 5c3.31 0 6 2.69 6 6zM2.39 4.73L1.11 6l3.48 3.48C4.19 10.15 4 11.06 4 12c0 4.41 3.59 8 8 8 .94 0 1.85-.19 2.68-.52l3.48 3.48 1.27-1.27L2.39 4.73zM12 18c-3.31 0-6-2.69-6-6 0-.56.08-1.11.22-1.64L10.36 14.5C9.58 15.45 9 16.62 9 17.94l-2.79-2.79C6.41 15.02 6.81 15 7.23 15c.08 0 .15.02.23.03L12 10.27V18z"></path></svg>;
const LogoutIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"></path></svg>;
const ThemeIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M12 3c-4.97 0-9 4.03-9 9s4.03 9 9 9c.83 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.01-.23-.26-.38-.61-.38-.99 0-.83.67-1.5 1.5-1.5H16c2.76 0 5-2.24 5-5 0-4.42-4.03-8-9-8zm-5.5 9c-.83 0-1.5-.67-1.5-1.5S5.67 9 6.5 9 8 9.67 8 10.5 7.33 12 6.5 12zm3-4C8.67 8 8 7.33 8 6.5S8.67 5 9.5 5s1.5.67 1.5 1.5S10.33 8 9.5 8zm5 0c-.83 0-1.5-.67-1.5-1.5S13.67 5 14.5 5s1.5.67 1.5 1.5S15.33 8 14.5 8zm3 4c-.83 0-1.5-.67-1.5-1.5S16.67 9 17.5 9s1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"></path></svg>;
const FeedbackIcon = () => <svg viewBox="0 0 24 24" fill="currentColor" width="20px" height="20px"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-7 12h-2v-2h2v2zm0-4h-2V6h2v4z"></path></svg>;

const ProfileDropdown = ({ user, onLogout }) => {
  const navigate = useNavigate();

  if (!user) return null;

  const handleLogout = () => {
    if (onLogout) {
      onLogout(); // 부모 컴포넌트에서 전달된 로그아웃 함수 실행 (예: localStorage 토큰 제거)
    }
    navigate('/login'); // 로그인 페이지로 이동
  };

  return (
    <div className="profile-dropdown">
      <div className="dropdown-header">
        <img src={user.thumbnailUrl || 'https://placehold.co/48x48/E0E0E0/B0B0B0?text=C'} alt="Channel Thumbnail" className="dropdown-thumbnail" />
        <div className="dropdown-user-info">
          <span className="dropdown-user-name">{user.name}</span>
          <span className="dropdown-channel-id">{user.channelId}</span>
        </div>
      </div>
      <ul className="dropdown-menu">
        <li><Link to="/my-channel"><UserIcon /><span>내 채널</span></Link></li>
        <li><a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer"><YouTubeIcon /><span>YouTube</span></a></li>
        <li><button onClick={() => alert('계정 전환 기능 구현 필요')}><SwitchAccountIcon /><span>계정 전환</span><span className="arrow">&gt;</span></button></li>
        <li><button onClick={handleLogout}><LogoutIcon /><span>로그아웃</span></button></li>
      </ul>
      <ul className="dropdown-menu separator">
        <li><button onClick={() => alert('디자인 테마 변경 기능 구현 필요')}><ThemeIcon /><span>디자인: 기기 테마</span><span className="arrow">&gt;</span></button></li>
        <li><button onClick={() => alert('의견 보내기 기능 구현 필요')}><FeedbackIcon /><span>의견 보내기</span></button></li>
      </ul>
    </div>
  );
};

export default ProfileDropdown;
