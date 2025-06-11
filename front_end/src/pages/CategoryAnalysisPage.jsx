import React from 'react';
import CategorySelector from '../components/CategorySelector';
import VideoAnalytics from '../components/VideoAnalytics';
import '../styles/pages/CategoryAnalysisPage.css';
import { useCategory } from '../contexts/CategoryContext';

const YOUTUBE_CATEGORIES = [
  { id: '1', name: '영화 및 애니메이션 (Film & Animation)' },
  { id: '2', name: '자동차 및 차량 (Autos & Vehicles)' },
  { id: '10', name: '음악 (Music)' },
  { id: '15', name: '애완동물 및 동물 (Pets & Animals)' },
  { id: '17', name: '스포츠 (Sports)' },
  { id: '20', name: '게임 (Gaming)' },
  { id: '22', name: '인물 및 블로그 (People & Blogs)' },
  { id: '23', name: '코미디 (Comedy)' },
  { id: '24', name: '엔터테인먼트 (Entertainment)' },
  { id: '25', name: '뉴스 및 정치 (News & Politics)' },
  { id: '26', name: '스타일 (Howto & Style)' },
  { id: '28', name: '과학기술 (Science & Technology)' },
];

function CategoryAnalysisPage() {
  const { selectedCategoryId, setSelectedCategoryId } = useCategory();

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId);
  };

  const selectedCategory = YOUTUBE_CATEGORIES.find(cat => cat.id === selectedCategoryId);
  const categoryName = selectedCategory ? selectedCategory.name.split(' (')[0] : '';

  return (
    <div className="category-analysis-page">
      <h1 className="page-title">카테고리별 영상 심층 분석</h1>
      <CategorySelector
        categories={YOUTUBE_CATEGORIES}
        selectedCategoryId={selectedCategoryId}
        onCategoryChange={handleCategoryChange}
      />
      {selectedCategoryId ? (
        // ✨ 그리드 레이아웃을 단일 레이아웃으로 변경합니다.
        <div className="analysis-content-single">
          {/* ✨ '오늘'만 남기고, 제목을 변경하며, timePeriod는 'daily'로 유지합니다. */}
          <VideoAnalytics
            title="인기 동영상 분석"
            categoryId={selectedCategoryId}
            categoryName={categoryName}
            timePeriod="일간"
          />
          {/* 주간 및 월간 VideoAnalytics 컴포넌트는 제거되었습니다. */}
        </div>
      ) : (
        <p className="info-message initial-message">분석할 카테고리를 선택해주세요.</p>
      )}
    </div>
  );
}

export default CategoryAnalysisPage;