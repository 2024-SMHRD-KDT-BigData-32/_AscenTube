import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LoginCallback = () => {
    const navigate = useNavigate();
    const location = useLocation(); // 현재 URL 정보를 가져오는 훅

    useEffect(() => {
        console.log('LoginCallback location.search:', location.search);

        const params = new URLSearchParams(location.search);
        const jwtToken = params.get('jwtToken');
        const userGoogleId = params.get('userGoogleId');
        const userName = params.get('userName');
        const userEmail = params.get('userEmail');
<<<<<<< HEAD
        const googleId = params.get('googleId'); // 백엔드에서 googleId도 보내고 있으므로 추가
        const userThumbnailUrl = params.get('userThumbnailUrl'); // 백엔드에서 현재 보내지 않음
        const userChannelName = params.get('userChannelName');   // 백엔드에서 현재 보내지 않음
        const userChannelId = params.get('userChannelId');
=======
        const googleId = params.get('googleId');
        const userThumbnailUrl = params.get('userThumbnailUrl');
        const userChannelName = params.get('userChannelName');
        const youtubeChannelId = params.get('youtubeChannelId'); // ✨ 새로 추가: YouTube 채널 ID 파라미터 받기
>>>>>>> a28d4d5 (f:유튜브트랜스크립트 삭제)
        const error = params.get('error');

        // 각 파라미터 값을 개별적으로 로깅
        console.log('Parsed jwtToken:', jwtToken);
        console.log('Parsed userName:', userName);
        console.log('Parsed userEmail:', userEmail);
        console.log('Parsed googleId:', googleId);
        console.log('Parsed userThumbnailUrl:', userThumbnailUrl);
        console.log('Parsed userChannelName:', userChannelName);
        console.log('Parsed youtubeChannelId:', youtubeChannelId); // ✨ 새로 추가: 로그 출력
        console.log('Parsed error:', error);

        if (error) {
            console.error('Login Callback Error from backend: ', error);
            alert('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요. (오류: ' + error + ')');
            navigate('/login');
            return; 
        }

        if (jwtToken && userName && userEmail && userGoogleId) { // userGoogleId도 필수 확인
            localStorage.setItem('access_token', jwtToken);
            localStorage.setItem('user_google_id', userGoogleId);
            localStorage.setItem('user_name', userName);
            localStorage.setItem('user_email', userEmail);
            localStorage.setItem('google_id', googleId || '');

            if (userThumbnailUrl) {
                localStorage.setItem('user_thumbnail', userThumbnailUrl);
            }
            if (userChannelName) {
                localStorage.setItem('user_channel_name', userChannelName);
            }
<<<<<<< HEAD
            if (userChannelId) {
                localStorage.setItem('user_channel_id', userChannelId);
            }

=======
            // ✨ 새로 추가: youtubeChannelId가 있다면 localStorage에 저장
            if (youtubeChannelId) {
                localStorage.setItem('user_youtube_channel_id', youtubeChannelId);
            } else {
                console.warn('Backend did not provide youtubeChannelId in callback.');
                // 여기에 기본값 설정 또는 오류 처리 로직 추가 가능
            }
>>>>>>> a28d4d5 (f:유튜브트랜스크립트 삭제)

            window.dispatchEvent(new CustomEvent('ascenTubeTokenStored'));
            console.log('[LoginCallback.jsx] Dispatched ascenTubeTokenStored event.');

            navigate('/index');
        } else {
            console.error('Login Callback: Essential data missing after parsing: ', {
                jwtToken,
                userName,
                userEmail,
                googleId,
                userGoogleId, // 추가
                userThumbnailUrl,
                userChannelName,
                youtubeChannelId // 추가
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