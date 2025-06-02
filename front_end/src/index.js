import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles/base.css';
import { GoogleOAuthProvider } from '@react-oauth/google';

// ✅ 당신의 Google OAuth 클라이언트 ID 적용
const CLIENT_ID = '702957356108-m3p8gp3hackasnctsjsidgm1glm10po4.apps.googleusercontent.com';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <GoogleOAuthProvider clientId={CLIENT_ID}>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </GoogleOAuthProvider>
);
