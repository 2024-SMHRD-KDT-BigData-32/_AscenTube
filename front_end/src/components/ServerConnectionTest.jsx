// src/components/ServerConnectionTest.jsx

import React, { useState } from 'react';
import axios from 'axios';

const ServerConnectionTest = () => {
  const [message, setMessage] = useState('서버 응답 대기 중...');

  // 원래의 흰색 테마 스타일
  const boxStyle = {
    border: '2px solid #ddd',
    padding: '20px',
    borderRadius: '10px',
    marginTop: '20px',
    width: '500px',
  };

  const buttonStyle = {
    margin: '5px',
    padding: '10px 15px',
    cursor: 'pointer',
    border: '1px solid #ccc',
    borderRadius: '5px',
    backgroundColor: '#f0f0f0',
  };

  const messageStyle = {
    marginTop: '20px',
    padding: '10px',
    backgroundColor: '#f0f0f0',
    borderRadius: '5px',
    fontFamily: 'monospace',
    textAlign: 'left',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    color: '#333', // 어두운 글자색
  };

  // 1. 기존 백엔드(Spring) 서버 상태 확인 테스트
  const checkMainServer = async () => {
    setMessage('메인 서버(Spring)에 연결을 시도합니다...');
    try {
      const response = await axios.get('http://localhost:8082/AscenTube/api/health-check');
      console.log('메인 서버 응답:', response.data);
      setMessage(`✅ 메인 서버 연결 성공: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('메인 서버 연결 실패:', error);
      setMessage(`❌ 메인 서버 연결 실패: ${error.message}`);
    }
  };

  // 2. 크롤링 서버(Python) 상태 확인 테스트
  const checkCrawlingServer = async () => {
    setMessage('크롤링 서버(Python)에 연결을 시도합니다...');
    try {
      const response = await axios.get('http://localhost:8000/');
      console.log('크롤링 서버 응답:', response.data);
      setMessage(`✅ 크롤링 서버 연결 성공: ${JSON.stringify(response.data, null, 2)}`);
    } catch (error) {
      console.error('크롤링 서버 연결 실패:', error);
      setMessage(`❌ 크롤링 서버 연결 실패: ${error.message}`);
    }
  };

  // 3. 통합 크롤링 수동 실행 테스트
  const triggerDailyCrawl = async () => {
    setMessage('통합 일일 크롤링 실행을 요청합니다...');
    try {
      const response = await axios.post('http://localhost:8000/api/crawl/trigger-daily');
      console.log('크롤링 실행 응답:', response.data);
      setMessage(`✅ 크롤링 실행 요청 성공: ${response.data.message}`);
    } catch (error) {
      console.error('크롤링 실행 실패:', error);
      setMessage(`❌ 크롤링 실행 실패: ${error.message}`);
    }
  };

  return (
    <div style={boxStyle}>
      <h3>서버 연동 테스트</h3>
      <div>
        <button onClick={checkMainServer} style={buttonStyle}>1. 메인 서버(Spring) 연결 확인</button>
        <button onClick={checkCrawlingServer} style={buttonStyle}>2. 크롤링 서버(Python) 연결 확인</button>
        <button onClick={triggerDailyCrawl} style={buttonStyle}>3. 통합 크롤링 수동 실행</button>
      </div>
      <div style={messageStyle}>{message}</div>
    </div>
  );
};

export default ServerConnectionTest;