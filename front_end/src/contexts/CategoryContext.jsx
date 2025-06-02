// src/contexts/CategoryContext.js
import React, { createContext, useState, useContext } from 'react';

// 1. Context 객체 생성 (초기값은 null 또는 필요에 따라 기본값 설정)
const CategoryContext = createContext(null);

// 2. Context Provider 컴포넌트 생성
export const CategoryProvider = ({ children }) => {
  // 선택된 카테고리 ID를 상태로 관리
  const [selectedCategoryId, setSelectedCategoryId] = useState(''); // 초기값은 빈 문자열

  // Provider는 value prop을 통해 현재 선택된 카테고리 ID와 이를 변경하는 함수를 전달
  return (
    <CategoryContext.Provider value={{ selectedCategoryId, setSelectedCategoryId }}>
      {children}
    </CategoryContext.Provider>
  );
};

// 3. Context를 더 쉽게 사용하기 위한 커스텀 훅 (선택 사항이지만 권장)
export const useCategory = () => {
  const context = useContext(CategoryContext);
  if (context === undefined || context === null) {
    // context가 undefined이면 Provider로 감싸지지 않았다는 의미
    throw new Error('useCategory must be used within a CategoryProvider');
  }
  return context;
};