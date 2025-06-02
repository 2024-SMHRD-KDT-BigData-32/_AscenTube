import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGoogleLogin } from '@react-oauth/google';
import axios from 'axios';
import '../styles/Login.css';

const Login = () => {
  const [showLogin, setShowLogin] = useState(false); // 인트로 화면 이후 로그인 UI 전환 제어
  const [loading, setLoading] = useState(false); // 로그인 중 로딩 스피너 제어
  const navigate = useNavigate();

  // 인트로 화면 2.8초 후 로그인 UI 보여주기
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowLogin(true);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  // 구글 로그인 실행 함수
  const handleGoogleLogin = () => {
    setLoading(true);

    window.location.href = 'http://localhost:8082/AscenTube/oauth/google/login';
  };

  return (
    <div className="login-body">
      {/* 인트로 애니메이션 */}
      <div className={`intro ${showLogin ? 'fade-out' : ''}`}>
        <img src="/main-logo.gif" alt="인트로 로고" className="intro-image" />
      </div>

      {/* 로그인 화면 */}
      <div className={`login-wrapper ${showLogin ? 'fade-in' : ''}`}>
        <div className="logo-wrapper">
          <img src="/logo-main.png" alt="메인 로고" className="logo-image" />
        </div>
        <div className="button-wrapper">
          {!loading ? (
            <button onClick={handleGoogleLogin} className="google-login-button">
              Google 계정으로 로그인
            </button>
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
