import React, { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const LoginCallback = () => {
    
    const navigate = useNavigate();
    const location = useLocation();     // 현재 URL 정보를 가져오는 훅

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const jwtToken = params.get('jwtToken');
        const userName = params.get('userName');
        const userEmail = params.get('userEmail');
        const userThumbnailUrl = params.get('userThumbnailUrl');
        const error = params.get('error');  // 백엔드에서 오류 발생 시 전달될 파라미터

        if (error) {
            console.error('Login Callback Error: ', error);
            alert('An error occurred while processing login. Please try again.');
            navigate('/login');
        }

        if (jwtToken && userName && userEmail) {
            localStorage.setItem('access_token', jwtToken);
            localStorage.setItem('user_name', userName);
            localStorage.setItem('user_email', userEmail);
            localStorage.setItem('user_thumbnail', userThumbnailUrl);

            navigate('/index');
        } else {
            console.error('Login Callback: Essential data missing: ', {jwtToken, userName, userEmail});
            alert('Some datas of login callback missing.');
            navigate('/login');
        }
    }, [location, navigate])
    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', fontSize: '20px' }}>
        <div className="spinner" style={{ border: '4px solid rgba(0, 0, 0, 0.1)', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
        <span style={{ marginTop: '20px' }}>로그인 처리 중입니다...</span>
        {/* 간단한 스피너 스타일, 실제로는 CSS 파일에 추가 */}
        <style>{`
            @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
            }
        `}</style>
        </div>
    );
}

export default LoginCallback