import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/components/ProfileDropdown.css';

const ProfileDropdown = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);
  const [channelUrl, setChannelUrl] = useState('');

  if (!user) return null;

  const handleLogout = () => {
    if (onLogout) onLogout();
    navigate('/login');
  };

  const handleAddChannel = () => {
    if (channelUrl.trim()) {
      console.log('관심 채널 추가:', channelUrl);
      // 여기에 관심 채널 추가 로직을 구현하세요 (예: API 요청)
      setChannelUrl('');
      setShowModal(false);
    }
  };

  // 내부 모달 컴포넌트
  const AddChannelModal = () => (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>관심 채널 추가</h2>
        <input
          type="text"
          placeholder="채널 URL을 입력하세요"
          value={channelUrl}
          onChange={(e) => setChannelUrl(e.target.value)}
        />
        <div className="modal-actions">
          <button onClick={handleAddChannel}>추가</button>
          <button onClick={() => setShowModal(false)}>취소</button>
        </div>
      </div>
    </div>
  );

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
          <li><Link to="/my-channel"><span>내 채널</span></Link></li>
          <li><a href="https://www.youtube.com" target="_blank" rel="noopener noreferrer"><span>YouTube</span></a></li>
          <li><button onClick={() => alert('계정 전환 기능 구현 필요')}><span>계정 전환</span></button></li>
          <li><button onClick={handleLogout}><span>로그아웃</span></button></li>
        </ul>
        <ul className="dropdown-menu separator">
          <li><button onClick={() => alert('디자인 변경 기능 구현 필요')}><span>디자인: 기기 테마</span></button></li>
          <li><button onClick={() => alert('의견 보내기 기능 구현 필요')}><span>의견 보내기</span></button></li>
          <li><button onClick={() => setShowModal(true)}><span>관심 채널 추가</span></button></li>
        </ul>
      </div>

      {showModal && <AddChannelModal />}
    </>
  );
};

export default ProfileDropdown;
