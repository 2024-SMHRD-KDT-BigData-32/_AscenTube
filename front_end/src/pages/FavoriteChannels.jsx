import React, { useState } from 'react';
import { MdSearch, MdAddCircleOutline } from 'react-icons/md';
import PageLayout from '../layouts/PageLayout';
import '../styles/pages/FavoriteChannels.css';

const FavoriteChannels = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [memoInput, setMemoInput] = useState('');
  const [filterTerm, setFilterTerm] = useState('');

  const [registeredChannels, setRegisteredChannels] = useState([
    { id: 'ch_cm', name: '침착맨', url: 'https://www.youtube.com/@ChimChakMan_Official', description: '크롬 확장 기능 테스트용 관심 채널1' },
    { id: 'ch_jt', name: '조튜브', url: 'https://www.youtube.com/@jhotube', description: '크롬 확장 기능 테스트용 관심 채널2' },
  ]);

  // URL 디코딩 함수
  const decodeUrlIfEncoded = (url) => {
    try {
      return decodeURIComponent(url);
    } catch (e) {
      return url;
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

    const foundByUrl = allSearchableChannels.find(channel =>
      channel.url.toLowerCase() === lowerCaseSearchTerm ||
      decodeUrlIfEncoded(channel.url).toLowerCase() === lowerCaseSearchTerm
    );

    if (foundByUrl) {
      setSearchResults([foundByUrl]);
    } else {
      const filteredResults = allSearchableChannels.filter(channel =>
        channel.name.toLowerCase().includes(lowerCaseSearchTerm)
      );
      setSearchResults(filteredResults);
    }
  };

  // 채널 추가
  const handleAddChannel = (channelToAdd) => {
    if (registeredChannels.some(channel => decodeUrlIfEncoded(channel.url) === decodeUrlIfEncoded(channelToAdd.url))) {
      // --- 에러 수정 부분: 템플릿 리터럴을 문자열 합치기로 변경 ---
      alert(channelToAdd.name + ' 채널은 이미 등록되어 있습니다.');
      return;
    }

    // --- 코드 정리: 템플릿 리터럴 내 불필요한 공백 제거 ---
    const newId = `reg_ch_${Date.now()}`;
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
    setMemoInput('');
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
      const newDescription = prompt(`'${channelToEdit.name}' 채널의 설명을 수정하세요: `, channelToEdit.description);
      if (newDescription !== null) {
        setRegisteredChannels(prevChannels => prevChannels.map(channel =>
          channel.id === idToEdit ? { ...channel, description: newDescription } : channel
        ));
      }
    }
  };

  // 등록된 채널 필터링
  const filteredChannels = registeredChannels.filter(channel =>
    channel.name.toLowerCase().includes(filterTerm.toLowerCase()) ||
    decodeUrlIfEncoded(channel.url).toLowerCase().includes(filterTerm.toLowerCase())
  );

  return (
    <PageLayout
      title="관심 채널 관리"
      searchPlaceholder="채널 이름 검색..."
      onSearchChange={(e) => setFilterTerm(e.target.value)}
      onSearchSubmit={() => {
        if (!filterTerm.trim()) {
          alert('검색어를 입력하세요.');
        } else if (filteredChannels.length === 0) {
          alert('검색 결과가 없습니다.');
        }
      }}
    >
      <div className="favorite-channels-page">
        <div className="page-section search-and-add-section-wrapper card">
          <h3 className="search-section-title"><MdSearch /> 채널 검색 및 추가</h3>
          <div className="search-controls-and-results">
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
            <div className="memo-input-group">
              <input
                type="text"
                placeholder="채널에 대한 설명/메모를 입력하세요 (선택 사항)"
                value={memoInput}
                onChange={(e) => setMemoInput(e.target.value)}
                className="memo-field"
              />
            </div>
            {searchResults.length > 0 && (
              <div className="search-results-display">
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
        <div className="page-section registered-channels-section card">
          <h3>등록된 채널</h3>
          {filteredChannels.length === 0 ? (
            <p className="no-favorites-message">등록된 채널이 없습니다.</p>
          ) : (
            <div className="table-container registered-channel-table">
              <table>
                <thead>
                  <tr>
                    <th className="column-number">#</th>
                    <th className="column-channel-name">채널 이름</th>
                    <th className="column-url">URL</th>
                    <th className="column-description">설명</th>
                    <th className="column-action">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredChannels.map((channel, index) => (
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
                        <button className="edit-button" onClick={() => handleEditChannel(channel.id)}>수정</button>
                        <span className="action-divider">/</span>
                        <button className="delete-button" onClick={() => handleDeleteChannel(channel.id)}>삭제</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
};

export default FavoriteChannels;