// src/pages/FavoriteChannels.js
import React, { useState } from 'react'; // useEffect는 현재 불필요하여 제거
import { MdSearch, MdAddCircleOutline } from 'react-icons/md';
import '../styles/pages/FavoriteChannels.css';

const FavoriteChannels = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [memoInput, setMemoInput] = useState('');

  const [registeredChannels, setRegisteredChannels] = useState([
    { id: 'ch_cm', name: '침착맨', url: 'https://www.youtube.com/@ChimChakMan_Official', description: '크롬 확장 기능 테스트용 관심 채널1' },
    { id: 'ch_jt', name: '조튜브', url: 'https://www.youtube.com/@jhotube', description: '크롬 확장 기능 테스트용 관심 채널2' },
  ]);

  // URL 디코딩 함수 (URL이 인코딩되어 있다면 표시할 때 디코딩)
  const decodeUrlIfEncoded = (url) => {
    try {
      // '%EB%B3%B4%EB%8B%A4' 같은 인코딩된 한글을 디코딩
      return decodeURIComponent(url);
    } catch (e) {
      return url; // 디코딩 실패 시 원본 URL 반환
    }
  };

  // 채널 검색 (URL 및 이름 기반)
  const handleSearch = () => {
    if (searchTerm.trim() === '') {
      setSearchResults([]);
      return;
    }

    const lowerCaseSearchTerm = searchTerm.toLowerCase();

    const allSearchableChannels = [
      { id: 'ch_cm_search', name: '침착맨', url: 'https://www.youtube.com/@ChimChakMan_Official', description: '침착맨의 공식 채널입니다.' },
      { id: 'ch_jt_search', name: '조튜브', url: 'https://www.youtube.com/@jhotube', description: '다양한 주제를 다루는 조튜브 채널입니다.' },
      { id: 'ch_boda_search', name: '보다 채널', url: 'https://www.youtube.com/@BODACORP', description: '과학과 지식을 탐구하는 채널입니다.' },
      { id: 'ch_test1', name: '테스트 채널 1', url: 'https://www.youtube.com/@testchannel1', description: '임시 테스트용 채널입니다.' },
      { id: 'ch_test2', name: '테스트 채널 2', url: 'https://www.youtube.com/@testchannel2', description: '또 다른 테스트 채널입니다.' },
    ];
    
    // URL이 정확히 일치하는 경우 우선 검색 (디코딩된 searchTerm과 비교)
    const foundByUrl = allSearchableChannels.find(channel => 
        channel.url.toLowerCase() === lowerCaseSearchTerm || 
        decodeUrlIfEncoded(channel.url).toLowerCase() === lowerCaseSearchTerm // 디코딩된 URL과도 비교
    );

    if (foundByUrl) {
        setSearchResults([foundByUrl]);
    } else {
        // 이름에 포함되는 경우 검색
        const filteredResults = allSearchableChannels.filter(channel =>
            channel.name.toLowerCase().includes(lowerCaseSearchTerm)
        );
        setSearchResults(filteredResults);
    }
  };

  // 채널 추가
  const handleAddChannel = (channelToAdd) => {
    // 이미 등록된 채널인지 URL로 확인 (디코딩된 URL로 비교)
    if (registeredChannels.some(channel => decodeUrlIfEncoded(channel.url) === decodeUrlIfEncoded(channelToAdd.url))) {
      alert(`${channelToAdd.name} 채널은 이미 등록되어 있습니다.`);
      return;
    }
    
    const newId = `reg_ch_${Date.now()}`; // 고유 ID 생성
    setRegisteredChannels(prevChannels => [
      ...prevChannels, 
      { 
        id: newId, 
        name: channelToAdd.name, 
        url: channelToAdd.url, 
        description: memoInput || channelToAdd.description || '새로 등록된 채널입니다.'
      }
    ]);
    setSearchTerm('');
    setSearchResults([]);
    setMemoInput(''); // 메모 입력 필드 초기화
  };

  // 채널 삭제
  const handleDeleteChannel = (idToDelete) => {
    if (window.confirm('정말로 이 채널을 삭제하시겠습니까?')) {
      setRegisteredChannels(prevChannels => prevChannels.filter(channel => channel.id !== idToDelete));
    }
  };

  // 채널 수정
  const handleEditChannel = (idToEdit) => {
    const channelToEdit = registeredChannels.find(channel => channel.id === idToEdit);
    if (channelToEdit) {
      const newDescription = prompt(`'${channelToEdit.name}' 채널의 설명을 수정하세요:`, channelToEdit.description);
      if (newDescription !== null) { // 취소 버튼 누르면 null 반환
        setRegisteredChannels(prevChannels => prevChannels.map(channel => 
          channel.id === idToEdit ? { ...channel, description: newDescription } : channel
        ));
      }
    }
  };

  return (
    <div className="favorite-channels-container">
      <div className="page-header">
        <h2 className="page-title">관심 채널 관리</h2>
      </div>

      {/* 채널 검색 및 추가 섹션 (이미지 기반 레이아웃) */}
      <div className="search-and-add-section-wrapper card">
        {/* ✅ h3를 검색 컨트롤과 같은 라인으로 배치 (CSS에서 flex로 정렬) */}
        <h3 className="search-section-title"><MdSearch /> 채널 검색 및 추가</h3> 
        
        <div className="search-controls-and-results">
          {/* 검색 입력창과 버튼 */}
          <div className="search-input-group-container">
            <input
              type="text"
              placeholder="https://www.youtube.com/@channelid 또는 채널 이름으로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => { if (e.key === 'Enter') handleSearch(); }}
              className="search-input-field"
            />
            <button onClick={handleSearch} className="icon-button search-button">
              검색
            </button>
          </div>

          {/* ✅ 메모 입력 필드 - 검색 입력창 바로 아래로 이동 */}
          <div className="memo-input-group">
            <input
              type="text"
              placeholder="채널에 대한 설명/메모를 입력하세요 (선택 사항)"
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              className="memo-field"
            />
          </div>

          {/* ✅ 검색 결과가 있을 때만 표시되는 영역 */}
          {searchResults.length > 0 && (
            <div className="search-results-display">
              {/* "검색 결과:" 제목 제거 */}
              <div className="table-container search-result-table">
                <table>
                  <thead>
                    <tr>
                      <th className="column-search-name">채널 이름</th>
                      <th className="column-search-url">URL</th>
                      <th className="column-search-description">설명</th>
                      <th className="column-search-action">액션</th>
                    </tr>
                  </thead>
                  <tbody>
                    {searchResults.map(channel => (
                      <tr key={channel.id}>
                        <td className="cell-search-name">{channel.name}</td>
                        <td className="cell-search-url">
                          <a href={decodeUrlIfEncoded(channel.url)} target="_blank" rel="noopener noreferrer">
                            {decodeUrlIfEncoded(channel.url)}
                          </a>
                        </td>
                        <td className="cell-search-description">{channel.description}</td>
                        <td className="cell-search-action">
                          <button onClick={() => handleAddChannel(channel)} className="add-button icon-button">
                            추가
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {searchResults.length === 0 && searchTerm.trim() !== '' && (
            <p className="no-results-message">검색 결과가 없습니다.</p>
          )}
        </div>
      </div>

      {/* 등록된 관심 채널 섹션 */}
      <div className="card registered-channels-section">
        <h3>등록된 채널</h3>
        {registeredChannels.length === 0 ? (
          <p className="no-favorites-message">등록된 채널이 없습니다.</p>
        ) : (
          <div className="table-container registered-channel-table">
            <table>
              <thead>
                <tr>
                  <th className="column-number"></th>
                  <th className="column-channel-name">채널 이름</th>
                  <th className="column-url">URL</th>
                  <th className="column-description">설명</th>
                  <th className="column-action"></th>
                </tr>
              </thead>
              <tbody>
                {registeredChannels.map((channel, index) => (
                  <tr key={channel.id}>
                    <td className="cell-number">{index + 1}</td>
                    <td className="cell-channel-name">{channel.name}</td>
                    <td className="cell-url">
                        <a href={decodeUrlIfEncoded(channel.url)} target="_blank" rel="noopener noreferrer">
                            {decodeUrlIfEncoded(channel.url)}
                        </a>
                    </td>
                    <td className="cell-description">{channel.description}</td>
                    <td className="cell-action">
                      <span className="action-link" onClick={() => handleDeleteChannel(channel.id)}>[삭제]</span>
                      <span className="action-divider"> / </span>
                      <span className="action-link" onClick={() => handleEditChannel(channel.id)}>[수정]</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default FavoriteChannels;