// src/components/AudienceAnalysis.js
import React, { useState, useEffect } from 'react';
//import './AudienceAnalysis.css'; // 페이지 CSS에서 관리하거나, 필요시 이 파일 생성
// 실제 차트 라이브러리를 사용한다면 여기서 import (e.g., import { Doughnut, Bar } from 'react-chartjs-2';)

// 가짜 데이터 생성 함수 (이전과 동일)
const fetchAudienceData = async (categoryId) => {
  console.log(`Fetching audience data for category: ${categoryId}`);
  return new Promise(resolve => {
    setTimeout(() => {
      if (!categoryId) {
        resolve(null);
        return;
      }
      const malePercentage = Math.random() * 60 + 20;
      resolve({
        gender: { male: malePercentage, female: 100 - malePercentage },
        age: [
          { range: '13-17세', percent: Math.floor(Math.random() * 10) + 5 },
          { range: '18-24세', percent: Math.floor(Math.random() * 20) + 15 },
          { range: '25-34세', percent: Math.floor(Math.random() * 25) + 20 },
          { range: '35-44세', percent: Math.floor(Math.random() * 15) + 10 },
          { range: '45세 이상', percent: Math.floor(Math.random() * 10) + 5 },
        ],
      });
    }, 700);
  });
};


const AudienceAnalysis = ({ categoryId, categoryName }) => {
  const [audienceData, setAudienceData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (categoryId) {
      setLoading(true);
      fetchAudienceData(categoryId).then(data => {
        // 데이터의 percent 합계가 100%가 되도록 정규화 (옵션)
        if (data && data.age) {
            const totalPercent = data.age.reduce((sum, item) => sum + item.percent, 0);
            if (totalPercent > 0) { // 0으로 나누는 것 방지
                data.age = data.age.map(item => ({ ...item, percent: parseFloat(((item.percent / totalPercent) * 100).toFixed(1)) }));
            }
        }
        setAudienceData(data);
        setLoading(false);
      });
    } else {
      setAudienceData(null);
    }
  }, [categoryId]);

  if (!categoryId) {
    return null;
  }

  if (loading) {
    return <div className="loading-message">시청자 분석 로딩 중...</div>;
  }

  if (!audienceData) {
    return <p className="no-data-message">{categoryName} 카테고리의 시청자 분석 데이터가 없습니다.</p>;
  }

  return (
    <div className="analysis-section audience-analysis-section">
      <h3 className="section-title">{categoryName} 시청자 분석 (상위 채널 평균)</h3>
      <div className="audience-data-grid">
        <div className="audience-metric">
          <h4>성별 분포</h4>
          {audienceData.gender && (
            <p>남성: {audienceData.gender.male.toFixed(1)}% / 여성: {audienceData.gender.female.toFixed(1)}%</p>
            // 실제로는 여기에 도넛 차트 등
          )}
        </div>
        <div className="audience-metric">
          <h4>연령대 분포</h4>
          {audienceData.age && audienceData.age.map(item => (
            <div key={item.range} className="age-distribution-item">
              <span>{item.range}: {item.percent}%</span>
              <div className="age-bar-background">
                <div className="age-bar-fill" style={{ width: `${item.percent}%` }}></div>
              </div>
            </div>
          ))}
          {/* 실제로는 여기에 막대 차트 등 */}
        </div>
      </div>
    </div>
  );
};

export default AudienceAnalysis;