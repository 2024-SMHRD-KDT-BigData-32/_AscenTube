// src/App.js
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
import ChannelAnalysisPage from './pages/ChannelAnalysisPage';
import VidAnalysis from './pages/VidAnalysis';
import FavoriteChannels from './pages/FavoriteChannels'; // ✅ FavoriteChannels 컴포넌트 임포트

import TestConnectionPage from './pages/TestConnectionPage'; // 🚀 새로 만든 테스트 페이지 import

const PrivateRoute = () => {
  const isAuthenticated = !!localStorage.getItem('access_token');
  return isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />;
};

const App = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/login-callback" element={<LoginCallback />} />

      <Route element={<PrivateRoute />}>
        <Route index element={<Navigate to="index" replace />} />
        <Route path="index" element={<Dashboard />} />
        <Route path="contents" element={<Contents />} />
        <Route path="keyword" element={<Keyword />} />
        <Route path="comment" element={<Comment />} />
        <Route path="ai" element={<Ai />} />
        <Route path="category-analysis" element={<CategoryAnalysisPage />} />

        {/* 핵심 수정 부분: 'vidanalysis' 경로를 'video-analysis'로 변경하여 Link와 일치시킵니다. */}
        {/* 이렇게 하면 Link to="/video-analysis?videoId=..." 요청을 VidAnalysis 컴포넌트가 받게 됩니다. */}
        <Route path="video-analysis" element={<VidAnalysis />} />
        
        {/* 만약 /video/VIDEO_ID 형태의 직접적인 경로도 필요하다면 유지합니다. */}
        {/* 이 경우 VidAnalysis 컴포넌트 내에서 useParams를 사용하여 videoId를 가져와야 합니다. */}
        <Route path="video/:videoId" element={<VidAnalysis />} />

        <Route path="channel/:channelId" element={<ChannelAnalysisPage />} />

  `     {/* 🚀 테스트 페이지 라우트 추가 */}
        <Route path="admin" element={<TestConnectionPage />} />

      </Route>

      {/* 루트 경로 ('/')로 접근 시 인증 여부에 따라 'index' 또는 'login'으로 리다이렉트 */}
      <Route path="/" element={<Navigate to="/index" replace />} />
    </Routes>
  );
};

export default App;
