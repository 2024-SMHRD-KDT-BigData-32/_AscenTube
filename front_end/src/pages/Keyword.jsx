import React from 'react';
import '../styles/pages/Keyword.css';

const Keyword = () => {
  return (
    <div className="keyword-container">
      <header className="keyword-header">
        <h1>키워드 분석</h1>
        <input type="text" placeholder="키워드 검색" />
      </header>

      <main className="keyword-main">
        <section className="keyword-section">
          <h2>영상별 키워드 워드클라우드</h2>
          <p>개별 영상에서 자주 등장한 키워드를 시각화한 결과입니다.</p>
          <div className="cloud-box">
            [여기에 워드클라우드 이미지 또는 WordCloud.js 삽입]
          </div>
        </section>

        <section className="keyword-section">
          <h2>채널 전체 키워드 빈도 시각화</h2>
          <p>전체 채널 데이터를 기반으로 자주 언급되는 키워드를 시각화합니다.</p>
          <div className="cloud-box">
            [전체 키워드 빈도 워드클라우드 자리]
          </div>
        </section>
      </main>
    </div>
  );
};

export default Keyword;
