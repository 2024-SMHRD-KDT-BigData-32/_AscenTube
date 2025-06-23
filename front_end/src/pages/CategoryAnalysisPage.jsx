import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageLayout from '../layouts/PageLayout';
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

const LOCAL_STORAGE_KEY = 'lastSelectedCategory'; // ✨ 로컬 스토리지 키 정의 ✨

const CategoryAnalysisPage = () => {
    const [categoryData, setCategoryData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchParams, setSearchParams] = useSearchParams();

    // ✨ 초기 selectedCategory를 로컬 스토리지 또는 URL 파라미터에서 가져오도록 수정 ✨
    const getInitialCategory = () => {
        const storedCategoryId = localStorage.getItem(LOCAL_STORAGE_KEY);
        const urlCategoryId = searchParams.get('categoryId');

        if (urlCategoryId) { // URL 파라미터가 최우선
            return CATEGORIES_TO_ANALYZE.find(cat => cat.id === urlCategoryId) || CATEGORIES_TO_ANALYZE[0];
        } else if (storedCategoryId) { // URL 파라미터가 없으면 로컬 스토리지
            return CATEGORIES_TO_ANALYZE.find(cat => cat.id === storedCategoryId) || CATEGORIES_TO_ANALYZE[0];
        }
        return CATEGORIES_TO_ANALYZE[0]; // 둘 다 없으면 '전체'
    };

    const [selectedCategory, setSelectedCategory] = useState(getInitialCategory);

    useEffect(() => {
        const fetchAllCategoryData = async () => {
            setIsLoading(true);
            const token = localStorage.getItem('access_token');
            const userId = localStorage.getItem('user_google_id');

            const promises = CATEGORIES_TO_ANALYZE.slice(1).map(cat =>
                fetchTotalViewsForCategory(cat.id, token, userId)
            );
            
            let viewResults = [];
            try {
                viewResults = await Promise.all(promises);
            } catch (error) {
                console.error("Failed to fetch category view data:", error);
                viewResults = Array(CATEGORIES_TO_ANALYZE.length - 1).fill(0);
            }

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

            // ✨ 데이터 로딩 후, 초기 선택된 카테고리가 유효한지 확인하고,
            //    URL 파라미터가 있다면 URL 파라미터를 우선시하여 설정
            const currentCategoryIdInUrl = searchParams.get('categoryId');
            if (currentCategoryIdInUrl) {
                const foundCategory = processedData.find(cat => cat.id === currentCategoryIdInUrl);
                if (foundCategory) {
                    setSelectedCategory(foundCategory);
                    localStorage.setItem(LOCAL_STORAGE_KEY, foundCategory.id); // 로컬 스토리지 업데이트
                }
            } else { // URL 파라미터가 없다면 로컬 스토리지에서 가져온 값으로 설정
                const storedCategoryId = localStorage.getItem(LOCAL_STORAGE_KEY);
                const foundCategory = processedData.find(cat => cat.id === storedCategoryId);
                if (foundCategory) {
                    setSelectedCategory(foundCategory);
                }
            }
        };

        fetchAllCategoryData();
    }, []);

    const handleCategorySelect = (category) => {
        setSelectedCategory(category);
        // ✨ 로컬 스토리지에 선택된 카테고리 ID 저장 ✨
        localStorage.setItem(LOCAL_STORAGE_KEY, category.id);

        // URL 쿼리 파라미터 업데이트 (선택 사항, URL로도 상태를 전달하고 싶다면 유지)
        if (category.id === '0') {
            searchParams.delete('categoryId');
        } else {
            searchParams.set('categoryId', category.id);
        }
        setSearchParams(searchParams);
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
                {selectedCategory && selectedCategory.id === '0' && (
                    <p style={{ textAlign: 'center', color: '#666' }}>
                        카테고리를 선택하시면 해당 카테고리의 인기 동영상을 볼 수 있습니다.
                    </p>
                )}
            </div>
        </PageLayout>
    );
};

export default CategoryAnalysisPage;