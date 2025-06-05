import React from 'react'; // useState는 selectedCategoryId에 대해 더 이상 사용하지 않으므로 제거해도 됩니다. (다른 곳에서 사용하지 않는다면)
import CategorySelector from '../components/CategorySelector';
import VideoAnalytics from '../components/VideoAnalytics';
import '../styles/pages/CategoryAnalysisPage.css';
import { useCategory } from '../contexts/CategoryContext'; // 🚀 useCategory 훅 import

const YOUTUBE_CATEGORIES = [
  { id: '1', name: '영화 및 애니메이션 (Film & Animation)' },
  { id: '2', name: '자동차 및 차량 (Autos & Vehicles)' },
  { id: '10', name: '음악 (Music)' },
  { id: '15', name: '애완동물 및 동물 (Pets & Animals)' },
  { id: '17', name: '스포츠 (Sports)' },
  { id: '19', name: '여행 및 이벤트 (Travel & Events)' },
  { id: '20', name: '게임 (Gaming)' },
  { id: '22', name: '인물 및 블로그 (People & Blogs)' },
  { id: '23', name: '코미디 (Comedy)' },
  { id: '24', name: '엔터테인먼트 (Entertainment)' },
  { id: '25', name: '뉴스 및 정치 (News & Politics)' },
  { id: '26', name: '스타일 (Howto & Style)' },
  { id: '27', name: '교육 (Education)' },
  { id: '28', name: '과학기술 (Science & Technology)' },
  { id: '29', name: '비영리 및 사회운동 (Nonprofits & Activism)' },
];

function CategoryAnalysisPage() {
  const { selectedCategoryId, setSelectedCategoryId } = useCategory();

  const handleCategoryChange = (categoryId) => {
    setSelectedCategoryId(categoryId); // Context의 setSelectedCategoryId 호출
  };

  const selectedCategory = YOUTUBE_CATEGORIES.find(cat => cat.id === selectedCategoryId);
  const categoryName = selectedCategory ? selectedCategory.name.split(' (')[0] : '';

  return (
    <div className="category-analysis-page">
      <h1 className="page-title">카테고리별 영상 심층 분석</h1>
      <CategorySelector
        categories={YOUTUBE_CATEGORIES}
        selectedCategoryId={selectedCategoryId} // Context에서 가져온 값
        onCategoryChange={handleCategoryChange} // Context 상태를 변경하는 함수
      />
      {selectedCategoryId ? (
        <div className="analysis-content-grid">
          <VideoAnalytics
            title="오늘의 인기 동영상 분석"
            categoryId={selectedCategoryId} // Context에서 가져온 값
            categoryName={categoryName}
            timePeriod="일간"
          />
          <VideoAnalytics
            title="주간 인기 동영상 분석"
            categoryId={selectedCategoryId} // Context에서 가져온 값
            categoryName={categoryName}
            timePeriod="주간"
          />
          <VideoAnalytics
            title="월간 인기 동영상 분석"
            categoryId={selectedCategoryId} // Context에서 가져온 값
            categoryName={categoryName}
            timePeriod="월간"
          />
        </div>
      ) : (
        <p className="info-message initial-message">분석할 카테고리를 선택해주세요.</p>
      )}
    </div>
  );
}

export default CategoryAnalysisPage;