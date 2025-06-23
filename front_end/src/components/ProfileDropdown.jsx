import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/components/ProfileDropdown.css';

const ProfileDropdown = ({ user, onLogout }) => {
  const navigate = useNavigate();

  if (!user) return null;

  // 내 채널의 YouTube URL을 생성합니다. user.channelId가 '@username' 형태라고 가정합니다.
  const myChannelUrl = `https://www.youtube.com/${user.channelId}`;

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  return (
    <>
      <div className="profile-dropdown">
        <div className="dropdown-header">
          <img
            src={user.thumbnailUrl || 'https://placehold.co/48x48/E0E0E0/B0B0B0?text=C'}
            alt="Channel Thumbnail"
            className="dropdown-thumbnail"
          />
          <div className="dropdown-user-info">
            <span className="dropdown-user-name">{user.name}</span>
            <span className="dropdown-channel-id">{user.channelId}</span>
          </div>
        </div>
        <ul className="dropdown-menu">
          {/* --- 1. '내 채널' 링크 수정 --- */}
          <li><a href={myChannelUrl} target="_blank" rel="noopener noreferrer"><span>내 채널</span></a></li>
          {/* --- 2. 'YouTube' 링크 수정 --- */}
          <li><a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer"><span>YouTube</span></a></li>
          {/* --- 3. '계정 전환' 링크 수정 --- */}
          <li><a href="https://accounts.google.com/AccountChooser" target="_blank" rel="noopener noreferrer"><span>계정 전환</span></a></li>
          <li><button onClick={handleLogout}><span>로그아웃</span></button></li>
        </ul>
      </div>
    </>
  );
};

export default ProfileDropdown;