import React, { useEffect, useState } from 'react';
import '../styles/Login.css'; // 여기에 파란색 .google-button CSS 코드를 넣어주세요.

// 이미지 import는 사용하지 않으므로 삭제합니다.

const Login = () => {
  const [showLogin, setShowLogin] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogin(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  const handleGoogleLogin = () => {
    setLoading(true);
    window.location.href = 'http://localhost:8082/AscenTube/oauth/google/login';
  };

  return (
    <div className="login-body">
      <div className={`intro ${showLogin ? 'fade-out' : ''}`}>
        <img src="/main-logo.gif" alt="인트로 로고" className="intro-image" />
      </div>

      <div className={`login-wrapper ${showLogin ? 'fade-in' : ''}`}>
        <div className="logo-wrapper">
          <img src="/logo-main.png" alt="메인 로고" className="logo-image" />
        </div>
        <div className="button-wrapper">
          {!loading ? (
            // --- ▼▼▼ 요청하신 CSS와 SVG 코드를 결합한 버튼 ▼▼▼ ---
            <button onClick={handleGoogleLogin} className="google-button">
              {/* 1. SVG를 감싸는 div를 만들고, 여기에 google-icon 클래스를 적용 */}
              <div className="google-icon">
                {/* 2. 이 안에 SVG 코드를 직접 삽입 (크기는 CSS에 의해 자동 조절됨) */}
                <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: 'block' }}>
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                  <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
              </div>
              <span>Google 계정으로 로그인</span>
            </button>
            // --- ▲▲▲ 여기까지 수정 ---
          ) : (
            <>
              <div className="spinner" />
              <span>로그인 중...</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;