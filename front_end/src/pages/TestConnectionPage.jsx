import React from 'react';
import ServerConnectionTest from '../components/ServerConnectionTest'; // 테스트 컴포넌트 import

const TestConnectionPage = () => {
  const pageStyle = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '50px'
  };

  return (
    <div style={pageStyle}>
      <h1>⚙️ 서버 연동 테스트 페이지</h1>
      <p>이 페이지는 프론트엔드-백엔드-크롤링 서버 간의 통신을 테스트하기 위한 전용 페이지입니다.</p>
      <hr style={{ width: '100%', margin: '20px 0' }} />
      <ServerConnectionTest />
    </div>
  );
};

export default TestConnectionPage;