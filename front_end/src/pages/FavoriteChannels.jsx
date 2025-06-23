import React, { useState, useEffect, useCallback } from 'react';
import { MdSearch } from 'react-icons/md';
import PageLayout from '../layouts/PageLayout';
import {
    fetchFavoriteChannels,
    searchChannels,
    addFavoriteChannel, 
    updateFavoriteChannel,
    deleteFavoriteChannel
} from '../api/favoriteChannelApi';
import '../styles/pages/FavoriteChannels.css';

const FavoriteChannels = () => {
    const [registeredChannels, setRegisteredChannels] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [loading, setLoading] = useState(true); 
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [memoInputs, setMemoInputs] = useState({});
    const [filterTerm, setFilterTerm] = useState(''); 

    const loadRegisteredChannels = useCallback(async () => {
        try {
            setLoading(true);
            const googleId = localStorage.getItem('user_google_id');
            if (!googleId) throw new Error("로그인 정보(user_google_id)를 찾을 수 없습니다.");
            const channels = await fetchFavoriteChannels(googleId);
            setRegisteredChannels(channels);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadRegisteredChannels();
    }, [loadRegisteredChannels]);


    const handleSearch = async () => {
        if (!searchTerm.trim()) return;
        try {
            const googleId = localStorage.getItem('user_google_id');
            if (!googleId) throw new Error("로그인 정보(user_google_id)를 찾을 수 없습니다.");
            const results = await searchChannels(googleId, searchTerm);
            setSearchResults(results);
            // 검색 결과 객체의 실제 필드명을 확인하기 위한 콘솔 로그 추가
            if (results.length > 0) {
                console.log("=== 검색 결과 채널 객체 필드 확인 ===");
                console.log("results[0]:", results[0]);
                console.log("results[0].channelId (또는 cnlId?):", results[0].channelId || results[0].cnlId);
                console.log("results[0].channelName (또는 cnlName?):", results[0].channelName || results[0].cnlName);
                console.log("results[0].channelUrl (또는 cnlUrl?):", results[0].channelUrl || results[0].cnlUrl);
                console.log("===================================");
            }
            if(results.length === 0) alert('검색 결과가 없습니다.');
        } catch (err) {
            alert(`채널 검색 중 오류 발생: ${err.message}`);
        }
    };
    
    const handleMemoChange = (channelId, value) => {
        setMemoInputs(prev => ({ ...prev, [channelId]: value }));
    };

    // [최종 수정] handleAddChannel 함수: 동적 데이터 사용 및 중복 확인 로직 복구
    const handleAddChannel = async (channelToAdd) => {
        // channelToAdd는 검색 결과 (searchResults)에서 넘어온 채널 객체입니다.
        // 이 객체는 channelId, channelName, channelUrl 등을 포함합니다.
        // 또는 검색 결과 API에 따라 cnlId, cnlName, cnlUrl을 가질 수도 있습니다.

        // 중복 확인 로직: channelToAdd의 ID를 기준으로 이미 등록되었는지 확인
        // 검색 결과 객체의 ID 필드가 channelId일 수도 있고, cnlId일 수도 있으므로 둘 다 확인
        const idToCheck = channelToAdd.channelId || channelToAdd.cnlId;
        if (registeredChannels.some(c => c.cnlId === idToCheck)) { 
            alert(`'${channelToAdd.channelName || channelToAdd.cnlName}' 채널은 이미 등록되어 있습니다.`);
            return; // 중복이면 여기서 함수 종료
        }

        try {
            const googleId = localStorage.getItem('user_google_id');
            if (!googleId) throw new Error("로그인 정보(user_google_id)를 찾을 수 없습니다.");
            
            // --- ▼▼▼ 동적 데이터 구성 (FavoriteChannelRequestDto 필드명에 맞춰 정확히 매핑) ▼▼▼ ---
            // 검색 결과 `channelToAdd` 객체의 필드명을 `FavoriteChannelRequestDto`에 맞춰 매핑합니다.
            // 검색 결과가 `cnlId`, `cnlName`, `cnlUrl` 필드를 반환한다고 가정하고 매핑하겠습니다.
            const channelDataToSend = {
                channelId: channelToAdd.cnlId, // 검색 결과의 cnlId를 백엔드의 channelId로 매핑
                channelName: channelToAdd.cnlName, // 검색 결과의 cnlName을 백엔드의 channelName으로 매핑
                channelUrl: channelToAdd.cnlUrl, // 검색 결과의 cnlUrl을 백엔드의 channelUrl로 매핑
                cnlMemo: memoInputs[channelToAdd.cnlId] || "", // 메모 입력 필드의 ID도 cnlId 기준으로 가져옵니다.
            };
            
            console.log("서버로 보내는 googleId (쿼리 파람):", googleId); 
            console.log("서버로 보내는 Body 데이터 (FavoriteChannelRequestDto에 맞춤 - 동적):", channelDataToSend);
            // --- ▲▲▲ 동적 데이터 구성 ▲▲▲ ---
            
            const newChannel = await addFavoriteChannel(googleId, channelDataToSend); 
            
            alert(`'${newChannel.cnlName}' 채널이 성공적으로 추가되었습니다!`); 
            await loadRegisteredChannels(); // 목록 갱신 
            setSearchResults([]); // 검색 결과창 닫기
            
        } catch (err) {
            // 백엔드에서 400 Bad Request로 '이미 등록됨'을 반환하는 경우를 처리
            if (err.response && err.response.data && typeof err.response.data === 'string' && err.response.data.includes("이미 관심 채널로 등록되어 있습니다")) {
                alert(err.response.data); // 백엔드로부터 받은 상세 에러 메시지를 표시
            } else {
                alert(`채널 추가 중 오류 발생: ${err.message}`); // 그 외의 일반적인 오류
            }
        }
    };

    const handleDeleteChannel = async (favId) => {
        try {
            const confirmDelete = window.confirm("정말로 이 채널을 삭제하시겠습니까?");
            if (confirmDelete) {
                await deleteFavoriteChannel(favId);
                setRegisteredChannels(prev => prev.filter(channel => channel.favId !== favId));
                alert("채널이 성공적으로 삭제되었습니다.");
            }
        } catch (err) {
            alert(`채널 삭제 중 오류 발생: ${err.message}`);
        }
    };

    const handleEditChannel = async (channelToEdit) => {
        const newMemo = prompt("새로운 메모를 입력하세요:", channelToEdit.cnlMemo);
        if (newMemo !== null) { 
            try {
                const memoData = { cnlMemo: newMemo };
                const updatedChannel = await updateFavoriteChannel(channelToEdit.favId, memoData);
                setRegisteredChannels(prev =>
                    prev.map(channel =>
                        channel.favId === updatedChannel.favId ? updatedChannel : channel
                    )
                );
                alert("메모가 성공적으로 수정되었습니다.");
            } catch (err) {
                alert(`메모 수정 중 오류 발생: ${err.message}`);
            }
        }
    };

    const filteredRegisteredChannels = registeredChannels.filter(channel =>
        channel.cnlName.toLowerCase().includes(filterTerm.toLowerCase()) ||
        (channel.cnlUrl && channel.cnlUrl.toLowerCase().includes(filterTerm.toLowerCase()))
    );

    if (error) return <PageLayout title="관심 채널 관리"><div>오류: {error}</div></PageLayout>;

    return (
        <PageLayout
            title="관심 채널 관리"
            searchPlaceholder="등록된 채널 검색..."
            onSearchChange={(e) => setFilterTerm(e.target.value)}
        >
            <div className="favorite-channels-page">
                {/* 검색 및 추가 섹션 */}
                <div className="page-section search-and-add-section-wrapper card">
                    <h3 className="search-section-title"><MdSearch /> 채널 검색 및 추가</h3>
                    <div className="search-input-group-container">
                        <input
                            type="text"
                            placeholder="채널 이름 또는 URL로 검색..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <button onClick={handleSearch}>검색</button>
                    </div>
                    {searchResults.length > 0 && (
                        <div className="search-results-display">
                            <table>
                                <thead><tr><th>채널 이름</th><th>URL</th><th>구독자 수</th><th>메모</th><th>액션</th></tr></thead>
                                <tbody>
                                    {searchResults.map(channel => (
                                        <tr key={channel.channelId}> {/* channel.channelId 사용 */}
                                            <td>{channel.channelName}</td> {/* channel.channelName 사용 */}
                                            <td><a href={`https://www.youtube.com/channel/${channel.channelId}`} target="_blank" rel="noopener noreferrer">채널 방문</a></td>
                                            <td>{new Intl.NumberFormat().format(channel.subscriberCount)}</td>
                                            <td>
                                                <input 
                                                    type="text" 
                                                    placeholder="메모 입력 (선택)" 
                                                    className="memo-input-small" 
                                                    onChange={e => handleMemoChange(channel.channelId)} // channel.channelId 사용
                                                    value={memoInputs[channel.channelId] || ''} // channel.channelId 사용
                                                />
                                            </td>
                                            <td className="action-cell-add">
                                                {/* 이제 동적 데이터로 채널이 추가됩니다. */}
                                                <button onClick={() => handleAddChannel(channel)} className="add-button-small">추가</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                {/* 등록된 채널 목록 섹션 */}
                <div className="page-section registered-channels-section card">
                    <h3>등록된 채널 목록</h3>
                    {loading ? <p>로딩 중...</p> : (
                        <table>
                            <thead><tr><th>#</th><th>채널 이름</th><th>URL</th><th>메모</th><th>관리</th></tr></thead>
                            <tbody>
                                {filteredRegisteredChannels.map((channel, index) => (
                                    <tr key={channel.favId}>
                                        <td>{index + 1}</td>
                                        <td>{channel.cnlName}</td>
                                        <td><a href={channel.cnlUrl} target="_blank" rel="noopener noreferrer">채널 방문</a></td>
                                        <td>{channel.cnlMemo}</td>
                                        <td className="action-cell-manage">
                                            <button onClick={() => handleEditChannel(channel)} className="edit-button">수정</button>
                                            <button onClick={() => handleDeleteChannel(channel.favId)} className="delete-button">삭제</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                     { !loading && filteredRegisteredChannels.length === 0 && <p>등록된 관심 채널이 없습니다.</p>}
                </div>
            </div>
        </PageLayout>
    );
};

export default FavoriteChannels;