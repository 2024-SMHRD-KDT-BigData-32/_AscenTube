import React, { useState, useEffect } from 'react';
import '../styles/pages/Dashboard.css'; // Dashboard.css 파일에서 공통 스타일을 가져옵니다.
// NOTE: CategorySelector와 VideoAnalytics 컴포넌트의 스타일은 이 파일에서 직접 다루지 않습니다.
//       이 컴포넌트들 자체의 스타일링은 해당 컴포넌트 파일이나 관련 CSS 파일에서 이루어져야 합니다.
import CategorySelector from '../components/CategorySelector'; // 우리가 수정할 자식 컴포넌트
import VideoAnalytics from '../components/VideoAnalytics'; // 기존 영상 목록 컴포넌트
import { fetchTotalViewsForCategory } from '../api/youtubeApi';

// 분석할 카테고리 목록
const CATEGORIES_TO_ANALYZE = [
    { name: '전체', id: '0' },
    { name: '영화 및 애니메이션', id: '1' },
    { name: '자동차 및 차량', id: '2' },
    { name: '음악', id: '10' },
    { name: '애완동물 및 동물', id: '15' },
    { name: '스포츠', id: '17' },
    { name: '게임', id: '20' },
    { name: '인물 및 블로그', id: '22' },
    { name: '코미디', id: '23' },
    { name: '엔터테인먼트', id: '24' },
    { name: '뉴스 및 정치', id: '25' },
    { name: '스타일', id: '26' },
    { name: '과학기술', id: '28' },
];

const CategoryAnalysisPage = () => {
    // API로 가져온 데이터와 그래프 너비까지 계산해서 저장할 상태
    const [categoryData, setCategoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // 사용자가 최종 선택한 카테고리를 관리하는 상태
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES_TO_ANALYZE[0]);

    useEffect(() => {
        const fetchAllCategoryData = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('access_token');
            const userId = localStorage.getItem('user_google_id');

            // '전체'를 제외한 모든 카테고리에 대해 API 병렬 호출
            const promises = CATEGORIES_TO_ANALYZE.slice(1).map(cat => 
                fetchTotalViewsForCategory(cat.id, token, userId)
            );
            
            const viewResults = await Promise.all(promises);
            const maxViews = Math.max(...viewResults);

            const processedData = CATEGORIES_TO_ANALYZE.map((cat, index) => {
                const views = index === 0 ? 0 : viewResults[index - 1];
                return {
                    ...cat,
                    views: views,
                    barWidth: maxViews > 0 ? (views / maxViews) * 100 : 0,
                };
            });

            setCategoryData(processedData);
            setIsLoading(false);
        };

        fetchAllCategoryData();
    }, []);

    // 자식(CategorySelector)으로부터 선택된 카테고리 정보를 받는 핸들러
    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
    };

    return (
        // [수정 시작] 페이지 전체 컨테이너를 dashboard-container 클래스로 변경
        <div className="dashboard-container">
            {/* 헤더 영역: 대시보드 및 AI 콘텐츠 전략 코치 페이지와 동일한 레이아웃 */}
            <header className="dashboard-header">
                <h1>카테고리별 트렌드 분석 <span className="section-subtitle"></span></h1>
                <input type="text" placeholder="카테고리 검색..." /> {/* 검색창 추가 */}
            </header>
            
            {/* 메인 콘텐츠 영역: 기존 main 태그는 유지하고, 스타일을 위해 dashboard-main 클래스를 적용할 수 있습니다.
                하지만 여기서는 헤더 변경만 요청하셨으므로, main 태그에 대한 직접적인 클래스 추가는 생략합니다.
                CategorySelector와 VideoAnalytics를 감싸는 div에 스타일을 적용하는 것은 이 파일의 책임 밖입니다.
                (기존 스타일링 유지를 위해)
            */}
            <div style={{ padding: '20px' }}> {/* 기존 콘텐츠 영역의 padding 스타일 유지 */}
            {/* [수정 끝] */}
            
                {/* CategorySelector에 필요한 모든 데이터를 props로 전달 */}
                <CategorySelector
                    items={categoryData}
                    isLoading={isLoading}
                    selectedItem={selectedCategory}
                    onSelect={handleCategorySelect}
                />

                <hr style={{ margin: '30px 0', border: '1px solid #eee' }} />
                
                {/* 선택된 카테고리가 있을 때만 VideoAnalytics를 렌더링 */}
                {selectedCategory && selectedCategory.id !== '0' && (
                        <VideoAnalytics 
                            key={selectedCategory.id} // key를 추가하여 카테고리 변경 시 컴포넌트를 새로 그리도록 함
                            title={`${selectedCategory.name} 카테고리 인기 동영상`}
                            categoryId={selectedCategory.id}
                            categoryName={selectedCategory.name}
                            timePeriod={'일간'}
                        />
                )}
            </div>
        </div>
    );
};

export default CategoryAnalysisPage;