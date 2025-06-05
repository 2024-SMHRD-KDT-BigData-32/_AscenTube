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
import VidAnalysis from './pages/VidAnalysis'; // ✅ 영상 분석 페이지 import (정상)

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
        {/* 경로에서 하이픈 제거 */}
        <Route path="vidanalysis" element={<VidAnalysis />} /> {/* ✅ 수정된 경로 */}
        <Route path="channel/:channelId" element={<ChannelAnalysisPage />} />
      </Route>

      <Route path="/" element={<Navigate to="/index" replace />} />
    </Routes>
  );
};

export default App;