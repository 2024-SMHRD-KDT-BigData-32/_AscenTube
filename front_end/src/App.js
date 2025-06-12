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
        
        {/* 핵심 수정 부분  */}
        {/* 사이드바에서 사용하는 고정 경로와, 특정 영상에서 사용하는 동적 경로를 모두 등록합니다. */}
        {/* 두 경로 모두 VidAnalysis 컴포넌트를 보여줍니다. */}
        <Route path="vidanalysis" element={<VidAnalysis />} />
        <Route path="video/:videoId" element={<VidAnalysis />} />

        <Route path="channel/:channelId" element={<ChannelAnalysisPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/index" replace />} />
    </Routes>
  );
};

export default App;
