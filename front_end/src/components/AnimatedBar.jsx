// src/components/AnimatedBar.js
import React, { useEffect, useState } from 'react';
import '../styles/components/AnimatedBar.css'; // CSS 파일 임포트

const AnimatedBar = ({ value, maxValue, label, unit = '' }) => {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (maxValue > 0) {
        setWidth((value / maxValue) * 100);
      } else {
        setWidth(0);
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [value, maxValue]);

  return (
    <div className="animated-bar-container">
      {label && <div className="animated-bar-label">{label}</div>}
      <div className="bar-wrapper">
        <div
          className="bar-fill"
          style={{ width: `${width}%` }}
        >
          <span className="bar-value">{value.toLocaleString()}{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default AnimatedBar;