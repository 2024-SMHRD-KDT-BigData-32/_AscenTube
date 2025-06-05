import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LoginCallback = () => {
    const navigate = useNavigate();
    const location = useLocation(); // 현재 URL 정보를 가져오는 훅

    useEffect(() => {
        console.log('LoginCallback location.search:', location.search); // 실제 URL의 search 부분 전체를 로그로 출력

        const params = new URLSearchParams(location.search);
        const jwtToken = params.get('jwtToken');
        const userName = params.get('userName');
        const userEmail = params.get('userEmail');
        const googleId = params.get('googleId'); // 백엔드에서 googleId도 보내고 있으므로 추가
        const userThumbnailUrl = params.get('userThumbnailUrl'); // 백엔드에서 현재 보내지 않음
        const userChannelName = params.get('userChannelName');   // 백엔드에서 현재 보내지 않음
        const error = params.get('error');

        // 각 파라미터 값을 개별적으로 로깅
        console.log('Parsed jwtToken:', jwtToken);
        console.log('Parsed userName:', userName);
        console.log('Parsed userEmail:', userEmail);
        console.log('Parsed googleId:', googleId);
        console.log('Parsed userThumbnailUrl:', userThumbnailUrl);
        console.log('Parsed userChannelName:', userChannelName);
        console.log('Parsed error:', error);

        if (error) {
            console.error('Login Callback Error from backend: ', error);
            alert('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요. (오류: ' + error + ')');
            navigate('/login');
            return; 
        }

        // 필수 값들 (jwtToken, userName, userEmail)이 모두 유효한지 확인
        if (jwtToken && userName && userEmail) {
            localStorage.setItem('access_token', jwtToken);
            localStorage.setItem('user_name', userName);
            localStorage.setItem('user_email', userEmail);
            localStorage.setItem('google_id', googleId || '');

            if (userThumbnailUrl) {
                localStorage.setItem('user_thumbnail', userThumbnailUrl);
            }
            if (userChannelName) {
                localStorage.setItem('user_channel_name', userChannelName);
            }

            // 백그라운드로 토큰 및 사용자 정보 전송을 위한 커스텀 이벤트 발생
            window.dispatchEvent(new CustomEvent('ascenTubeTokenStored'));
            console.log('[LoginCallback.jsx] Dispatched ascenTubeTokenStored event.');

            navigate('/index');
        } else {
            console.error('Login Callback: Essential data missing after parsing: ', {
                jwtToken,
                userName,
                userEmail,
                googleId, // 로그에 googleId 추가
                userThumbnailUrl,
                userChannelName
            });
            alert('로그인 정보가 완전하지 않습니다. 다시 시도해주세요.');
            navigate('/login');
        }
    }, [location, navigate]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column', fontSize: '20px' }}>
            <div className="spinner" style={{ border: '4px solid rgba(0, 0, 0, 0.1)', borderTop: '4px solid #3498db', borderRadius: '50%', width: '40px', height: '40px', animation: 'spin 1s linear infinite' }} />
            <span style={{ marginTop: '20px' }}>로그인 처리 중입니다...</span>
            <style>{`
                @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
};

export default LoginCallback;