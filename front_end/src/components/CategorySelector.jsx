// src/components/CategorySelector.js
import React from 'react';
// import './CategorySelector.css'; // 페이지 CSS에서 관리하거나, 필요시 이 파일 생성

const CategorySelector = ({ categories, selectedCategoryId, onCategoryChange }) => {
  return (
    <div className="category-selector-container">
      <label htmlFor="category-select" className="category-selector-label">카테고리 선택:</label>
      <select
        id="category-select"
        className="category-selector-select"
        value={selectedCategoryId}
        onChange={(e) => onCategoryChange(e.target.value)}
      >
        <option value="">-- 전체 카테고리 --</option>
        {categories.map(category => (
          <option key={category.id} value={category.id}>
            {category.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CategorySelector;