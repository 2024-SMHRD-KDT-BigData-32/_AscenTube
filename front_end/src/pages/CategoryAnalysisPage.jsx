import React, { useState, useEffect } from 'react';
import PageLayout from '../layouts/PageLayout'; // Import PageLayout
import '../styles/pages/Dashboard.css';
import CategorySelector from '../components/CategorySelector';
import VideoAnalytics from '../components/VideoAnalytics';
import { fetchTotalViewsForCategory } from '../api/youtubeApi';

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
    const [categoryData, setCategoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [selectedCategory, setSelectedCategory] = useState(CATEGORIES_TO_ANALYZE[0]);

    useEffect(() => {
        const fetchAllCategoryData = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('access_token');
            const userId = localStorage.getItem('user_google_id');

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

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
    };

    return (
        <PageLayout title="카테고리별 트렌드 분석">
            <div style={{ padding: '20px' }}>
                <CategorySelector
                    items={categoryData}
                    isLoading={isLoading}
                    selectedItem={selectedCategory}
                    onSelect={handleCategorySelect}
                />
                <hr style={{ margin: '30px 0', border: '1px solid #eee' }} />
                {selectedCategory && selectedCategory.id !== '0' && (
                    <VideoAnalytics
                        key={selectedCategory.id}
                        title={`${selectedCategory.name} 카테고리 인기 동영상`}
                        categoryId={selectedCategory.id}
                        categoryName={selectedCategory.name}
                        timePeriod={'일간'}
                    />
                )}
            </div>
        </PageLayout>
    );
};

export default CategoryAnalysisPage;