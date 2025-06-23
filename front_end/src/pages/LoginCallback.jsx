import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const LoginCallback = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const [message, setMessage] = useState('로그인 처리 중입니다...');
    const [isError, setIsError] = useState(false);

    useEffect(() => {
        console.log('LoginCallback location.search:', location.search);

        const params = new URLSearchParams(location.search);

        const jwtToken = params.get('jwtToken');
        const googleId = params.get('googleId'); // 백엔드에서 'googleId'로 보내는 값
        const userGoogleId = params.get('userGoogleId'); // 백엔드에서 'userGoogleId'로 보내는 값
        const userName = params.get('userName');
        const userEmail = params.get('userEmail');
        const userThumbnailUrl = params.get('userThumbnailUrl');
        const userChannelName = params.get('userChannelName');

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
            setIsError(true);
            let errorMessage = '로그인 중 알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.';

            if (error === 'login_canceled_or_failed') {
                errorMessage = 'Google 로그인 과정이 취소되었거나 실패했습니다.';
            } else if (error === 'malformed_callback_request') {
                errorMessage = '잘못된 로그인 요청입니다.';
            } else if (error === 'login_failed') {
                errorMessage = '로그인 처리 중 서버 오류가 발생했습니다.'; // 백엔드에서 'login_failed'로 보낼 수 있는 일반적인 오류
            }
            // 백엔드에서 보낼 수 있는 다른 'error' 코드들도 여기에 추가하여 메시지 커스터마이징 가능

            setMessage(errorMessage + ' 서비스 메인 화면으로 돌아갑니다.');

            // 오류 발생 시 서비스 맨 처음 화면으로 바로 리다이렉트
            setTimeout(() => {
                navigate('/login'); // 서비스의 맨 처음 화면 또는 로그인 페이지 경로
            }, 0); // 2초 후 리다이렉트 (사용자가 메시지를 읽을 시간 제공)

            return; // 이후 로직 실행 방지
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
                youtubeChannelIdFromBackend
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