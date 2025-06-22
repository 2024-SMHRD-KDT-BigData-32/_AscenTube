// src/App.js
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Layouts
import MainLayout from './layouts/MainLayout';

// Pages
import Dashboard from './pages/Dashboard';
import Contents from './pages/Contents';
import Keyword from './pages/Keyword';
import Comment from './pages/Comment'; // 이 import 구문은 원래부터 올바렸습니다.
import Ai from './pages/Ai';
import Login from './pages/Login';
import LoginCallback from './pages/LoginCallback';
import CategoryAnalysisPage from './pages/CategoryAnalysisPage';
import ChannelAnalysisPage from './pages/ChannelAnalysisPage';
import VidAnalysis from './pages/VidAnalysis';
import FavoriteChannels from './pages/FavoriteChannels';
import TestConnectionPage from './pages/TestConnectionPage';

// PrivateRoute: 로그인이 되어있어야만 접근 가능한 페이지들을 위한 HOC(Higher-Order Component)
const PrivateRoute = () => {
    // localStorage에 access_token이 있는지 확인하여 인증 여부를 판단합니다.
    const isAuthenticated = !!localStorage.getItem('access_token');
    // 인증되었다면 MainLayout을 통해 자식 라우트들을 보여주고, 아니라면 로그인 페이지로 리다이렉트합니다.
    return isAuthenticated ? <MainLayout /> : <Navigate to="/login" replace />;
};

const App = () => {
    return (
        <Routes>
            {/* 로그인 관련 경로는 항상 접근 가능해야 합니다. */}
            <Route path="/login" element={<Login />} />
            <Route path="/login-callback" element={<LoginCallback />} />

            {/* PrivateRoute로 감싸진 모든 경로는 로그인이 필요합니다. */}
            <Route element={<PrivateRoute />}>
                {/* 기본 경로 접속 시 /index로 자동 이동합니다. */}
                <Route index element={<Navigate to="index" replace />} />
                <Route path="index" element={<Dashboard />} />
                <Route path="contents" element={<Contents />} />
                <Route path="keyword" element={<Keyword />} />
                <Route path="comment" element={<Comment />} />
                <Route path="ai" element={<Ai />} />
                <Route path="category-analysis" element={<CategoryAnalysisPage />} />
                <Route path="vidanalysis" element={<VidAnalysis />} />
                <Route path="video/:videoId" element={<VidAnalysis />} />
                <Route path="channel/:channelId" element={<ChannelAnalysisPage />} />
                <Route path="admin" element={<TestConnectionPage />} />
                <Route path="favorite-channels" element={<FavoriteChannels />} />
            </Route>

            {/* 그 외 모든 경로로 접근 시 루트 경로로 이동하여 인증 상태를 다시 확인합니다. */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
};

export default App;
