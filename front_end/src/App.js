import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Contents from './pages/Contents';
import Keyword from './pages/Keyword';
import Comment from './pages/Comment';
import Ai from './pages/Ai';
import Login from './pages/Login';
import LoginCallback from './pages/LoginCallback';
import CategoryAnalysisPage from './pages/CategoryAnalysisPage';
import ChannelAnalysisPage from './pages/ChannelAnalysisPage'; // 🚀 새로 추가할 페이지 import

const PrivateRoute = () => {
  // ✅ 로그인 토큰 체크: 'access_token'으로 변경
  const isAuthenticated = !!localStorage.getItem('access_token');
  return isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <Routes>
      {/* 초기 경로를 /login으로 보내거나, 인증 상태에 따라 /index로 보낼 수 있습니다.
          현재는 /login으로 직접 접근하거나, 인증 안된 경우 /login으로 리디렉션됩니다.
          인증 후 PrivateRoute 내부의 /index (Dashboard)로 기본 이동합니다.
      */}
      <Route path="/login" element={<Login />} />
      <Route path="/login-callback" element={<LoginCallback />} />

      {/* 인증이 필요한 라우트들 */}
      <Route element={<PrivateRoute />}> {/* MainLayout을 PrivateRoute가 렌더링 */}
        {/* PrivateRoute 접근 시 기본적으로 /index (Dashboard)로 이동 */}
        <Route index element={<Navigate to="index" replace />} />
        <Route path="index" element={<Dashboard />} />
        <Route path="contents" element={<Contents />} />
        <Route path="keyword" element={<Keyword />} />
        <Route path="comment" element={<Comment />} />
        <Route path="ai" element={<Ai />} />
        <Route path="category-analysis" element={<CategoryAnalysisPage />} />

        {/* 🚀 채널 분석 페이지 라우트 추가 */}
        {/* 예: /channel/채널ID 와 같은 형태로 접근 */}
        <Route path="channel/:channelId" element={<ChannelAnalysisPage />} />

      </Route>

      {/* 만약 "/" 경로로 접근 시 바로 /index로 보내고 싶다면,
          하지만 PrivateRoute가 "/"를 감싸고 있으므로,
          인증되지 않았다면 /login으로, 인증되었다면 PrivateRoute 내부의 index -> /index로 가게 됩니다.
          별도의 "/" 핸들링이 필요하다면 PrivateRoute 바깥에 정의해야 합니다.
          현재 구조에서는 특별히 필요 없어 보입니다.
      */}
        <Route path="/" element={<Navigate to="/index" replace />} />


    </Routes>
  );
};

export default App;