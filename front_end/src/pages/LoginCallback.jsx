import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LoginCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        console.log('LoginCallback location.search:', location.search);

        const params = new URLSearchParams(location.search);

        // ✨✨✨ 모든 파라미터 선언을 한 번에 깔끔하게 정리합니다. ✨✨✨
        const jwtToken = params.get('jwtToken');
        const googleId = params.get('googleId'); // 백엔드에서 'googleId'로 보내는 값
        const userGoogleId = params.get('userGoogleId'); // 백엔드에서 'userGoogleId'로 보내는 값
        const userName = params.get('userName');
        const userEmail = params.get('userEmail');
        const userThumbnailUrl = params.get('userThumbnailUrl');
        const userChannelName = params.get('userChannelName');

        // ✨✨✨ 핵심 수정: 백엔드가 보내는 'userChannelId' 파라미터를 정확히 파싱합니다. ✨✨✨
        const youtubeChannelIdFromBackend = params.get('userChannelId'); 
        
        const error = params.get('error');

        // 각 파라미터 값을 개별적으로 로깅
        console.log('Parsed jwtToken:', jwtToken);
        console.log('Parsed googleId (primary):', googleId);
        console.log('Parsed userGoogleId (secondary):', userGoogleId);
        console.log('Parsed userName:', userName);
        console.log('Parsed userEmail:', userEmail);
        console.log('Parsed userThumbnailUrl:', userThumbnailUrl);
        console.log('Parsed userChannelName:', userChannelName);
        console.log('Parsed youtubeChannelId (from backend):', youtubeChannelIdFromBackend); // ✨ 로깅 메시지 변경
        console.log('Parsed error:', error);

        if (error) {
            console.error('Login Callback Error from backend: ', error);
            alert('로그인 처리 중 오류가 발생했습니다. 다시 시도해주세요. (오류: ' + error + ')');
            navigate('/login');
            return;
        }

        const finalGoogleId = googleId || userGoogleId; // 둘 중 하나라도 있으면 사용

        if (jwtToken && finalGoogleId && userName && userEmail) {
            localStorage.setItem('access_token', jwtToken);
            localStorage.setItem('user_google_id', finalGoogleId);
            localStorage.setItem('user_name', userName);
            localStorage.setItem('user_email', userEmail);

            if (userThumbnailUrl) {
                localStorage.setItem('user_thumbnail', userThumbnailUrl);
            }
            if (userChannelName) {
                localStorage.setItem('user_channel_name', userChannelName);
            }
            // ✨✨✨ 핵심 수정: 파싱한 youtubeChannelIdFromBackend 값을 localStorage에 저장 ✨✨✨
            if (youtubeChannelIdFromBackend) {
                localStorage.setItem('user_youtube_channel_id', youtubeChannelIdFromBackend);
            } else {
                console.warn('Backend did not provide a YouTube Channel ID via "userChannelId" parameter.');
                // 이 경고는 백엔드에서 userChannelId를 안 보낼 때만 나타납니다.
                // 만약 이 경고가 계속 나타난다면 백엔드에서 userChannelId가 제대로 오지 않는다는 뜻입니다.
            }

            window.dispatchEvent(new CustomEvent('ascenTubeTokenStored'));
            console.log('[LoginCallback.jsx] Dispatched ascenTubeTokenStored event.');

            navigate('/index');
        } else {
            console.error('Login Callback: Essential data missing after parsing: ', {
                jwtToken,
                finalGoogleId,
                userName,
                userEmail,
                userThumbnailUrl,
                userChannelName,
                youtubeChannelIdFromBackend // ✨ 로깅 메시지 변경
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